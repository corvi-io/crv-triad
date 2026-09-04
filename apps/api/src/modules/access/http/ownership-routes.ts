import { and, eq, sql } from "drizzle-orm"
import { Elysia, t } from "elysia"

import type { IdpDatabase } from "../../idp/database/client.js"
import { member } from "../../idp/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import { accessAudit } from "../database/schema.js"

export function createOwnershipRoutes(db: IdpDatabase, resolveContext: TenantContextResolver) {
  return new Elysia({ name: "ownership-routes", prefix: "/api/access/ownership" }).post(
    "/transfer",
    async ({ body, request, status }) => {
      const resolved = await resolveContext(request.headers)
      if (!resolved.allowed)
        return status(resolved.reason === "unauthenticated" ? 401 : 403, { code: resolved.reason })
      const actor = resolved.context
      if (actor.role !== "owner") return status(403, { code: "capability_forbidden" })
      if (!actor.authenticatedAt || Date.now() - actor.authenticatedAt.getTime() >= 5 * 60 * 1_000)
        return status(403, { code: "recent_authentication_required" })

      const transferred = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${actor.organizationId}, 1))`,
        )
        const [target] = await tx
          .select({ id: member.id })
          .from(member)
          .where(
            and(
              eq(member.id, body.targetMembershipId),
              eq(member.organizationId, actor.organizationId),
              eq(member.status, "active"),
              eq(member.role, "admin"),
            ),
          )
          .limit(1)
        if (!target || target.id === actor.membershipId) return false
        await tx
          .update(member)
          .set({ role: "admin" })
          .where(
            and(
              eq(member.id, actor.membershipId),
              eq(member.organizationId, actor.organizationId),
              eq(member.role, "owner"),
              eq(member.status, "active"),
            ),
          )
        const [promoted] = await tx
          .update(member)
          .set({ role: "owner" })
          .where(
            and(
              eq(member.id, target.id),
              eq(member.organizationId, actor.organizationId),
              eq(member.status, "active"),
            ),
          )
          .returning({ id: member.id })
        if (!promoted) throw new Error("Ownership target disappeared.")
        await tx.insert(accessAudit).values({
          action: "ownership.transferred",
          actorUserId: actor.actorUserId,
          id: createId(),
          organizationId: actor.organizationId,
          outcome: "allowed",
          requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
          targetId: promoted.id,
        })
        return true
      })
      if (!transferred) return status(404, { code: "not_found" })
      return { status: "transferred" as const }
    },
    {
      body: t.Object({
        confirmed: t.Literal(true),
        targetMembershipId: t.String({ maxLength: 128 }),
      }),
    },
  )
}
