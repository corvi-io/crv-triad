import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm"
import { Elysia } from "elysia"
import { z } from "zod"

import type { IdpDatabase } from "../../database/client.js"
import { session, user } from "../../database/schema.js"
import type { IdpRole, IdpUserStatus } from "../../identity/access-policy.js"
import type { IdpAuth } from "../../identity/auth.js"
import { adminErrorBody, resolveAdminActor } from "../admin.js"
import { buildPageMeta, getRepeatedQueryValues, parsePaginationQuery } from "../pagination.js"

const userRoleSchema = z.enum(["admin", "member"])
const userStatusSchema = z.enum(["active", "disabled"])
const updateUserSchema = z
  .object({
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
  })
  .refine((value) => value.role || value.status, {
    message: "At least one editable field is required.",
  })

const userSortColumns = {
  createdAt: user.createdAt,
  email: user.email,
  name: user.name,
  role: user.role,
  status: user.status,
  updatedAt: user.updatedAt,
} as const

export function createUserRoutes(auth: IdpAuth, db: IdpDatabase) {
  return new Elysia({ name: "user-routes" })
    .get("/users", async ({ request, status }) => {
      const actorResult = await resolveAdminActor(auth, db, request)
      if (actorResult.error) {
        return status(actorResult.error.status, { error: adminErrorBody(actorResult.error) })
      }

      const query = parsePaginationQuery(request)
      const roles = userRoleSchema.array().safeParse(getRepeatedQueryValues(request, "role"))
      const statuses = userStatusSchema.array().safeParse(getRepeatedQueryValues(request, "status"))
      if (!roles.success || !statuses.success) {
        return status(400, {
          error: { code: "invalid_request", message: "Invalid user filters." },
        })
      }

      const where = buildUserWhere({
        q: query.q,
        roles: roles.data,
        statuses: statuses.data,
      })
      const sortColumn =
        userSortColumns[(query.sortBy ?? "createdAt") as keyof typeof userSortColumns] ??
        user.createdAt
      const sort = query.sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn)
      const offset = (query.page - 1) * query.pageSize

      const [totalRow] = await db.select({ value: count() }).from(user).where(where).limit(1)
      const rows = await db
        .select()
        .from(user)
        .where(where)
        .orderBy(sort, desc(user.id))
        .limit(query.pageSize)
        .offset(offset)

      return {
        users: rows.map(mapUserResponse),
        page: buildPageMeta(query.page, query.pageSize, totalRow?.value ?? 0),
      }
    })
    .patch("/users/:userId", async ({ params, request, status }) => {
      const actorResult = await resolveAdminActor(auth, db, request)
      if (actorResult.error) {
        return status(actorResult.error.status, { error: adminErrorBody(actorResult.error) })
      }

      const body = await request.json().catch(() => null)
      const parsed = updateUserSchema.safeParse(body)
      if (!parsed.success) {
        return status(400, {
          error: { code: "invalid_request", message: "Invalid user payload." },
        })
      }

      if (
        params.userId === actorResult.actor.id &&
        (parsed.data.role === "member" || parsed.data.status === "disabled")
      ) {
        return status(400, {
          error: {
            code: "self_admin_change_not_allowed",
            message: "Admins cannot remove their own access.",
          },
        })
      }

      const updated = await db.transaction(async (transaction) => {
        const [updatedUser] = await transaction
          .update(user)
          .set({ ...parsed.data, updatedAt: new Date() })
          .where(eq(user.id, params.userId))
          .returning()

        if (updatedUser && parsed.data.status === "disabled") {
          await transaction.delete(session).where(eq(session.userId, params.userId))
        }

        return updatedUser
      })

      if (!updated) {
        return status(404, { error: { code: "not_found", message: "User not found." } })
      }

      return { user: mapUserResponse(updated) }
    })
}

function buildUserWhere({
  q,
  roles,
  statuses,
}: {
  q?: string
  roles: IdpRole[]
  statuses: IdpUserStatus[]
}) {
  const filters: SQL[] = []

  if (q) {
    const pattern = `%${q}%`
    filters.push(or(ilike(user.name, pattern), ilike(user.email, pattern)) as SQL)
  }

  if (roles.length > 0) {
    filters.push(inArray(user.role, roles))
  }

  if (statuses.length > 0) {
    filters.push(inArray(user.status, statuses))
  }

  return filters.length > 0 ? and(...filters) : undefined
}

function mapUserResponse(row: typeof user.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
