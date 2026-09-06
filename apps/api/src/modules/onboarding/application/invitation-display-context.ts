import { and, eq, inArray } from "drizzle-orm"
import { businessProfile } from "../../business-profile/database/schema.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import { invitation, organization, user } from "../../idp/database/schema.js"
import type { InvitationDisplayContextProvider } from "../../idp/identity/invitation-display-context.js"
import { professionalInvitation } from "../../professionals/database/schema.js"
import { unit } from "../../units/database/schema.js"

export function createInvitationDisplayContextProvider(
  db: IdpDatabase,
): InvitationDisplayContextProvider {
  return async (invitationId) => {
    const [row] = await db
      .select({
        assignments: professionalInvitation.assignments,
        inviterName: user.name,
        logoObjectKey: businessProfile.logoObjectKey,
        organizationId: professionalInvitation.organizationId,
        organizationName: organization.name,
        professionalRole: professionalInvitation.role,
      })
      .from(invitation)
      .leftJoin(
        professionalInvitation,
        eq(professionalInvitation.identityInvitationId, invitation.id),
      )
      .leftJoin(organization, eq(organization.id, professionalInvitation.organizationId))
      .leftJoin(user, eq(user.id, invitation.invitedByUserId))
      .leftJoin(
        businessProfile,
        eq(businessProfile.organizationId, professionalInvitation.organizationId),
      )
      .where(eq(invitation.id, invitationId))
      .limit(1)
    if (!row?.organizationId || !row.organizationName) return null
    const unitIds = row.assignments?.unitIds.slice(0, 50) ?? []
    const units = unitIds.length
      ? await db
          .select({ name: unit.name })
          .from(unit)
          .where(
            and(
              eq(unit.organizationId, row.organizationId),
              inArray(unit.id, unitIds),
              eq(unit.status, "active"),
            ),
          )
          .limit(50)
      : []
    return {
      organizationName: row.organizationName,
      ...(row.professionalRole ? { professionalRole: row.professionalRole } : {}),
      ...(units.length ? { unitNames: units.map(({ name }) => name) } : {}),
      ...(row.inviterName ? { inviterName: row.inviterName } : {}),
      logoAvailable: Boolean(row.logoObjectKey),
    }
  }
}
