import { and, eq } from "drizzle-orm"

import type { IdpDatabase } from "../../idp/database/client.js"
import { member, organization, session } from "../../idp/database/schema.js"
import type { IdpAuth } from "../../idp/identity/auth.js"

export function createTenantContextSelector(auth: IdpAuth, db: IdpDatabase) {
  return async (headers: Headers, organizationId: string) => {
    const authSession = await auth.api.getSession({ headers })
    if (!authSession) return { status: "unauthenticated" as const }

    const [membership] = await db
      .select({ id: member.id })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(
        and(
          eq(member.userId, authSession.user.id),
          eq(member.organizationId, organizationId),
          eq(member.status, "active"),
          eq(organization.status, "active"),
        ),
      )
      .limit(1)
    if (!membership) return { status: "forbidden" as const }

    const [updated] = await db
      .update(session)
      .set({ activeOrganizationId: organizationId, updatedAt: new Date() })
      .where(and(eq(session.id, authSession.session.id), eq(session.userId, authSession.user.id)))
      .returning({ activeOrganizationId: session.activeOrganizationId })
    if (!updated) return { status: "unauthenticated" as const }

    return { status: "selected" as const, activeOrganizationId: updated.activeOrganizationId }
  }
}

export type TenantContextSelector = ReturnType<typeof createTenantContextSelector>
