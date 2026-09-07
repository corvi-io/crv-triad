import { and, asc, eq, inArray } from "drizzle-orm"
import { businessProfile } from "../../business-profile/database/schema.js"
import type { BusinessLogoStorage } from "../../business-profile/infra/logo-storage.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import { invitation, organization, user } from "../../idp/database/schema.js"
import type {
  InvitationDisplayContextProvider,
  InvitationLogoProvider,
} from "../../idp/identity/invitation-display-context.js"
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
          .orderBy(asc(unit.name), asc(unit.id))
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

const MAX_EMAIL_LOGO_BYTES = 100_000

export function createInvitationEmailDisplayContextProvider(
  db: IdpDatabase,
  storage: BusinessLogoStorage,
): InvitationDisplayContextProvider {
  const readContext = createInvitationDisplayContextProvider(db)
  const readLogo = createInvitationLogoProvider(db, storage)
  return async (invitationId) => {
    const context = await readContext(invitationId)
    if (!context?.logoAvailable) return context
    const logo = await readLogo(invitationId)
    if (
      !logo ||
      logo.body.byteLength > MAX_EMAIL_LOGO_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(logo.contentType)
    ) {
      return context
    }
    return {
      ...context,
      logoDataUrl: `data:${logo.contentType};base64,${Buffer.from(logo.body).toString("base64")}`,
    }
  }
}

export function createInvitationLogoProvider(
  db: IdpDatabase,
  storage: BusinessLogoStorage,
): InvitationLogoProvider {
  return async (invitationId) => {
    const [row] = await db
      .select({ logoObjectKey: businessProfile.logoObjectKey })
      .from(invitation)
      .innerJoin(
        professionalInvitation,
        eq(professionalInvitation.identityInvitationId, invitation.id),
      )
      .innerJoin(
        businessProfile,
        eq(businessProfile.organizationId, professionalInvitation.organizationId),
      )
      .where(eq(invitation.id, invitationId))
      .limit(1)
    return row?.logoObjectKey ? storage.get(row.logoObjectKey) : null
  }
}
