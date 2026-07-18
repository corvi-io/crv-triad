import { and, desc, eq, gt, sql } from "drizzle-orm"

import type { IdpDatabase } from "../database/client.js"
import { invitation } from "../database/schema.js"
import { createId } from "../infra/ids.js"
import { type IdpRole, normalizeEmail } from "./access-policy.js"

export type CreateInvitationInput = {
  email: string
  role: IdpRole
  invitedByUserId: string | null
  expiresAt: Date
}

export class PendingInvitationAlreadyExistsError extends Error {
  constructor() {
    super("Pending invitation already exists.")
    this.name = "PendingInvitationAlreadyExistsError"
  }
}

async function lockPendingInvitationEmail(db: IdpDatabase, email: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtext('idp_invitations_pending_email'), hashtext(${email}))`,
  )
}

export async function findPendingInvitationByEmail(
  db: IdpDatabase,
  email: string,
  now = new Date(),
) {
  const [row] = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.email, normalizeEmail(email)),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, now),
      ),
    )
    .orderBy(desc(invitation.createdAt), desc(invitation.id))
    .limit(1)

  return row ?? null
}

export async function createInvitation(
  db: IdpDatabase,
  input: CreateInvitationInput,
  now = new Date(),
) {
  const email = normalizeEmail(input.email)

  return db.transaction(async (transaction) => {
    const tx = transaction as unknown as IdpDatabase

    await lockPendingInvitationEmail(tx, email)

    const existingPendingInvitation = await findPendingInvitationByEmail(tx, email, now)
    if (existingPendingInvitation) {
      throw new PendingInvitationAlreadyExistsError()
    }

    const id = createId()

    const [created] = await tx
      .insert(invitation)
      .values({
        id,
        email,
        role: input.role,
        status: "pending",
        invitedByUserId: input.invitedByUserId,
        expiresAt: input.expiresAt,
      })
      .returning()

    return created
  })
}

export async function acceptInvitationForUser(db: IdpDatabase, email: string, userId: string) {
  const pendingInvitation = await findPendingInvitationByEmail(db, email)
  if (!pendingInvitation) return null

  const [accepted] = await db
    .update(invitation)
    .set({ status: "accepted", acceptedAt: new Date(), acceptedByUserId: userId })
    .where(eq(invitation.id, pendingInvitation.id))
    .returning()

  return accepted
}

export async function revokeInvitation(db: IdpDatabase, invitationId: string) {
  const [revoked] = await db
    .update(invitation)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(and(eq(invitation.id, invitationId), eq(invitation.status, "pending")))
    .returning()

  return revoked ?? null
}
