import type { TenantRole } from "../../tenancy/domain/business-context.js"

export const capabilities = [
  "clients.read",
  "clients.manage",
  "catalogs.read",
  "catalogs.manage",
  "members.read",
  "members.manage",
  "ownership.transfer",
  "access_requests.review",
] as const

export type Capability = (typeof capabilities)[number]
export type SubscriptionState = "active" | "expired" | "suspended"

const roleCapabilities: Readonly<Record<TenantRole, ReadonlySet<Capability>>> = {
  owner: new Set(capabilities),
  admin: new Set([
    "clients.read",
    "clients.manage",
    "catalogs.read",
    "catalogs.manage",
    "members.read",
    "members.manage",
    "access_requests.review",
  ]),
  member: new Set(["clients.read", "clients.manage", "catalogs.read"]),
}

export type AccessDecisionInput = Readonly<{
  authenticated: boolean
  capability: Capability
  contextSelected: boolean
  entitlementEnabled: boolean
  quota?: Readonly<{ limit: number; usage: number }>
  role?: TenantRole
  subscriptionState?: SubscriptionState
  tenantActive: boolean
}>

export type AccessDenialReason =
  | "unauthenticated"
  | "context_required"
  | "tenant_forbidden"
  | "capability_forbidden"
  | "subscription_required"
  | "subscription_inactive"
  | "module_not_included"
  | "quota_reached"

export type AccessDecision =
  | Readonly<{ allowed: true }>
  | Readonly<{
      allowed: false
      quota?: Readonly<{ limit: number; usage: number }>
      reason: AccessDenialReason
    }>

export function decideAccess(input: AccessDecisionInput): AccessDecision {
  if (!input.authenticated) return { allowed: false, reason: "unauthenticated" }
  if (!input.contextSelected) return { allowed: false, reason: "context_required" }
  if (!input.tenantActive || !input.role) return { allowed: false, reason: "tenant_forbidden" }
  if (!roleCapabilities[input.role].has(input.capability)) {
    return { allowed: false, reason: "capability_forbidden" }
  }
  if (!input.subscriptionState) return { allowed: false, reason: "subscription_required" }
  if (input.subscriptionState !== "active") {
    return { allowed: false, reason: "subscription_inactive" }
  }
  if (!input.entitlementEnabled) return { allowed: false, reason: "module_not_included" }
  if (input.quota && input.quota.usage >= input.quota.limit) {
    return { allowed: false, quota: input.quota, reason: "quota_reached" }
  }
  return { allowed: true }
}

export function capabilitiesForRole(role: TenantRole): readonly Capability[] {
  return capabilities.filter((capability) => roleCapabilities[role].has(capability))
}
