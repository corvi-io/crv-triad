import { and, eq } from "drizzle-orm"

import type { IdpDatabase } from "../../idp/database/client.js"
import { invitation } from "../../idp/database/schema.js"
import { professionalService } from "../../services/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import { professional, professionalInvitation, professionalUnit } from "../database/schema.js"

export async function acceptProfessionalInvitation(
  db: IdpDatabase,
  identityInvitationId: string | undefined,
  userId: string,
) {
  return db.transaction(async (transaction) => {
    const [match] = await transaction
      .select({ invitation: professionalInvitation })
      .from(professionalInvitation)
      .innerJoin(invitation, eq(invitation.id, professionalInvitation.identityInvitationId))
      .where(
        and(
          identityInvitationId
            ? eq(professionalInvitation.identityInvitationId, identityInvitationId)
            : undefined,
          eq(professionalInvitation.status, "pending"),
          eq(invitation.status, "accepted"),
          eq(invitation.acceptedByUserId, userId),
        ),
      )
      .limit(1)
    const pending = match?.invitation
    if (!pending) return null

    const [existing] = await transaction
      .select({ id: professional.id })
      .from(professional)
      .where(
        and(
          eq(professional.organizationId, pending.organizationId),
          eq(professional.globalUserId, userId),
        ),
      )
      .limit(1)
    const professionalId = existing?.id ?? createId()
    if (!existing) {
      await transaction.insert(professional).values({
        commissionBasisPoints: pending.commissionBasisPoints,
        globalUserId: userId,
        id: professionalId,
        organizationId: pending.organizationId,
        role: pending.role,
        specialties: pending.specialties,
      })
      if (pending.assignments.unitIds.length) {
        await transaction.insert(professionalUnit).values(
          pending.assignments.unitIds.map((unitId) => ({
            organizationId: pending.organizationId,
            professionalId,
            unitId,
          })),
        )
      }
      if (pending.assignments.serviceIds.length) {
        await transaction.insert(professionalService).values(
          pending.assignments.serviceIds.map((serviceId) => ({
            organizationId: pending.organizationId,
            professionalId,
            serviceId,
          })),
        )
      }
    }

    await transaction
      .update(professionalInvitation)
      .set({ acceptedAt: new Date(), status: "accepted", updatedAt: new Date() })
      .where(
        and(
          eq(professionalInvitation.id, pending.id),
          eq(professionalInvitation.status, "pending"),
        ),
      )
    return professionalId
  })
}
