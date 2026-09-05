import { and, asc, count, desc, eq, ilike, inArray, type SQL } from "drizzle-orm"
import { Elysia } from "elysia"
import { z } from "zod"

import type { IdpDatabase } from "../../database/client.js"
import { invitation, user } from "../../database/schema.js"
import type { IdpRole, InvitationStatus } from "../../identity/access-policy.js"
import { normalizeEmail } from "../../identity/access-policy.js"
import type { IdpAuth, InvitationAcceptedObserver } from "../../identity/auth.js"
import {
  acceptInvitationForUser,
  createInvitation,
  digestInvitationToken,
  PendingInvitationAlreadyExistsError,
  resendInvitation,
  resolveInvitationToken,
  revokeInvitation,
} from "../../identity/invitations.js"
import type { AuthEmailSender } from "../../identity/transactional-email.js"
import { adminErrorBody, resolveAdminActor } from "../admin.js"
import { buildPageMeta, getRepeatedQueryValues, parsePaginationQuery } from "../pagination.js"

const INVITATION_EXPIRATION_MS = 24 * 60 * 60 * 1000
const RATE_LIMIT_WINDOW_MS = 60_000
const RESOLVE_GLOBAL_RATE_LIMIT = 20

const createInvitationSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "member"]).default("member"),
})

const invitationRoleSchema = z.enum(["admin", "member"])
const invitationStatusSchema = z.enum(["pending", "accepted", "expired", "revoked", "superseded"])
const invitationSortColumns = {
  createdAt: invitation.createdAt,
  email: invitation.email,
  expiresAt: invitation.expiresAt,
  role: invitation.role,
  status: invitation.status,
  updatedAt: invitation.updatedAt,
} as const

