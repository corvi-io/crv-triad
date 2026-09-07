import { and, eq } from "drizzle-orm"

import type { IdpDatabase } from "../../idp/database/client.js"
import { member, organization } from "../../idp/database/schema.js"
import type {
  ActiveMembership,
  TenantMembershipReader,
} from "../application/resolve-tenant-context.js"
import { tenantRoles } from "../domain/business-context.js"

export function createTenantMembershipReader(db: IdpDatabase): TenantMembershipReader {
  return {
    async findActiveMembership({ organizationId, userId }) {
      const [record] = await db
        .select({
          membershipId: member.id,
          organizationId: organization.id,
          organizationName: organization.name,
          role: member.role,
        })
        .from(member)
        .innerJoin(organization, eq(organization.id, member.organizationId))
        .where(
          and(
            eq(member.organizationId, organizationId),
            eq(member.userId, userId),
            eq(member.status, "active"),
            eq(organization.status, "active"),
          ),
        )
        .limit(1)

      if (!record || !tenantRoles.includes(record.role as ActiveMembership["role"])) return null
      return record as ActiveMembership
    },
  }
}
