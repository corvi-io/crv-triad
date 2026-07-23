import { describe, expect, it, vi } from "vitest"

import {
  consumeInvitationProof,
  resolveInvitationProof,
} from "../../../src/identity/invitation-proof.js"
import { createInvitationSecret } from "../../../src/identity/invitations.js"

describe("invitation proof transaction seam", () => {
  it("resolves through the active adapter without retaining the raw proof", async () => {
    const secret = createInvitationSecret()
    const findOne = vi.fn(async () => ({
      email: "recipient@example.invalid",
      expiresAt: new Date("2099-01-01T00:00:00Z"),
      id: "invitation-id",
      role: "member",
      status: "pending",
      tokenIssuedAt: new Date("2098-12-31T00:00:00Z"),
    }))
    const context = {
      body: { invitationToken: secret.token },
      context: { adapter: { findOne } },
      path: "/sign-up/email",
    }

    await expect(
      resolveInvitationProof(context as never, secret.token, new Date("2098-12-31T12:00:00Z")),
    ).resolves.toMatchObject({ id: "invitation-id", role: "member" })
    expect(JSON.stringify(findOne.mock.calls)).not.toContain(secret.token)
  })

  it("uses one conditional update as the invitation consumption race gate", async () => {
    const secret = createInvitationSecret()
    let available = true
    const updateMany = vi.fn(async () => {
      if (!available) return 0
      available = false
      return 1
    })
    const context = {
      body: { invitationToken: secret.token },
      context: { adapter: { updateMany } },
      path: "/sign-up/email",
    }

    const outcomes = await Promise.all([
      consumeInvitationProof(
        context as never,
        secret.token,
        "native-user-id",
        new Date("2098-12-31T12:00:00Z"),
      ),
      consumeInvitationProof(
        context as never,
        secret.token,
        "second-native-user-id",
        new Date("2098-12-31T12:00:00Z"),
      ),
    ])
    expect(outcomes.sort()).toEqual([false, true])
    expect(updateMany).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(updateMany.mock.calls)).not.toContain(secret.token)
  })
})
