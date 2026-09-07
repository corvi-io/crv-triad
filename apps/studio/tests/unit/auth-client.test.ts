import { beforeEach, describe, expect, it, vi } from "vitest"

const authMocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  linkSocial: vi.fn(),
  listAccounts: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  sendVerificationEmail: vi.fn(),
  signInEmail: vi.fn(),
  signInSocial: vi.fn(),
  signOut: vi.fn(),
  unlinkAccount: vi.fn(),
}))

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    changePassword: authMocks.changePassword,
    linkSocial: authMocks.linkSocial,
    listAccounts: authMocks.listAccounts,
    requestPasswordReset: authMocks.requestPasswordReset,
    resetPassword: authMocks.resetPassword,
    sendVerificationEmail: authMocks.sendVerificationEmail,
    signIn: {
      email: authMocks.signInEmail,
      social: authMocks.signInSocial,
    },
    signOut: authMocks.signOut,
    unlinkAccount: authMocks.unlinkAccount,
  })),
}))

import {
  acceptExistingInvitation,
  acceptInvitation,
  changePassword,
  linkGoogle,
  listAccounts,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  resolveInvitation,
  resolveInvitationLogo,
  signInWithEmail,
  signInWithGoogle,
  unlinkGoogle,
} from "@/modules/auth/services/auth-client"
import { env } from "@/modules/shared/config/env"

describe("auth client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    authMocks.requestPasswordReset.mockReset()
    authMocks.resetPassword.mockReset()
    authMocks.sendVerificationEmail.mockReset()
    authMocks.signInEmail.mockReset()
    authMocks.signInSocial.mockReset()
    authMocks.changePassword.mockReset()
    authMocks.linkSocial.mockReset()
    authMocks.listAccounts.mockReset()
    authMocks.unlinkAccount.mockReset()
  })

  it("signs in with email and password using an absolute callback URL", async () => {
    await signInWithEmail({ email: "maria@example.com", password: "password-123" })

    expect(authMocks.signInEmail).toHaveBeenCalledWith({
      callbackURL: "http://localhost:3000/overview",
      email: "maria@example.com",
      password: "password-123",
    })
  })

  it("resolves and accepts invitations through token-only browser contracts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ state: "valid", role: "member" }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(resolveInvitation("synthetic-invitation-proof")).resolves.toMatchObject({
      state: "valid",
    })
    await expect(
      acceptInvitation({
        name: "Pessoa Convidada",
        password: "Senha válida 1!",
        token: "synthetic-invitation-proof",
      }),
    ).resolves.toEqual({ status: true })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const resolveRequest = fetchMock.mock.calls[0]
    const acceptanceRequest = fetchMock.mock.calls[1]
    expect(resolveRequest?.[0]).toBe(new URL("/invitations/resolve", env.authBaseUrl).toString())
    expect(resolveRequest?.[1]).toMatchObject({ method: "POST", referrerPolicy: "no-referrer" })
    expect(acceptanceRequest?.[0]).toBe(
      new URL("/api/auth/sign-up/email", env.authBaseUrl).toString(),
    )
    expect(acceptanceRequest?.[1]).toMatchObject({ method: "POST", referrerPolicy: "no-referrer" })
  })

  it("loads invitation logo bytes only from a successful proof-gated response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/png" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(resolveInvitationLogo("valid-proof")).resolves.toMatchObject({ type: "image/png" })
    await expect(resolveInvitationLogo("terminal-proof")).resolves.toBeNull()
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      referrerPolicy: "no-referrer",
    })
  })

  it("rejects an unavailable invitation resolution", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })))

    await expect(resolveInvitation("synthetic-invitation-proof")).rejects.toThrow(
      "Invitation resolution unavailable.",
    )
  })

  it.each([
    ["PASSWORD_POLICY_REJECTED", "password_policy"],
    ["INVALID_INVITATION_PROOF", "invalid_invitation"],
    ["UNAVAILABLE", "unavailable"],
  ] as const)("maps safe new-invitation error %s", async (code, expected) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ code }), { status: 400 })),
    )

    await expect(
      acceptInvitation({ name: "Pessoa", password: "Senha válida 1!", token: "proof" }),
    ).resolves.toEqual({ error: expected })
  })

  it.each([
    [401, "UNAUTHENTICATED", "unauthenticated"],
    [400, "INVITATION_ACCOUNT_MISMATCH", "account_mismatch"],
    [409, "INVITATION_CHANGED", "invitation_changed"],
    [503, "INVITATION_COMPLETION_FAILED", "completion_failed"],
  ] as const)("maps safe existing-invitation error %s", async (status, code, expected) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ code }), { status })),
    )

    await expect(acceptExistingInvitation("synthetic-invitation-proof")).resolves.toEqual({
      error: expected,
    })
  })

  it("falls back to unavailable for an unreadable existing-invitation error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("not-json", { status: 500 })))

    await expect(acceptExistingInvitation("synthetic-invitation-proof")).resolves.toEqual({
      error: "unavailable",
    })
  })

  it("requests password reset with an absolute redirect URL", async () => {
    await requestPasswordReset("maria@example.com")

    expect(authMocks.requestPasswordReset).toHaveBeenCalledWith({
      email: "maria@example.com",
      redirectTo: "http://localhost:3000/reset-password",
    })
  })

  it("delegates the complete recovery and verification lifecycle to Better Auth", async () => {
    await resendVerificationEmail("test-user@example.invalid")
    await resetPassword({ newPassword: "New-password-123!", token: "opaque-test-token" })
    await changePassword({ currentPassword: "old-password-123", newPassword: "New-password-123!" })

    expect(authMocks.sendVerificationEmail).toHaveBeenCalledWith({
      callbackURL: "http://localhost:3000/overview",
      email: "test-user@example.invalid",
    })
    expect(authMocks.resetPassword).toHaveBeenCalledWith({
      newPassword: "New-password-123!",
      token: "opaque-test-token",
    })
    expect(authMocks.changePassword).toHaveBeenCalledWith({
      currentPassword: "old-password-123",
      newPassword: "New-password-123!",
      revokeOtherSessions: true,
    })
  })

  it("uses fixed safe URLs for Google sign-in and account linking", async () => {
    await signInWithGoogle()
    await linkGoogle()
    await unlinkGoogle()
    await listAccounts()

    expect(authMocks.signInSocial).toHaveBeenCalledWith({
      callbackURL: "http://localhost:3000/overview",
      errorCallbackURL: "http://localhost:3000/login?error=provider",
      provider: "google",
    })
    expect(authMocks.linkSocial).toHaveBeenCalledWith({
      callbackURL: "http://localhost:3000/preferences?google=connected",
      errorCallbackURL: "http://localhost:3000/preferences?google=error",
      provider: "google",
    })
    expect(authMocks.unlinkAccount).toHaveBeenCalledWith({ providerId: "google" })
    expect(authMocks.listAccounts).toHaveBeenCalledOnce()
    expect(authMocks.signInSocial.mock.calls[0]?.[0]).not.toHaveProperty("scopes")
    expect(authMocks.linkSocial.mock.calls[0]?.[0]).not.toHaveProperty("scopes")
  })

  it("returns invited Google sign-in to the token acceptance route", async () => {
    await signInWithGoogle("synthetic-invitation-proof")

    expect(authMocks.signInSocial).toHaveBeenCalledWith({
      callbackURL: "http://localhost:3000/accept-invitation?token=synthetic-invitation-proof",
      errorCallbackURL:
        "http://localhost:3000/login?error=provider&invitationToken=synthetic-invitation-proof",
      provider: "google",
    })
  })
})
