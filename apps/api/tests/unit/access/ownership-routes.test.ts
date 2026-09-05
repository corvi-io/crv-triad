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

function transferDatabase(target: { id: string } | null = { id: "membership-admin" }) {
  let updateIndex = 0
  const db = {
    execute: vi.fn(async () => undefined),
    insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    select: vi.fn(() => {
      const chain = {
        from: () => chain,
        limit: async () => (target ? [target] : []),
        where: () => chain,
      }
      return chain
    }),
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(db)),
    update: vi.fn(() => {
      updateIndex += 1
      const chain = {
        returning: vi.fn(async () => (updateIndex === 2 ? [{ id: "membership-admin" }] : [])),
        set: () => chain,
        where: () => chain,
      }
      return chain
    }),
  }
  return db
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

  it("rejects unauthenticated and non-owner actors before database access", async () => {
    const unauthenticated = createOwnershipRoutes(
      {} as never,
      vi.fn(async () => ({ allowed: false, reason: "unauthenticated" })) as never,
    )
    const unauthenticatedResponse = await unauthenticated.handle(
      transferRequest({ confirmed: true, targetMembershipId: "membership-admin" }),
    )
    expect(unauthenticatedResponse.status).toBe(401)

    const nonOwner = createOwnershipRoutes(
      {} as never,
      vi.fn(async () => ({
        allowed: true,
        context: {
          ...(await context(new Date())()).context,
          role: "admin",
        },
      })) as never,
    )
    const nonOwnerResponse = await nonOwner.handle(
      transferRequest({ confirmed: true, targetMembershipId: "membership-owner" }),
    )
    expect(nonOwnerResponse.status).toBe(403)
  })

  it("transfers ownership to an active admin with a fresh confirmed session", async () => {
    const db = transferDatabase()
    const app = createOwnershipRoutes(db as never, context(new Date()) as never)
    const response = await app.handle(
      transferRequest({ confirmed: true, targetMembershipId: "membership-admin" }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "transferred" })
    expect(db.update).toHaveBeenCalledTimes(2)
    expect(db.insert).toHaveBeenCalledTimes(1)
  })

  it("does not transfer ownership when the active admin target is absent", async () => {
    const db = transferDatabase(null)
    const app = createOwnershipRoutes(db as never, context(new Date()) as never)
    const response = await app.handle(
      transferRequest({ confirmed: true, targetMembershipId: "membership-member" }),
    )

    expect(response.status).toBe(404)
    expect(db.update).not.toHaveBeenCalled()
  })
})

function transferRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/access/ownership/transfer", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
}
