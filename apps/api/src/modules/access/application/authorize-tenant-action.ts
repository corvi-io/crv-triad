import { and, count, eq } from "drizzle-orm"

import { client } from "../../clients/database/schema.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import { planEntitlement, tenantSubscription } from "../database/schema.js"
import { type AccessDecision, type Capability, decideAccess } from "../domain/access-decision.js"

type AccessDenied = Extract<AccessDecision, { allowed: false }>

export type AuthorizedTenantAction =
  | Readonly<{ allowed: true; activeClientLimit?: number }>
  | AccessDenied

export function createTenantActionAuthorizer(db: IdpDatabase) {
  return async (
    context: TenantContext,
    capability: Capability,
    options: { consumeClientCapacity?: boolean } = {},
  ): Promise<AuthorizedTenantAction> => {
    const [commercial] = await db
      .select({
        entitlementEnabled: planEntitlement.enabled,
        quotaKey: planEntitlement.quotaKey,
        quotaLimit: planEntitlement.quotaLimit,
        subscriptionState: tenantSubscription.state,
      })
      .from(tenantSubscription)
      .innerJoin(
        planEntitlement,
        eq(planEntitlement.planVersionId, tenantSubscription.planVersionId),
      )
      .where(
        and(
          eq(tenantSubscription.organizationId, context.organizationId),
          eq(tenantSubscription.isCurrent, true),
          eq(planEntitlement.capabilityKey, capability),
        ),
      )
      .limit(1)

    let quota: { limit: number; usage: number } | undefined
    if (
      options.consumeClientCapacity &&
      commercial?.quotaKey === "clients.active.count" &&
      commercial.quotaLimit !== null
    ) {
      const [usage] = await db
        .select({ value: count() })
        .from(client)
        .where(and(eq(client.organizationId, context.organizationId), eq(client.status, "active")))
      quota = { limit: commercial.quotaLimit, usage: usage?.value ?? 0 }
    }

    const decision = decideAccess({
      authenticated: true,
      capability,
      contextSelected: true,
      entitlementEnabled: commercial?.entitlementEnabled ?? false,
      quota,
      role: context.role,
      subscriptionState: commercial?.subscriptionState,
      tenantActive: true,
    })

    if (!decision.allowed) return decision
    return {
      allowed: true,
      ...(quota ? { activeClientLimit: quota.limit } : {}),
    }
  }
}

export type TenantActionAuthorizer = ReturnType<typeof createTenantActionAuthorizer>
