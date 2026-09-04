import { and, eq } from "drizzle-orm"

import type { IdpDatabase } from "../../idp/database/client.js"
import { session } from "../../idp/database/schema.js"
import type { IdpAuth } from "../../idp/identity/auth.js"
import { resolveTenantContext, type TenantMembershipReader } from "./resolve-tenant-context.js"

export type TenantContextResolver = ReturnType<typeof createTenantContextResolver>

export function createTenantContextResolver(
  auth: IdpAuth,
  db: IdpDatabase,
  memberships: TenantMembershipReader,
) {
  return async (headers: Headers) => {
    const authSession = await auth.api.getSession({ headers })
    if (!authSession) return resolveTenantContext(null, memberships)

    const [persistedSession] = await db
      .select({ activeOrganizationId: session.activeOrganizationId })
      .from(session)
      .where(and(eq(session.id, authSession.session.id), eq(session.userId, authSession.user.id)))
      .limit(1)

    return resolveTenantContext(
      {
        session: {
          activeOrganizationId: persistedSession?.activeOrganizationId,
          createdAt: new Date(authSession.session.createdAt),
        },
        user: { id: authSession.user.id },
      },
      memberships,
    )
  }
}
