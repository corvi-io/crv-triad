import { randomBytes } from "node:crypto"
import { and, count, desc, eq, gt, ilike, isNull, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { Elysia, t } from "elysia"
import {
  accessAudit,
  plan,
  planEntitlement,
  planVersion,
  tenantSubscription,
} from "../../access/database/schema.js"
import { capabilities } from "../../access/domain/access-decision.js"
import { client } from "../../clients/database/schema.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import {
  invitation,
  member,
  organization,
  organizationInvitation,
  user,
} from "../../idp/database/schema.js"
import type { IdpAuth } from "../../idp/identity/auth.js"
import {
  createInvitationSecret,
  findPendingInvitationByEmail,
  lockPendingInvitationEmail,
} from "../../idp/identity/invitations.js"
import type { AuthEmailSender } from "../../idp/identity/transactional-email.js"
import { createId } from "../../shared/infra/ids.js"
import { platformOperator, supportAudit, supportContext } from "../database/schema.js"
import { createBarbershopSlug } from "../domain/barbershop-slug.js"
import { digestSupportCredential } from "../domain/support-credential.js"

const backstageOrganization = alias(organization, "backstage_organization")
const backstageOrganizationId = sql.raw('"backstage_organization"."id"')

const OWNER_INVITATION_EXPIRATION_MS = 24 * 60 * 60 * 1_000

