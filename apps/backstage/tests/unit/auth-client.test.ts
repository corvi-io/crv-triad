import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  sendVerificationEmail: vi.fn(),
  signInSocial: vi.fn(),
  changePassword: vi.fn(),
  listAccounts: vi.fn(),
  linkSocial: vi.fn(),
  unlinkAccount: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    signIn: { email: auth.signInEmail, social: auth.signInSocial },
    requestPasswordReset: auth.requestPasswordReset,
    resetPassword: auth.resetPassword,
    sendVerificationEmail: auth.sendVerificationEmail,
    changePassword: auth.changePassword,
    listAccounts: auth.listAccounts,
    linkSocial: auth.linkSocial,
    unlinkAccount: auth.unlinkAccount,
    signOut: auth.signOut,
  }),
}))

import {
  acceptInvitation,
  changePassword,
  getApiUrl,
  linkGoogle,
  listAccounts,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  resolveInvitation,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  unlinkGoogle,
} from "@/modules/auth/services/auth-client"

describe("Backstage auth client", () => {
  beforeEach(() => {
    for (const mock of Object.values(auth)) mock.mockResolvedValue({ ok: true })
  })
  afterEach(() => vi.unstubAllGlobals())

  it("builds browser-safe callback URLs for every Better Auth operation", async () => {
    await signInWithEmail({ email: "operator@example.com", password: "secret" })
    await requestPasswordReset("operator@example.com")
    await resetPassword({ newPassword: "new-secret", token: "token" })
    await resendVerificationEmail("operator@example.com")
    await signInWithGoogle()
    await changePassword({ currentPassword: "old", newPassword: "new" })
    await listAccounts()
    await linkGoogle()
    await unlinkGoogle()
    await signOut()

    expect(auth.signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: "http://localhost:3003/barbershops" }),
    )
    expect(auth.requestPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ redirectTo: "http://localhost:3003/reset-password" }),
    )
    expect(auth.resetPassword).toHaveBeenCalledWith({ newPassword: "new-secret", token: "token" })
    expect(auth.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: "http://localhost:3003/login?verified=true" }),
    )
    expect(auth.signInSocial).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }))
    expect(auth.changePassword).toHaveBeenCalledWith(
      expect.objectContaining({ revokeOtherSessions: true }),
    )
    expect(auth.listAccounts).toHaveBeenCalled()
    expect(auth.linkSocial).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }))
    expect(auth.unlinkAccount).toHaveBeenCalledWith({ providerId: "google" })
    expect(auth.signOut).toHaveBeenCalled()
    expect(getApiUrl("/health")).toBe("http://localhost:8000/health")
  })

  it("resolves invitations without leaking the token in the URL", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ state: "valid" }),
    )
    vi.stubGlobal("fetch", fetchMock)
    await expect(resolveInvitation("private-token")).resolves.toEqual({ state: "valid" })
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/invitations/resolve",
      expect.objectContaining({
        body: JSON.stringify({ token: "private-token" }),
        credentials: "include",
        method: "POST",
        referrerPolicy: "no-referrer",
      }),
    )
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("private-token")
  })

  it("fails closed when invitation resolution is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    )
    await expect(resolveInvitation("token")).rejects.toThrow("Invitation resolution unavailable")
  })

  it.each([
    ["PASSWORD_POLICY_REJECTED", "password_policy"],
    ["INVALID_INVITATION_PROOF", "invalid_invitation"],
    ["UNKNOWN", "unavailable"],
  ])("maps invitation acceptance code %s to %s", async (code, expected) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ code }, { status: 400 })),
    )
    await expect(acceptInvitation({ password: "secret", token: "token" })).resolves.toEqual({
      error: expected,
    })
  })

  it("accepts an invitation and tolerates a non-JSON failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    )
    await expect(acceptInvitation({ password: "secret", token: "token" })).resolves.toEqual({
      status: true,
    })

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad gateway", { status: 502 })),
    )
    await expect(acceptInvitation({ password: "secret", token: "token" })).resolves.toEqual({
      error: "unavailable",
    })
  })
})
