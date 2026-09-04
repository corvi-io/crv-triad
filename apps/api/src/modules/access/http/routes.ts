import { and, desc, eq } from "drizzle-orm"
import { Elysia, t } from "elysia"

import type { IdpDatabase } from "../../idp/database/client.js"
import { member } from "../../idp/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import type { TenantContextResolver } from "../../tenancy/application/create-tenant-context-resolver.js"
import type { TenantActionAuthorizer } from "../application/authorize-tenant-action.js"
import { accessRequest, planEntitlement, tenantSubscription } from "../database/schema.js"
import { capabilities, decideAccess } from "../domain/access-decision.js"

export function createAccessRoutes(
  db: IdpDatabase,
  resolveContext: TenantContextResolver,
  authorize: TenantActionAuthorizer,
) {
  async function context(headers: Headers) {
    const result = await resolveContext(headers)
    if (!result.allowed) throw new AccessRouteError(result.reason)
    return result.context
  }

  return new Elysia({ name: "access-routes", prefix: "/api/access" })
    .onError(({ error, request, set }) => {
      if (!(error instanceof AccessRouteError)) return
      set.status =
        error.code === "unauthenticated" ? 401 : error.code === "version_conflict" ? 409 : 403
      return { code: error.code, requestId: request.headers.get("x-request-id") ?? "unavailable" }
    })
    .get("/summary", async ({ request }) => {
      const tenant = await context(request.headers)
      const rows = await db
        .select({
          capability: planEntitlement.capabilityKey,
          enabled: planEntitlement.enabled,
          quotaKey: planEntitlement.quotaKey,
          quotaLimit: planEntitlement.quotaLimit,
          state: tenantSubscription.state,
        })
        .from(tenantSubscription)
        .innerJoin(
          planEntitlement,
          eq(planEntitlement.planVersionId, tenantSubscription.planVersionId),
        )
        .where(
          and(
            eq(tenantSubscription.organizationId, tenant.organizationId),
            eq(tenantSubscription.isCurrent, true),
          ),
        )

      return {
        capabilities: capabilities.map((capability) => {
          const row = rows.find((item) => item.capability === capability)
          const decision = decideAccess({
            authenticated: true,
            capability,
            contextSelected: true,
            entitlementEnabled: row?.enabled ?? false,
            role: tenant.role,
            subscriptionState: row?.state,
            tenantActive: true,
          })
          return {
            capability,
            allowed: decision.allowed,
            reason: decision.allowed ? null : decision.reason,
          }
        }),
        organizationId: tenant.organizationId,
        role: tenant.role,
        subscriptionState: rows[0]?.state ?? "missing",
      }
    })
    .get("/requests", async ({ request }) => {
      const tenant = await context(request.headers)
      const decision = await authorize(tenant, "access_requests.review")
      if (!decision.allowed) throw new AccessRouteError(decision.reason)
      return db
        .select()
        .from(accessRequest)
        .where(eq(accessRequest.organizationId, tenant.organizationId))
        .orderBy(desc(accessRequest.createdAt))
        .limit(100)
    })
    .post(
      "/requests",
      async ({ body, request, status }) => {
        const tenant = await context(request.headers)
        if (!capabilities.some((capability) => capability === body.capabilityKey))
          throw new AccessRouteError("capability_denied")
        const [existing] = await db
          .select({ id: accessRequest.id })
          .from(accessRequest)
          .where(
            and(
              eq(accessRequest.organizationId, tenant.organizationId),
              eq(accessRequest.requesterMembershipId, tenant.membershipId),
              eq(accessRequest.capabilityKey, body.capabilityKey),
              eq(accessRequest.status, "pending"),
            ),
          )
          .limit(1)
        if (existing) return { id: existing.id, status: "pending" as const }
        const id = createId()
        await db.insert(accessRequest).values({
          id,
          organizationId: tenant.organizationId,
          requesterMembershipId: tenant.membershipId,
          capabilityKey: body.capabilityKey,
        })
        return status(201, { id, status: "pending" as const })
      },
      { body: t.Object({ capabilityKey: t.String({ maxLength: 100 }) }) },
    )
    .post(
      "/requests/:requestId/review",
      async ({ body, params, request }) => {
        const tenant = await context(request.headers)
        const decision = await authorize(tenant, "access_requests.review")
        if (!decision.allowed) throw new AccessRouteError(decision.reason)
        const [updated] = await db.transaction(async (tx) => {
          const result = await tx
            .update(accessRequest)
            .set({
              approvedRole: body.decision === "approved" ? body.approvedRole : null,
              reviewedAt: new Date(),
              reviewedByUserId: tenant.actorUserId,
              status: body.decision,
              updatedAt: new Date(),
              version: body.version + 1,
            })
            .where(
              and(
                eq(accessRequest.id, params.requestId),
                eq(accessRequest.organizationId, tenant.organizationId),
                eq(accessRequest.status, "pending"),
                eq(accessRequest.version, body.version),
              ),
            )
            .returning()
          const reviewed = result[0]
          if (reviewed && body.decision === "approved" && body.approvedRole)
            await tx
              .update(member)
              .set({ role: body.approvedRole })
              .where(
                and(
                  eq(member.id, reviewed.requesterMembershipId),
                  eq(member.organizationId, tenant.organizationId),
                  eq(member.status, "active"),
                ),
              )
          return result
        })
        if (!updated) throw new AccessRouteError("version_conflict")
        return updated
      },
      {
        body: t.Object({
          approvedRole: t.Optional(t.Union([t.Literal("admin"), t.Literal("member")])),
          decision: t.Union([t.Literal("approved"), t.Literal("denied")]),
          version: t.Integer({ minimum: 1 }),
        }),
      },
    )
}

class AccessRouteError extends Error {
  constructor(readonly code: string) {
    super("Access route denied.")
  }
}
