import { beforeEach, describe, expect, it, vi } from "vitest"

const authMocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  signInEmail: vi.fn(),
  signOut: vi.fn(),
  signUpEmail: vi.fn(),
}))

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    requestPasswordReset: authMocks.requestPasswordReset,
    signIn: {
      email: authMocks.signInEmail,
    },
    signOut: authMocks.signOut,
    signUp: {
      email: authMocks.signUpEmail,
    },
  })),
}))

import {
  requestPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from "@/modules/auth/services/auth-client"

describe("auth client", () => {
  beforeEach(() => {
    authMocks.requestPasswordReset.mockReset()
    authMocks.signInEmail.mockReset()
    authMocks.signUpEmail.mockReset()
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
      redirectTo: "http://localhost:3000/login",
    })
  })
})
