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
  acceptInvitation,
  changePassword,
  linkGoogle,
  listAccounts,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  resolveInvitation,
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
      callbackURL: "http://localhost:3000/login?verified=true",
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
})