export function createBackstageRoutes(
  auth: IdpAuth,
  db: IdpDatabase,
  authEmailSender?: Pick<AuthEmailSender, "sendInvitation">,
) {
  async function operator(
    headers: Headers,
    roles?: Array<"system_owner" | "operations" | "support" | "billing">,
  ) {
    const session = await auth.api.getSession({ headers })
    if (!session) throw new BackstageError("unauthenticated")
    const [record] = await db
      .select()
      .from(platformOperator)
      .where(
        and(eq(platformOperator.userId, session.user.id), eq(platformOperator.status, "active")),
      )
      .limit(1)
    if (!record) throw new BackstageError("backstage_forbidden")
    if (roles && !roles.includes(record.role)) throw new BackstageError("backstage_forbidden")
    return record
  }

  async function activeSupport(headers: Headers, contextId: string, operatorId: string) {
    const credential = headers.get("authorization")?.match(/^Support ([A-Za-z0-9_-]+)$/)?.[1]
    if (!credential) throw new BackstageError("support_context_required")
    const [support] = await db
      .select()
      .from(supportContext)
      .where(
        and(
          eq(supportContext.id, contextId),
          eq(supportContext.operatorId, operatorId),
          eq(supportContext.credentialDigest, digestSupportCredential(credential)),
          gt(supportContext.expiresAt, new Date()),
          isNull(supportContext.revokedAt),
        ),
      )
      .limit(1)
    if (!support) throw new BackstageError("support_context_invalid")
    return support
  }

  return new Elysia({ name: "backstage-routes", prefix: "/api/backstage" })
    .onError(({ code, error, request, set }) => {
      const requestId = request.headers.get("x-request-id") ?? "unavailable"
      if (!(error instanceof BackstageError)) {
        set.status = code === "VALIDATION" ? 400 : 500
        return { code: code === "VALIDATION" ? "invalid_request" : "internal_error", requestId }
      }
      set.status =
        error.code === "unauthenticated"
          ? 401
          : error.code === "not_found"
            ? 404
            : error.code === "conflict" ||
                error.code === "slug_conflict" ||
                error.code === "pending_invitation_exists"
              ? 409
              : error.code === "owner_not_found" || error.code === "owner_disabled"
                ? 422
                : 403
      return { code: error.code, requestId }
    })
    .get("/me", async ({ request }) => {
      const actor = await operator(request.headers)
      return { id: actor.id, role: actor.role, status: actor.status }
    })
    .get(
      "/inventory",
      async ({ query, request }) => {
        await operator(request.headers)
        const page = Math.max(1, Number(query.page) || 1)
        const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
        const search = query.search?.trim().slice(0, 100)
        const filter = search
          ? ilike(
              backstageOrganization.name,
              `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
            )
          : undefined
        const [total, rows] = await Promise.all([
          db.select({ value: count() }).from(backstageOrganization).where(filter),
          db
            .select({
              id: backstageOrganization.id,
              name: backstageOrganization.name,
              status: backstageOrganization.status,
              createdAt: backstageOrganization.createdAt,
              memberCount: sql<number>`(select count(*)::int from idp_members inventory_member where inventory_member.organization_id = ${backstageOrganizationId} and inventory_member.status = 'active')`,
              clientCount: sql<number>`(select count(*)::int from clients inventory_client where inventory_client.organization_id = ${backstageOrganizationId} and inventory_client.status = 'active')`,
              subscriptionState: sql<
                string | null
              >`(select subscription.state from access_tenant_subscriptions subscription where subscription.organization_id = ${backstageOrganizationId} and subscription.is_current = true limit 1)`,
              planKey: sql<
                string | null
              >`(select access_plan.key from access_tenant_subscriptions subscription join access_plan_versions access_version on access_version.id = subscription.plan_version_id join access_plans access_plan on access_plan.id = access_version.plan_id where subscription.organization_id = ${backstageOrganizationId} and subscription.is_current = true limit 1)`,
              activeClientLimit: sql<
                number | null
              >`(select entitlement.quota_limit from access_tenant_subscriptions subscription join access_plan_entitlements entitlement on entitlement.plan_version_id = subscription.plan_version_id where subscription.organization_id = ${backstageOrganizationId} and subscription.is_current = true and entitlement.quota_key = 'clients.active.count' limit 1)`,
            })
            .from(backstageOrganization)
            .where(filter)
            .orderBy(desc(backstageOrganization.createdAt), desc(backstageOrganization.id))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        ])
        return { items: rows, page, pageSize, totalCount: total[0]?.value ?? 0 }
      },
      {
        query: t.Object({
          page: t.Optional(t.String()),
          pageSize: t.Optional(t.String()),
          search: t.Optional(t.String({ maxLength: 100 })),
        }),
      },
    )
    .get("/tenants/:tenantId", async ({ params, request }) => {
      await operator(request.headers)
      const [tenant] = await db
        .select({
          id: backstageOrganization.id,
          name: backstageOrganization.name,
          slug: backstageOrganization.slug,
          status: backstageOrganization.status,
          version: backstageOrganization.version,
          createdAt: backstageOrganization.createdAt,
          updatedAt: backstageOrganization.updatedAt,
          memberCount: sql<number>`(select count(*)::int from idp_members tenant_member where tenant_member.organization_id = ${backstageOrganizationId} and tenant_member.status = 'active')`,
          activeClientCount: sql<number>`(select count(*)::int from clients tenant_client where tenant_client.organization_id = ${backstageOrganizationId} and tenant_client.status = 'active')`,
          archivedClientCount: sql<number>`(select count(*)::int from clients tenant_client where tenant_client.organization_id = ${backstageOrganizationId} and tenant_client.status = 'archived')`,
          ownerName: sql<
            string | null
          >`(select tenant_user.name from idp_members owner_member join idp_users tenant_user on tenant_user.id = owner_member.user_id where owner_member.organization_id = ${backstageOrganizationId} and owner_member.role = 'owner' and owner_member.status = 'active' limit 1)`,
          ownerEmail: sql<
            string | null
          >`(select tenant_user.email from idp_members owner_member join idp_users tenant_user on tenant_user.id = owner_member.user_id where owner_member.organization_id = ${backstageOrganizationId} and owner_member.role = 'owner' and owner_member.status = 'active' limit 1)`,
          subscriptionState: sql<
            string | null
          >`(select subscription.state from access_tenant_subscriptions subscription where subscription.organization_id = ${backstageOrganizationId} and subscription.is_current = true limit 1)`,
          planKey: sql<
            string | null
          >`(select access_plan.key from access_tenant_subscriptions subscription join access_plan_versions access_version on access_version.id = subscription.plan_version_id join access_plans access_plan on access_plan.id = access_version.plan_id where subscription.organization_id = ${backstageOrganizationId} and subscription.is_current = true limit 1)`,
          activeClientLimit: sql<
            number | null
          >`(select entitlement.quota_limit from access_tenant_subscriptions subscription join access_plan_entitlements entitlement on entitlement.plan_version_id = subscription.plan_version_id where subscription.organization_id = ${backstageOrganizationId} and subscription.is_current = true and entitlement.quota_key = 'clients.active.count' limit 1)`,
        })
        .from(backstageOrganization)
        .where(eq(backstageOrganization.id, params.tenantId))
        .limit(1)
      if (!tenant) throw new BackstageError("not_found")
      return tenant
    })
    .post(
      "/tenants",
      async ({ body, request, status }) => {
        await operator(request.headers, ["system_owner", "operations"])
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) throw new BackstageError("unauthenticated")
        const normalizedEmail = body.ownerEmail.trim().toLowerCase()
        const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID()
        let slug = createBarbershopSlug(body.name)
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const [existing] = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, slug))
            .limit(1)
          if (!existing) break
          slug = createBarbershopSlug(body.name)
          if (attempt === 4) throw new BackstageError("slug_conflict")
        }
        const created = await db.transaction(async (tx) => {
          const [owner] = await tx
            .select({ id: user.id, status: user.status })
            .from(user)
            .where(eq(user.email, normalizedEmail))
            .limit(1)
          if (owner?.status === "disabled") throw new BackstageError("owner_disabled")
          const tenantId = createId()
          await tx.insert(organization).values({ id: tenantId, name: body.name.trim(), slug })
          let invitationDelivery: null | {
            email: string
            expiresAt: Date
            role: "member"
            token: string
          } = null
          if (owner?.status === "active") {
            await tx.insert(member).values({
              id: createId(),
              organizationId: tenantId,
              role: "owner",
              status: "active",
              userId: owner.id,
            })
          } else {
            const idpTx = tx as unknown as IdpDatabase
            await lockPendingInvitationEmail(idpTx, normalizedEmail)
            const pendingInvitation = await findPendingInvitationByEmail(idpTx, normalizedEmail)
            if (pendingInvitation) throw new BackstageError("pending_invitation_exists")
            const expiresAt = new Date(Date.now() + OWNER_INVITATION_EXPIRATION_MS)
            const secret = createInvitationSecret()
            await tx.insert(invitation).values({
              email: normalizedEmail,
              expiresAt,
              id: createId(),
              invitedByUserId: session.user.id,
              role: "member",
              status: "pending",
              tokenDigest: secret.digest,
              tokenIssuedAt: new Date(),
            })
            await tx.insert(organizationInvitation).values({
              email: normalizedEmail,
              expiresAt,
              id: createId(),
              inviterId: session.user.id,
              organizationId: tenantId,
              role: "owner",
              status: "pending",
            })
            invitationDelivery = {
              email: normalizedEmail,
              expiresAt,
              role: "member",
              token: secret.token,
            }
          }
          let [storedPlan] = await tx.select().from(plan).where(eq(plan.key, "manual")).limit(1)
          if (!storedPlan)
            [storedPlan] = await tx
              .insert(plan)
              .values({ id: createId(), key: "manual" })
              .returning()
          if (!storedPlan) throw new BackstageError("provisioning_failed")
          let [version] = await tx
            .select()
            .from(planVersion)
            .where(and(eq(planVersion.planId, storedPlan.id), eq(planVersion.version, 1)))
            .limit(1)
          if (!version)
            [version] = await tx
              .insert(planVersion)
              .values({ id: createId(), planId: storedPlan.id, version: 1 })
              .returning()
          if (!version) throw new BackstageError("provisioning_failed")
          const entitlementRows = await tx
            .select({ id: planEntitlement.id })
            .from(planEntitlement)
            .where(eq(planEntitlement.planVersionId, version.id))
            .limit(1)
          if (entitlementRows.length === 0) {
            await tx.insert(planEntitlement).values(
              capabilities.map((capability) => ({
                capabilityKey: capability,
                enabled: true,
                id: createId(),
                planVersionId: version.id,
              })),
            )
          }
          await tx.insert(tenantSubscription).values({
            id: createId(),
            organizationId: tenantId,
            planVersionId: version.id,
            startsAt: new Date(),
            state: "active",
          })
          await tx.insert(accessAudit).values({
            action: "tenant.created",
            actorUserId: session.user.id,
            id: createId(),
            organizationId: tenantId,
            outcome: "allowed",
            requestId,
            targetId: tenantId,
          })
          return {
            id: tenantId,
            invitationDelivery,
            name: body.name.trim(),
            ownerAccess: owner?.status === "active" ? ("active" as const) : ("invited" as const),
            slug,
          }
        })
        const emailDelivery = created.invitationDelivery
          ? ((await authEmailSender?.sendInvitation(created.invitationDelivery)) ?? "skipped")
          : null
        return status(201, {
          emailDelivery,
          id: created.id,
          name: created.name,
          ownerAccess: created.ownerAccess,
          slug: created.slug,
        })
      },
      {
        body: t.Object({
          name: t.String({ minLength: 2, maxLength: 160 }),
          ownerEmail: t.String({ format: "email", maxLength: 320 }),
        }),
      },
    )
    .patch(
      "/tenants/:tenantId",
      async ({ body, params, request }) => {
        await operator(request.headers, ["system_owner", "operations"])
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) throw new BackstageError("unauthenticated")
        const [updated] = await db.transaction(async (tx) => {
          const rows = await tx
            .update(organization)
            .set({
              ...(body.name ? { name: body.name.trim() } : {}),
              status: body.status,
              updatedAt: new Date(),
              version: body.version + 1,
            })
            .where(
              and(eq(organization.id, params.tenantId), eq(organization.version, body.version)),
            )
            .returning()
          const record = rows[0]
          if (!record) throw new BackstageError("conflict")
          await tx.insert(accessAudit).values({
            action: `tenant.${body.status === "active" ? "reactivated" : "suspended"}`,
            actorUserId: session.user.id,
            id: createId(),
            organizationId: record.id,
            outcome: "allowed",
            requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
            reason: body.reason.trim(),
            targetId: record.id,
          })
          return rows
        })
        return updated
      },
      {
        body: t.Object({
          name: t.Optional(t.String({ minLength: 2, maxLength: 160 })),
          reason: t.String({ minLength: 10, maxLength: 500 }),
          status: t.Union([t.Literal("active"), t.Literal("disabled")]),
          version: t.Integer({ minimum: 1 }),
        }),
      },
    )
    .post(
      "/support-contexts",
      async ({ body, request, status }) => {
        const actor = await operator(request.headers, ["system_owner", "operations", "support"])
        const [tenant] = await db
          .select({ id: organization.id })
          .from(organization)
          .where(and(eq(organization.id, body.organizationId), eq(organization.status, "active")))
          .limit(1)
        if (!tenant) throw new BackstageError("not_found")
        const credential = randomBytes(32).toString("base64url")
        const now = new Date()
        const expiresAt = new Date(now.getTime() + body.durationMinutes * 60_000)
        const id = createId()
        await db.transaction(async (tx) => {
          await tx.insert(supportContext).values({
            credentialDigest: digestSupportCredential(credential),
            expiresAt,
            id,
            operatorId: actor.id,
            organizationId: tenant.id,
            reason: body.reason,
          })
          await tx.insert(supportAudit).values({
            action: "support_context.created",
            id: createId(),
            operatorId: actor.id,
            organizationId: tenant.id,
            outcome: "allowed",
            requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
            severity: "high",
            supportContextId: id,
          })
        })
        return status(201, {
          credential,
          expiresAt: expiresAt.toISOString(),
          id,
          organizationId: tenant.id,
        })
      },
      {
        body: t.Object({
          durationMinutes: t.Integer({ maximum: 60, minimum: 1 }),
          organizationId: t.String({ maxLength: 128 }),
          reason: t.String({ maxLength: 500, minLength: 10 }),
        }),
      },
    )
    .get("/support-contexts/:contextId/tenant-summary", async ({ params, request }) => {
      const actor = await operator(request.headers)
      const support = await activeSupport(request.headers, params.contextId, actor.id)
      const [[tenant], [members], [clients]] = await Promise.all([
        db
          .select({ id: organization.id, name: organization.name, status: organization.status })
          .from(organization)
          .where(eq(organization.id, support.organizationId))
          .limit(1),
        db
          .select({ value: count() })
          .from(member)
          .where(
            and(eq(member.organizationId, support.organizationId), eq(member.status, "active")),
          ),
        db
          .select({ value: count() })
          .from(client)
          .where(
            and(eq(client.organizationId, support.organizationId), eq(client.status, "active")),
          ),
      ])
      if (!tenant) throw new BackstageError("not_found")
      await db.insert(supportAudit).values({
        action: "tenant_summary.viewed",
        id: createId(),
        operatorId: actor.id,
        organizationId: support.organizationId,
        outcome: "allowed",
        requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
        severity: "normal",
        supportContextId: support.id,
        targetId: tenant.id,
      })
      return {
        activeClientCount: clients?.value ?? 0,
        activeMemberCount: members?.value ?? 0,
        tenant,
      }
    })
    .get(
      "/support-contexts/:contextId/clients",
      async ({ params, query, request }) => {
        const actor = await operator(request.headers)
        const support = await activeSupport(request.headers, params.contextId, actor.id)
        const page = Math.max(1, Number(query.page) || 1)
        const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
        const [total, items] = await Promise.all([
          db
            .select({ value: count() })
            .from(client)
            .where(eq(client.organizationId, support.organizationId)),
          db
            .select({ id: client.id, name: client.name, status: client.status })
            .from(client)
            .where(eq(client.organizationId, support.organizationId))
            .orderBy(desc(client.createdAt), desc(client.id))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        ])
        await db.insert(supportAudit).values({
          action: "clients.listed",
          id: createId(),
          operatorId: actor.id,
          organizationId: support.organizationId,
          outcome: "allowed",
          requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
          severity: "normal",
          supportContextId: support.id,
        })
        return { items, page, pageSize, totalCount: total[0]?.value ?? 0 }
      },
      { query: t.Object({ page: t.Optional(t.String()), pageSize: t.Optional(t.String()) }) },
    )
    .post("/support-contexts/:contextId/revoke", async ({ params, request }) => {
      const actor = await operator(request.headers)
      await activeSupport(request.headers, params.contextId, actor.id)
      const [revoked] = await db
        .update(supportContext)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(supportContext.id, params.contextId),
            eq(supportContext.operatorId, actor.id),
            isNull(supportContext.revokedAt),
          ),
        )
        .returning()
      if (!revoked) throw new BackstageError("not_found")
      await db.insert(supportAudit).values({
        action: "support_context.revoked",
        id: createId(),
        operatorId: actor.id,
        organizationId: revoked.organizationId,
        outcome: "allowed",
        requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
        severity: "high",
        supportContextId: revoked.id,
      })
      return { id: revoked.id, status: "revoked" as const }
    })
    .get("/operators", async ({ request }) => {
      await operator(request.headers)
      return db
        .select({
          createdAt: platformOperator.createdAt,
          id: platformOperator.id,
          name: user.name,
          role: platformOperator.role,
          status: platformOperator.status,
        })
        .from(platformOperator)
        .innerJoin(user, eq(user.id, platformOperator.userId))
        .orderBy(desc(platformOperator.createdAt))
        .limit(100)
    })
}

class BackstageError extends Error {
  constructor(readonly code: string) {
    super("Backstage access denied.")
  }
}
