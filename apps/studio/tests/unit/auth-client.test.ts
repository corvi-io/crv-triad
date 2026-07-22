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
  signUpEmail: vi.fn(),
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
    signUp: {
      email: authMocks.signUpEmail,
    },
    unlinkAccount: authMocks.unlinkAccount,
  })),
}))

import {
  changePassword,
  linkGoogle,
  listAccounts,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  unlinkGoogle,
} from "@/modules/auth/services/auth-client"

describe("auth client", () => {
  beforeEach(() => {
    authMocks.requestPasswordReset.mockReset()
    authMocks.resetPassword.mockReset()
    authMocks.sendVerificationEmail.mockReset()
    authMocks.signInEmail.mockReset()
    authMocks.signInSocial.mockReset()
    authMocks.signUpEmail.mockReset()
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

  it("creates invited accounts with email and password", async () => {
    await signUpWithEmail({
      email: "maria@example.com",
      name: "Maria",
      password: "password-123",
    })

    expect(authMocks.signUpEmail).toHaveBeenCalledWith({
      callbackURL: "http://localhost:3000/overview",
      email: "maria@example.com",
      name: "Maria",
      password: "password-123",
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
    await resetPassword({ newPassword: "new-password-123", token: "opaque-test-token" })
    await changePassword({ currentPassword: "old-password-123", newPassword: "new-password-123" })

    expect(authMocks.sendVerificationEmail).toHaveBeenCalledWith({
      callbackURL: "http://localhost:3000/login?verified=true",
      email: "test-user@example.invalid",
    })
    expect(authMocks.resetPassword).toHaveBeenCalledWith({
      newPassword: "new-password-123",
      token: "opaque-test-token",
    })
    expect(authMocks.changePassword).toHaveBeenCalledWith({
      currentPassword: "old-password-123",
      newPassword: "new-password-123",
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
