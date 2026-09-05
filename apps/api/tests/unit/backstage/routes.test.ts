import { describe, expect, it, vi } from "vitest"

import { createBackstageRoutes } from "../../../src/modules/backstage/http/routes.js"

function auth(userId?: string) {
  return {
    api: {
      getSession: vi.fn(async () =>
        userId ? { session: { id: "session-a" }, user: { id: userId } } : null,
      ),
    },
  }
}

function database(operator: unknown) {
  return {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => (operator ? [operator] : []) }) }),
    }),
  }
}

function databaseQueue(results: unknown[][]) {
  return {
    select: vi.fn(() => {
      const result = results.shift() ?? []
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        limit: () => chain,
        offset: () => chain,
        orderBy: () => chain,
        // biome-ignore lint/suspicious/noThenProperty: Drizzle query builders are intentionally awaitable.
        then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve),
        where: () => chain,
      }
      return chain
    }),
  }
}

function operationalDatabase(selectResults: unknown[][], updateResults: unknown[][] = []) {
  const db = databaseQueue(selectResults) as ReturnType<typeof databaseQueue> & {
    insert: ReturnType<typeof vi.fn>
    transaction: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  db.insert = vi.fn(() => ({ values: vi.fn(async () => undefined) }))
  db.update = vi.fn(() => {
    const result = updateResults.shift() ?? []
    const chain = {
      returning: vi.fn(async () => result),
      set: () => chain,
      where: () => chain,
    }
    return chain
  })
  db.transaction = vi.fn(async (callback: (tx: typeof db) => unknown) => callback(db))
  return db
}

const activeOperator = { id: "operator-a", role: "system_owner", status: "active" }

describe("Backstage route authority", () => {
  it("requires authentication before exposing operator state", async () => {
    const app = createBackstageRoutes(auth() as never, database(null) as never)
    const response = await app.handle(new Request("http://localhost/api/backstage/me"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ code: "unauthenticated" })
  })

  it("rejects an authenticated identity without an active operator assignment", async () => {
    const app = createBackstageRoutes(auth("user-a") as never, database(null) as never)
    const response = await app.handle(new Request("http://localhost/api/backstage/me"))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ code: "backstage_forbidden" })
  })

  it("returns only bounded operator authority", async () => {
    const app = createBackstageRoutes(
      auth("user-a") as never,
      database({ id: "operator-a", role: "system_owner", status: "active" }) as never,
    )
    const response = await app.handle(new Request("http://localhost/api/backstage/me"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      id: "operator-a",
      role: "system_owner",
      status: "active",
    })
  })

  it("does not expose unexpected database error details", async () => {
    const failingDatabase = {
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => Promise.reject(new Error("sensitive SQL sentinel")) }),
        }),
      }),
    }
    const app = createBackstageRoutes(auth("user-a") as never, failingDatabase as never)
    const response = await app.handle(
      new Request("http://localhost/api/backstage/me", { headers: { "x-request-id": "req-a" } }),
    )
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(body).toBe('{"code":"internal_error","requestId":"req-a"}')
    expect(body).not.toContain("sensitive SQL sentinel")
  })

  it("returns a bounded inventory with normalized pagination and search", async () => {
    const row = {
      activeClientLimit: 100,
      clientCount: 4,
      createdAt: new Date("2026-09-04T12:00:00.000Z"),
      id: "tenant-a",
      memberCount: 2,
      name: "Barbearia A",
      planKey: "manual",
      status: "active",
      subscriptionState: "active",
    }
    const db = databaseQueue([[activeOperator], [{ value: 1 }], [row]])
    const app = createBackstageRoutes(auth("user-a") as never, db as never)

    const response = await app.handle(
      new Request(
        "http://localhost/api/backstage/inventory?page=0&pageSize=99&search=%20Barbearia%20",
      ),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      items: [{ ...row, createdAt: "2026-09-04T12:00:00.000Z" }],
      page: 1,
      pageSize: 50,
      totalCount: 1,
    })
  })

  it("uses inventory pagination defaults when filters are omitted", async () => {
    const app = createBackstageRoutes(
      auth("user-a") as never,
      databaseQueue([[activeOperator], [], []]) as never,
    )

    const response = await app.handle(new Request("http://localhost/api/backstage/inventory"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
    })
  })

  it("returns tenant details and maps a missing tenant to a safe 404", async () => {
    const tenant = {
      activeClientCount: 3,
      activeClientLimit: 20,
      archivedClientCount: 1,
      createdAt: new Date("2026-09-04T12:00:00.000Z"),
      id: "tenant-a",
      memberCount: 2,
      name: "Barbearia A",
      ownerEmail: "owner@example.com",
      ownerName: "Owner",
      planKey: "manual",
      slug: "barbearia-a-abcde",
      status: "active",
      subscriptionState: "active",
      updatedAt: new Date("2026-09-04T12:00:00.000Z"),
      version: 1,
    }
    const found = createBackstageRoutes(
      auth("user-a") as never,
      databaseQueue([[activeOperator], [tenant]]) as never,
    )
    const foundResponse = await found.handle(
      new Request("http://localhost/api/backstage/tenants/tenant-a"),
    )
    expect(foundResponse.status).toBe(200)
    await expect(foundResponse.json()).resolves.toMatchObject({ id: "tenant-a" })

    const missing = createBackstageRoutes(
      auth("user-a") as never,
      databaseQueue([[activeOperator], []]) as never,
    )
    const missingResponse = await missing.handle(
      new Request("http://localhost/api/backstage/tenants/missing", {
        headers: { "x-request-id": "request-a" },
      }),
    )
    expect(missingResponse.status).toBe(404)
    await expect(missingResponse.json()).resolves.toEqual({
      code: "not_found",
      requestId: "request-a",
    })
  })

  it("lists at most one hundred operators after authority is confirmed", async () => {
    const operators = [
      {
        createdAt: new Date(),
        id: "operator-b",
        name: "Operador",
        role: "support",
        status: "active",
      },
    ]
    const app = createBackstageRoutes(
      auth("user-a") as never,
      databaseQueue([[activeOperator], operators]) as never,
    )

    const response = await app.handle(new Request("http://localhost/api/backstage/operators"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject([{ id: "operator-b", role: "support" }])
  })

  it("rejects lifecycle mutation for an operator without the required role", async () => {
    const app = createBackstageRoutes(
      auth("user-a") as never,
      databaseQueue([[{ ...activeOperator, role: "support" }]]) as never,
    )
    const response = await app.handle(
      new Request("http://localhost/api/backstage/tenants", {
        body: JSON.stringify({ name: "Barbearia A", ownerEmail: "owner@example.com" }),
        headers: { "content-type": "application/json", "x-request-id": "request-a" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      code: "backstage_forbidden",
      requestId: "request-a",
    })
  })

  it("requires a valid support credential before exposing tenant data", async () => {
    const missingCredential = createBackstageRoutes(
      auth("user-a") as never,
      databaseQueue([[activeOperator]]) as never,
    )
    const missingResponse = await missingCredential.handle(
      new Request("http://localhost/api/backstage/support-contexts/context-a/tenant-summary"),
    )
    expect(missingResponse.status).toBe(403)
    await expect(missingResponse.json()).resolves.toMatchObject({
      code: "support_context_required",
    })

    const invalidCredential = createBackstageRoutes(
      auth("user-a") as never,
      databaseQueue([[activeOperator], []]) as never,
    )
    const invalidResponse = await invalidCredential.handle(
      new Request("http://localhost/api/backstage/support-contexts/context-a/tenant-summary", {
        headers: { authorization: "Support invalid-token" },
      }),
    )
    expect(invalidResponse.status).toBe(403)
    await expect(invalidResponse.json()).resolves.toMatchObject({ code: "support_context_invalid" })
  })

  it("updates tenant lifecycle state and records the operator action", async () => {
    const updated = { id: "tenant-a", name: "Barbearia Atualizada", status: "disabled", version: 2 }
    const db = operationalDatabase([[activeOperator]], [[updated]])
    const app = createBackstageRoutes(auth("user-a") as never, db as never)

    const response = await app.handle(
      new Request("http://localhost/api/backstage/tenants/tenant-a", {
        body: JSON.stringify({
          name: "Barbearia Atualizada",
          reason: "Solicitação operacional confirmada",
          status: "disabled",
          version: 1,
        }),
        headers: { "content-type": "application/json", "x-request-id": "request-a" },
        method: "PATCH",
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject(updated)
    expect(db.transaction).toHaveBeenCalledOnce()
    expect(db.insert).toHaveBeenCalled()
  })

  it("creates a tenant with immediate ownership for an active identity", async () => {
    const db = operationalDatabase([
      [activeOperator],
      [],
      [{ id: "owner-a", status: "active" }],
      [{ value: 0 }],
      [{ id: "plan-a", key: "manual" }],
      [{ id: "version-a", planId: "plan-a", version: 1 }],
      [{ id: "entitlement-a" }],
    ])
    const app = createBackstageRoutes(auth("user-a") as never, db as never)
    const response = await app.handle(
      new Request("http://localhost/api/backstage/tenants", {
        body: JSON.stringify({ name: "Barbearia A", ownerEmail: "OWNER@example.com" }),
        headers: { "content-type": "application/json", "x-request-id": "request-a" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      emailDelivery: null,
      name: "Barbearia A",
      ownerAccess: "active",
    })
    expect(db.transaction).toHaveBeenCalledOnce()
  })

  it("returns conflict when a tenant lifecycle version is stale", async () => {
    const app = createBackstageRoutes(
      auth("user-a") as never,
      operationalDatabase([[activeOperator]], [[]]) as never,
    )
    const response = await app.handle(
      new Request("http://localhost/api/backstage/tenants/tenant-a", {
        body: JSON.stringify({
          reason: "Solicitação operacional confirmada",
          status: "active",
          version: 1,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ code: "conflict" })
  })

  it("creates a bounded support context for an active tenant", async () => {
    const db = operationalDatabase([[activeOperator], [{ id: "tenant-a" }]])
    const app = createBackstageRoutes(auth("user-a") as never, db as never)
    const response = await app.handle(
      new Request("http://localhost/api/backstage/support-contexts", {
        body: JSON.stringify({
          durationMinutes: 30,
          organizationId: "tenant-a",
          reason: "Investigação solicitada pelo proprietário",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({ organizationId: "tenant-a" })
    expect(db.insert).toHaveBeenCalledTimes(2)
  })

  it("rejects a support reason that is only whitespace", async () => {
    const db = operationalDatabase([[activeOperator]])
    const app = createBackstageRoutes(auth("user-a") as never, db as never)
    const response = await app.handle(
      new Request("http://localhost/api/backstage/support-contexts", {
        body: JSON.stringify({
          durationMinutes: 30,
          organizationId: "tenant-a",
          reason: "          ",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: "invalid_request" })
    expect(db.insert).not.toHaveBeenCalled()
  })

  it("does not create a tenant beyond the active membership limit", async () => {
    const db = operationalDatabase([
      [activeOperator],
      [],
      [{ id: "owner-a", status: "active" }],
      [{ value: 50 }],
    ])
    const app = createBackstageRoutes(auth("user-a") as never, db as never)
    const response = await app.handle(
      new Request("http://localhost/api/backstage/tenants", {
        body: JSON.stringify({ name: "Barbearia A", ownerEmail: "owner@example.com" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ code: "membership_limit_reached" })
  })

  it("reads tenant support summaries and client lists with audit records", async () => {
    const support = { id: "context-a", organizationId: "tenant-a" }
    const headers = { authorization: "Support valid-token", "x-request-id": "request-a" }
    const summaryDb = operationalDatabase([
      [activeOperator],
      [{ support }],
      [{ id: "tenant-a", name: "Barbearia A", status: "active" }],
      [{ value: 2 }],
      [{ value: 4 }],
    ])
    const summaryApp = createBackstageRoutes(auth("user-a") as never, summaryDb as never)
    const summaryResponse = await summaryApp.handle(
      new Request("http://localhost/api/backstage/support-contexts/context-a/tenant-summary", {
        headers,
      }),
    )
    expect(summaryResponse.status).toBe(200)
    await expect(summaryResponse.json()).resolves.toMatchObject({
      activeClientCount: 4,
      activeMemberCount: 2,
    })

    const clientsDb = operationalDatabase([
      [activeOperator],
      [{ support }],
      [{ value: 1 }],
      [{ id: "client-a", name: "Cliente A", status: "active" }],
    ])
    const clientsApp = createBackstageRoutes(auth("user-a") as never, clientsDb as never)
    const clientsResponse = await clientsApp.handle(
      new Request("http://localhost/api/backstage/support-contexts/context-a/clients", { headers }),
    )
    expect(clientsResponse.status).toBe(200)
    await expect(clientsResponse.json()).resolves.toMatchObject({
      page: 1,
      pageSize: 20,
      totalCount: 1,
    })
  })

  it("revokes an active support context and records a high-severity audit", async () => {
    const support = { id: "context-a", organizationId: "tenant-a" }
    const db = operationalDatabase(
      [[activeOperator], [support]],
      [[{ ...support, revokedAt: new Date() }]],
    )
    const app = createBackstageRoutes(auth("user-a") as never, db as never)
    const response = await app.handle(
      new Request("http://localhost/api/backstage/support-contexts/context-a/revoke", {
        headers: { authorization: "Support valid-token" },
        method: "POST",
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ id: "context-a", status: "revoked" })
    expect(db.insert).toHaveBeenCalled()
  })
})
