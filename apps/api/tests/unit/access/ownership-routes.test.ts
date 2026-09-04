import { describe, expect, it, vi } from "vitest"

import { createOwnershipRoutes } from "../../../src/modules/access/http/ownership-routes.js"

function context(authenticatedAt?: Date) {
  return vi.fn(async () => ({
    allowed: true as const,
    context: {
      actorUserId: "user-owner",
      authenticatedAt,
      membershipId: "membership-owner",
      organizationId: "tenant-a",
      organizationName: "Barbearia A",
      role: "owner" as const,
    },
  }))
}

describe("ownership routes", () => {
  it("requires an explicit confirmation", async () => {
    const app = createOwnershipRoutes({} as never, context(new Date()) as never)
    const response = await app.handle(
      new Request("http://localhost/api/access/ownership/transfer", {
        body: JSON.stringify({ targetMembershipId: "membership-admin" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(422)
  })

  it("rejects a transfer from a session older than five minutes", async () => {
    const app = createOwnershipRoutes(
      {} as never,
      context(new Date(Date.now() - 5 * 60 * 1_000)) as never,
    )
    const response = await app.handle(
      new Request("http://localhost/api/access/ownership/transfer", {
        body: JSON.stringify({ confirmed: true, targetMembershipId: "membership-admin" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ code: "recent_authentication_required" })
  })
})
