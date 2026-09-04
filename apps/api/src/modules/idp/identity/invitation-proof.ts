import { type BetterAuthPlugin, type DBAdapter, getCurrentAdapter } from "better-auth"

import type { IdpRole } from "./access-policy.js"
import { digestInvitationToken } from "./invitations.js"

type InvitationProofRow = {
  email: string
  expiresAt: Date
  id: string
  role: IdpRole
  status: string
  tokenIssuedAt: Date | null
}

type AuthHookContext = {
  body?: Record<string, unknown>
  context: { adapter: DBAdapter }
  path?: string
}

export function invitationProofPlugin() {
  return {
    id: "triad-invitation-proof",
    schema: {
      invitation: {
        disableMigration: true,
        fields: {
          email: { type: "string" },
          role: { type: "string" },
          status: { type: "string" },
          invitedByUserId: { type: "string", required: false },
          expiresAt: { type: "date" },
          tokenDigest: { type: "string", required: false, unique: true },
          tokenIssuedAt: { type: "date", required: false },
          acceptedAt: { type: "date", required: false },
          acceptedByUserId: { type: "string", required: false },
          createdAt: { type: "date" },
          updatedAt: { type: "date" },
        },
      },
    },
  } satisfies BetterAuthPlugin
}

export function readInvitationToken(context: AuthHookContext | null | undefined): string | null {
  if (context?.path !== "/sign-up/email") return null
  const token = context.body?.invitationToken
  return typeof token === "string" ? token : null
}

export async function resolveInvitationProof(
  context: AuthHookContext,
  token: string,
  now = new Date(),
): Promise<InvitationProofRow | null> {
  const digest = digestInvitationToken(token)
  if (!digest) return null

  const adapter = await getCurrentAdapter(context.context.adapter)
  return (await adapter.findOne<InvitationProofRow>({
    model: "invitation",
    where: [
      { field: "tokenDigest", value: digest },
      { field: "status", value: "pending" },
      { field: "expiresAt", operator: "gt", value: now },
      { field: "tokenIssuedAt", operator: "ne", value: null },
    ],
  })) as InvitationProofRow | null
}

export async function consumeInvitationProof(
  context: AuthHookContext,
  token: string,
  userId: string,
  now = new Date(),
  onAccepted?: (email: string, userId: string) => Promise<void>,
): Promise<boolean> {
  const digest = digestInvitationToken(token)
  if (!digest) return false

  const adapter = await getCurrentAdapter(context.context.adapter)
  const invitation = onAccepted ? await resolveInvitationProof(context, token, now) : null
  const updated = await adapter.updateMany({
    model: "invitation",
    update: {
      acceptedAt: now,
      acceptedByUserId: userId,
      status: "accepted",
      updatedAt: now,
    },
    where: [
      { field: "tokenDigest", value: digest },
      { field: "status", value: "pending" },
      { field: "expiresAt", operator: "gt", value: now },
      { field: "tokenIssuedAt", operator: "ne", value: null },
    ],
  })

  if (updated === 1 && onAccepted && invitation) await onAccepted(invitation.email, userId)

  return updated === 1
}
