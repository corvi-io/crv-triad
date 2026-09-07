export const tenantRoles = ["owner", "admin", "member"] as const

export type TenantRole = (typeof tenantRoles)[number]

export type TenantContext = Readonly<{
  actorUserId: string
  authenticatedAt?: Date
  membershipId: string
  organizationId: string
  organizationName: string
  role: TenantRole
}>

export type TenantContextFailure = "unauthenticated" | "context_required" | "tenant_forbidden"

export type TenantContextDecision =
  | Readonly<{ allowed: true; context: TenantContext }>
  | Readonly<{ allowed: false; reason: TenantContextFailure }>
