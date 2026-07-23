import { createHash, randomBytes } from "node:crypto"

import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm"

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

export type InvitationTokenState =
  | "accepted"
  | "expired"
  | "invalid"
  | "revoked"
  | "superseded"
  | "valid"

export type InvitationTokenResolution = {
  state: InvitationTokenState
  invitation?: typeof invitation.$inferSelect
}

const INVITATION_TOKEN_BYTES = 32
const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export class PendingInvitationAlreadyExistsError extends Error {
  constructor() {
    super("Pending invitation already exists.")
    this.name = "PendingInvitationAlreadyExistsError"
  }
}

export async function lockPendingInvitationEmail(db: IdpDatabase, email: string) {
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
        isNotNull(invitation.tokenDigest),
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
    const secret = createInvitationSecret()

    const [created] = await tx
      .insert(invitation)
      .values({
        id,
        email,
        role: input.role,
        status: "pending",
        invitedByUserId: input.invitedByUserId,
        expiresAt: input.expiresAt,
        tokenDigest: secret.digest,
        tokenIssuedAt: now,
      })
      .returning()

    return { invitation: created, token: secret.token }
  })
}

export async function resolveInvitationToken(
  db: IdpDatabase,
  token: string,
  now = new Date(),
): Promise<InvitationTokenResolution> {
  const digest = digestInvitationToken(token)
  if (!digest) return { state: "invalid" }

  const [row] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.tokenDigest, digest))
    .limit(1)

  if (!row?.tokenIssuedAt) return { state: "invalid" }
  if (row.status === "accepted") return { state: "accepted" }
  if (row.status === "revoked") return { state: "revoked" }
  if (row.status === "superseded") return { state: "superseded" }
  if (row.status === "expired" || row.expiresAt <= now) return { state: "expired" }
  if (row.status !== "pending") return { state: "invalid" }

  return { invitation: row, state: "valid" }
}

export async function resendInvitation(
  db: IdpDatabase,
  invitationId: string,
  expiresAt: Date,
  now = new Date(),
) {
  return db.transaction(async (transaction) => {
    const tx = transaction as unknown as IdpDatabase
    const [current] = await tx
      .select()
      .from(invitation)
      .where(and(eq(invitation.id, invitationId), eq(invitation.status, "pending")))
      .limit(1)

    if (!current || current.expiresAt <= now || !current.tokenDigest) return null

    await lockPendingInvitationEmail(tx, current.email)

    const [superseded] = await tx
      .update(invitation)
      .set({ status: "superseded", updatedAt: now })
      .where(and(eq(invitation.id, current.id), eq(invitation.status, "pending")))
      .returning()

    if (!superseded) return null

    const secret = createInvitationSecret()
    const [created] = await tx
      .insert(invitation)
      .values({
        id: createId(),
        email: current.email,
        role: current.role,
        status: "pending",
        invitedByUserId: current.invitedByUserId,
        expiresAt,
        tokenDigest: secret.digest,
        tokenIssuedAt: now,
      })
      .returning()

    return { invitation: created, token: secret.token }
  })
}

export async function acceptInvitationForUser(db: IdpDatabase, email: string, userId: string) {
  const pendingInvitation = await findPendingInvitationByEmail(db, email)
  if (!pendingInvitation) return null

  const [accepted] = await db
    .update(invitation)
    .set({ status: "accepted", acceptedAt: new Date(), acceptedByUserId: userId })
    .where(and(eq(invitation.id, pendingInvitation.id), eq(invitation.status, "pending")))
    .returning()

  return accepted
}

export function createInvitationSecret(): { digest: string; token: string } {
  const token = randomBytes(INVITATION_TOKEN_BYTES).toString("base64url")
  return { digest: hashInvitationToken(token), token }
}

export function digestInvitationToken(token: string): string | null {
  if (!INVITATION_TOKEN_PATTERN.test(token)) return null
  return hashInvitationToken(token)
}

function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url")
}

export async function revokeInvitation(db: IdpDatabase, invitationId: string) {
  const [revoked] = await db
    .update(invitation)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(and(eq(invitation.id, invitationId), eq(invitation.status, "pending")))
    .returning()

  return revoked ?? null
}
