import type { TenantContextDecision, TenantRole } from "../domain/business-context.js"

export type AuthenticatedBusinessSession = Readonly<{
  session: Readonly<{ activeOrganizationId?: string | null; createdAt?: Date }>
  user: Readonly<{ id: string }>
}>

export type ActiveMembership = Readonly<{
  membershipId: string
  organizationId: string
  organizationName: string
  role: TenantRole
}>

export type TenantMembershipReader = Readonly<{
  findActiveMembership(input: {
    organizationId: string
    userId: string
  }): Promise<ActiveMembership | null>
}>

export async function resolveTenantContext(
  session: AuthenticatedBusinessSession | null,
  memberships: TenantMembershipReader,
): Promise<TenantContextDecision> {
  if (!session) return { allowed: false, reason: "unauthenticated" }

  const organizationId = session.session.activeOrganizationId
  if (!organizationId) return { allowed: false, reason: "context_required" }

  const membership = await memberships.findActiveMembership({
    organizationId,
    userId: session.user.id,
  })
  if (!membership) return { allowed: false, reason: "tenant_forbidden" }

  return {
    allowed: true,
    context: {
      actorUserId: session.user.id,
      authenticatedAt: session.session.createdAt,
      membershipId: membership.membershipId,
      organizationId: membership.organizationId,
      organizationName: membership.organizationName,
      role: membership.role,
    },
  }
}
