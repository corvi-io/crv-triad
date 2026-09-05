import { and, asc, eq } from "drizzle-orm"
import { platformOperator } from "../../backstage/database/schema.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import { member, organization, session, user } from "../../idp/database/schema.js"
import type { IdpAuth } from "../../idp/identity/auth.js"
import { MAX_ACTIVE_ORGANIZATION_MEMBERSHIPS } from "../../idp/identity/auth.js"

export function createContextDiscovery(auth: IdpAuth, db: IdpDatabase) {
  return async (headers: Headers) => {
    const authSession = await auth.api.getSession({ headers })
    if (!authSession) return { status: "unauthenticated" as const }

    const [activeUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, authSession.user.id), eq(user.status, "active")))
      .limit(1)
    if (!activeUser) return { status: "forbidden" as const }

    const [memberships, [operator], [persistedSession]] = await Promise.all([
      db
        .select({
          id: organization.id,
          name: organization.name,
          role: member.role,
        })
        .from(member)
        .innerJoin(organization, eq(organization.id, member.organizationId))
        .where(
          and(
            eq(member.userId, activeUser.id),
            eq(member.status, "active"),
            eq(organization.status, "active"),
          ),
        )
        .orderBy(asc(organization.name), asc(organization.id))
        .limit(MAX_ACTIVE_ORGANIZATION_MEMBERSHIPS + 1),
      db
        .select({ id: platformOperator.id })
        .from(platformOperator)
        .where(
          and(eq(platformOperator.userId, activeUser.id), eq(platformOperator.status, "active")),
        )
        .limit(1),
      db
        .select({ activeOrganizationId: session.activeOrganizationId })
        .from(session)
        .where(and(eq(session.id, authSession.session.id), eq(session.userId, activeUser.id)))
        .limit(1),
    ])

    if (memberships.length > MAX_ACTIVE_ORGANIZATION_MEMBERSHIPS) {
      return { status: "membership_limit_reached" as const }
    }

    const activeOrganizationId = memberships.some(
      (membership) => membership.id === persistedSession?.activeOrganizationId,
    )
      ? persistedSession?.activeOrganizationId
      : null

    return {
      status: "available" as const,
      activeOrganizationId,
      platform: operator ? { id: "platform" as const, label: "Operações CRV" } : null,
      tenants: memberships,
    }
  }
}

export type ContextDiscovery = ReturnType<typeof createContextDiscovery>
