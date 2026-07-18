import { describe, expect, it } from "vitest"

import {
  type AccessPolicyInvitation,
  type AccessPolicyLookup,
  type AccessPolicyUser,
  decideCredentialAccess,
} from "../../../src/identity/access-policy.js"

const now = new Date("2026-06-19T00:00:00Z")

function lookup(input: {
  user?: AccessPolicyUser | null
  invitation?: AccessPolicyInvitation | null
}): AccessPolicyLookup {
  return {
    findUserByEmail: async () => input.user ?? null,
    findPendingInvitationByEmail: async () => input.invitation ?? null,
  }
}

describe("decideCredentialAccess", () => {
  it("allows an existing active user", async () => {
    const decision = await decideCredentialAccess(
      "User@Example.com",
      lookup({
        user: { id: "user-1", email: "user@example.com", status: "active", role: "member" },
      }),
      now,
    )

    expect(decision).toMatchObject({ allowed: true, reason: "active_user" })
  })

  it("allows a matching pending invitation", async () => {
    const decision = await decideCredentialAccess(
      "invite@example.com",
      lookup({
        invitation: {
          id: "invitation-1",
          email: "invite@example.com",
          status: "pending",
          role: "admin",
          expiresAt: new Date("2026-06-20T00:00:00Z"),
        },
      }),
      now,
    )

    expect(decision).toMatchObject({ allowed: true, reason: "pending_invitation" })
  })

  it("blocks a disabled user", async () => {
    const decision = await decideCredentialAccess(
      "disabled@example.com",
      lookup({
        user: { id: "user-1", email: "disabled@example.com", status: "disabled", role: "member" },
      }),
      now,
    )

    expect(decision).toEqual({ allowed: false, reason: "disabled_user" })
  })

  it("blocks unknown credential accounts", async () => {
    const decision = await decideCredentialAccess("unknown@example.com", lookup({}), now)

    expect(decision).toEqual({
      allowed: false,
      reason: "no_active_user_or_pending_invitation",
    })
  })
})