export function createInvitationRoutes(
  auth: IdpAuth,
  db: IdpDatabase,
  authEmailSender?: Pick<AuthEmailSender, "sendInvitation">,
  onInvitationAccepted?: InvitationAcceptedObserver,
) {
  const resolveGlobalLimiter = createBoundedRateLimiter(
    RESOLVE_GLOBAL_RATE_LIMIT,
    RATE_LIMIT_WINDOW_MS,
    1,
  )
  const resolveTokenLimiter = createBoundedRateLimiter(10, RATE_LIMIT_WINDOW_MS)
  const resendLimiter = createBoundedRateLimiter(5, RATE_LIMIT_WINDOW_MS)

  return new Elysia({ name: "invitation-routes" })
    .post("/invitations/accept-existing", async ({ request, status }) => {
      const session = await auth.api.getSession({ headers: request.headers })
      if (!session?.user) return status(401, { code: "unauthenticated" as const })
      const body = await request.json().catch(() => null)
      const token =
        body && typeof body === "object" && "token" in body && typeof body.token === "string"
          ? body.token
          : ""
      const resolution = await resolveInvitationToken(db, token)
      if (
        resolution.state !== "valid" ||
        !resolution.invitation ||
        normalizeEmail(resolution.invitation.email) !== normalizeEmail(session.user.email)
      )
        return status(400, { code: "invalid_invitation" as const })

      const accepted = await acceptInvitationForUser(db, session.user.email, session.user.id)
      if (!accepted || accepted.id !== resolution.invitation.id)
        return status(409, { code: "invitation_changed" as const })
      await onInvitationAccepted?.(accepted.id, session.user.id)
      return { status: "accepted" as const }
    })
    .post("/invitations/resolve", async ({ request, set, status }) => {
      set.headers["Cache-Control"] = "no-store"
      set.headers["Referrer-Policy"] = "no-referrer"

      const body = await request.json().catch(() => null)
      const token =
        body && typeof body === "object" && "token" in body && typeof body.token === "string"
          ? body.token
          : ""
      const rateLimitKey = digestInvitationToken(token) ?? "malformed"
      if (!resolveGlobalLimiter.accept("global") || !resolveTokenLimiter.accept(rateLimitKey)) {
        return status(429, { state: "invalid" as const })
      }

      const resolution = await resolveInvitationToken(db, token)
      if (resolution.state !== "valid" || !resolution.invitation) {
        return { state: resolution.state }
      }

      return {
        state: "valid" as const,
        role: resolution.invitation.role,
        expiresAt: resolution.invitation.expiresAt.toISOString(),
        hasAccount: Boolean(
          (
            await db
              .select({ id: user.id })
              .from(user)
              .where(eq(user.email, resolution.invitation.email))
              .limit(1)
          )[0],
        ),
      }
    })
    .get("/invitations", async ({ request, status }) => {
      const actorResult = await resolveAdminActor(auth, db, request)
      if (actorResult.error) {
        return status(actorResult.error.status, { error: adminErrorBody(actorResult.error) })
      }

      const query = parsePaginationQuery(request)
      const roles = invitationRoleSchema.array().safeParse(getRepeatedQueryValues(request, "role"))
      const statuses = invitationStatusSchema
        .array()
        .safeParse(getRepeatedQueryValues(request, "status"))
      if (!roles.success || !statuses.success) {
        return status(400, {
          error: { code: "invalid_request", message: "Invalid invitation filters." },
        })
      }

      const where = buildInvitationWhere({
        q: query.q,
        roles: roles.data,
        statuses: statuses.data,
      })
      const sortColumn =
        invitationSortColumns[
          (query.sortBy ?? "createdAt") as keyof typeof invitationSortColumns
        ] ?? invitation.createdAt
      const sort = query.sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn)
      const offset = (query.page - 1) * query.pageSize

      const [totalRow] = await db.select({ value: count() }).from(invitation).where(where).limit(1)
      const rows = await db
        .select()
        .from(invitation)
        .where(where)
        .orderBy(sort, desc(invitation.id))
        .limit(query.pageSize)
        .offset(offset)

      return {
        invitations: rows.map(mapInvitationResponse),
        page: buildPageMeta(query.page, query.pageSize, totalRow?.value ?? 0),
      }
    })
    .post("/invitations", async ({ request, status }) => {
      const actorResult = await resolveAdminActor(auth, db, request)
      if (actorResult.error) {
        return status(actorResult.error.status, { error: adminErrorBody(actorResult.error) })
      }

      const body = await request.json().catch(() => null)
      const parsed = createInvitationSchema.safeParse(body)
      if (!parsed.success) {
        return status(400, {
          error: { code: "invalid_request", message: "Invalid invitation payload." },
        })
      }

      const issued = await createInvitation(db, {
        email: parsed.data.email,
        expiresAt: new Date(Date.now() + INVITATION_EXPIRATION_MS),
        invitedByUserId: actorResult.actor.id,
        role: parsed.data.role,
      }).catch((error: unknown) => {
        if (error instanceof PendingInvitationAlreadyExistsError) {
          return null
        }

        throw error
      })

      if (!issued) {
        return status(409, {
          error: {
            code: "pending_invitation_exists",
            message: "A pending invitation already exists for this email.",
          },
        })
      }

      const emailDelivery =
        (await authEmailSender?.sendInvitation({
          email: issued.invitation.email,
          expiresAt: issued.invitation.expiresAt,
          role: issued.invitation.role,
          token: issued.token,
        })) ?? "skipped"

      return status(201, {
        emailDelivery,
        invitation: mapInvitationResponse(issued.invitation),
      })
    })
    .post("/invitations/:invitationId/resend", async ({ params, request, status }) => {
      const actorResult = await resolveAdminActor(auth, db, request)
      if (actorResult.error) {
        return status(actorResult.error.status, { error: adminErrorBody(actorResult.error) })
      }
      if (!resendLimiter.accept(params.invitationId)) {
        return status(429, {
          error: { code: "rate_limited", message: "Invitation resend is temporarily limited." },
        })
      }

      const issued = await resendInvitation(
        db,
        params.invitationId,
        new Date(Date.now() + INVITATION_EXPIRATION_MS),
      )
      if (!issued) {
        return status(404, {
          error: { code: "not_found", message: "Pending invitation not found." },
        })
      }

      const emailDelivery =
        (await authEmailSender?.sendInvitation({
          email: issued.invitation.email,
          expiresAt: issued.invitation.expiresAt,
          role: issued.invitation.role,
          token: issued.token,
        })) ?? "skipped"

      return {
        emailDelivery,
        invitation: mapInvitationResponse(issued.invitation),
      }
    })
    .post("/invitations/:invitationId/revoke", async ({ params, request, status }) => {
      const actorResult = await resolveAdminActor(auth, db, request)
      if (actorResult.error) {
        return status(actorResult.error.status, { error: adminErrorBody(actorResult.error) })
      }

      const revoked = await revokeInvitation(db, params.invitationId)
      if (!revoked) {
        return status(404, {
          error: { code: "not_found", message: "Pending invitation not found." },
        })
      }

      return { invitation: mapInvitationResponse(revoked) }
    })
}

function createBoundedRateLimiter(max: number, windowMs: number, capacity = 1_000) {
  const entries = new Map<string, { count: number; resetAt: number }>()

  return {
    accept(key: string, now = Date.now()) {
      const existing = entries.get(key)
      if (!existing || existing.resetAt <= now) {
        if (entries.size >= capacity) entries.delete(entries.keys().next().value ?? "")
        entries.set(key, { count: 1, resetAt: now + windowMs })
        return true
      }
      if (existing.count >= max) return false
      existing.count += 1
      return true
    },
  }
}

function buildInvitationWhere({
  q,
  roles,
  statuses,
}: {
  q?: string
  roles: IdpRole[]
  statuses: InvitationStatus[]
}) {
  const filters: SQL[] = []

  if (q) {
    filters.push(ilike(invitation.email, `%${q}%`))
  }

  if (roles.length > 0) {
    filters.push(inArray(invitation.role, roles))
  }

  if (statuses.length > 0) {
    filters.push(inArray(invitation.status, statuses))
  }

  return filters.length > 0 ? and(...filters) : undefined
}

function mapInvitationResponse(row: typeof invitation.$inferSelect) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    invitedByUserId: row.invitedByUserId,
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    acceptedByUserId: row.acceptedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
