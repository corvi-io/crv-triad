export type IdpRole = "admin" | "member"
export type IdpUserStatus = "active" | "disabled"
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked"

export type AccessPolicyUser = {
  id: string
  email: string
  status: IdpUserStatus
  role: IdpRole
}

export type AccessPolicyInvitation = {
  id: string
  email: string
  role: IdpRole
  status: InvitationStatus
  expiresAt: Date
}

export type AccessPolicyLookup = {
  findUserByEmail: (email: string) => Promise<AccessPolicyUser | null>
  findPendingInvitationByEmail: (email: string, now: Date) => Promise<AccessPolicyInvitation | null>
}

export type AccessDecision =
  | { allowed: true; reason: "active_user"; user: AccessPolicyUser }
  | { allowed: true; reason: "pending_invitation"; invitation: AccessPolicyInvitation }
  | { allowed: false; reason: "disabled_user" | "no_active_user_or_pending_invitation" }

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function decideIdentityAccess(
  email: string,
  lookup: AccessPolicyLookup,
  now = new Date(),
): Promise<AccessDecision> {
  const normalizedEmail = normalizeEmail(email)
  const existingUser = await lookup.findUserByEmail(normalizedEmail)

  if (existingUser?.status === "active") {
    return { allowed: true, reason: "active_user", user: existingUser }
  }

  if (existingUser?.status === "disabled") {
    return { allowed: false, reason: "disabled_user" }
  }

  const pendingInvitation = await lookup.findPendingInvitationByEmail(normalizedEmail, now)

  if (pendingInvitation) {
    return { allowed: true, reason: "pending_invitation", invitation: pendingInvitation }
  }

  return { allowed: false, reason: "no_active_user_or_pending_invitation" }
}
