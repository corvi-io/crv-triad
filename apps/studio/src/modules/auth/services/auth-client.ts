import { organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { env } from "@/modules/shared/config/env"

export const authClient = createAuthClient({
  baseURL: getAbsoluteAuthBaseUrl(),
  plugins: [organizationClient()],
})

export async function signInWithEmail(input: { email: string; password: string }) {
  return authClient.signIn.email({
    callbackURL: getBrowserUrl("/overview"),
    email: input.email,
    password: input.password,
  })
}

export type InvitationResolution = {
  expiresAt?: string
  role?: "admin" | "member"
  state: "accepted" | "expired" | "invalid" | "revoked" | "superseded" | "valid"
}

export async function resolveInvitation(token: string, signal?: AbortSignal) {
  const response = await fetch(getIdpUrl("/invitations/resolve"), {
    body: JSON.stringify({ token }),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
    referrerPolicy: "no-referrer",
    signal,
  })
  if (!response.ok) throw new Error("Invitation resolution unavailable.")
  return (await response.json()) as InvitationResolution
}

export async function acceptInvitation(input: { password: string; token: string }) {
  const response = await fetch(getIdpUrl("/api/auth/sign-up/email"), {
    body: JSON.stringify({
      email: "invitation-proof@invalid.example",
      invitationToken: input.token,
      name: "Usuário TRIAD",
      password: input.password,
      rememberMe: false,
    }),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
    referrerPolicy: "no-referrer",
  })

  if (response.ok) return { status: true as const }
  const payload = (await response.json().catch(() => null)) as { code?: unknown } | null
  return {
    error:
      payload?.code === "PASSWORD_POLICY_REJECTED"
        ? ("password_policy" as const)
        : payload?.code === "INVALID_INVITATION_PROOF"
          ? ("invalid_invitation" as const)
          : ("unavailable" as const),
  }
}

export async function requestPasswordReset(email: string) {
  return authClient.requestPasswordReset({
    email,
    redirectTo: getBrowserUrl("/reset-password"),
  })
}

export async function resetPassword(input: { newPassword: string; token: string }) {
  return authClient.resetPassword(input)
}

export async function resendVerificationEmail(email: string) {
  return authClient.sendVerificationEmail({
    callbackURL: getBrowserUrl("/login?verified=true"),
    email,
  })
}

export async function signInWithGoogle() {
  return authClient.signIn.social({
    callbackURL: getBrowserUrl("/overview"),
    errorCallbackURL: getBrowserUrl("/login?error=provider"),
    provider: "google",
  })
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  return authClient.changePassword({
    ...input,
    revokeOtherSessions: true,
  })
}

export async function listAccounts() {
  return authClient.listAccounts()
}

export async function linkGoogle() {
  return authClient.linkSocial({
    callbackURL: getBrowserUrl("/preferences?google=connected"),
    errorCallbackURL: getBrowserUrl("/preferences?google=error"),
    provider: "google",
  })
}

export async function unlinkGoogle() {
  return authClient.unlinkAccount({ providerId: "google" })
}

export async function signOut() {
  return authClient.signOut()
}

function getAbsoluteAuthBaseUrl() {
  if (env.authBaseUrl.startsWith("http://") || env.authBaseUrl.startsWith("https://")) {
    return env.authBaseUrl
  }

  return new URL(env.authBaseUrl, getBrowserOrigin()).toString()
}

function getBrowserUrl(path: string) {
  return new URL(path, getBrowserOrigin()).toString()
}

function getBrowserOrigin() {
  return typeof window === "undefined" ? "http://localhost:3000" : window.location.origin
}

export function getApiUrl(path: string) {
  return new URL(path, getAbsoluteAuthBaseUrl()).toString()
}

function getIdpUrl(path: string) {
  return getApiUrl(path)
}
