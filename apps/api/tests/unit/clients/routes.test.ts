import { describe, expect, it, vi } from "vitest"
import {
  ClientNotFoundError,
  ClientQuotaReachedError,
  ClientValidationError,
  ClientVersionConflictError,
} from "../../../src/modules/clients/domain/errors.js"
import { createClientRoutes } from "../../../src/modules/clients/http/routes.js"

const tenantContext = {
  actorUserId: "user-a",
  membershipId: "membership-a",
  organizationId: "tenant-a",
  organizationName: "Barbearia A",
  role: "member" as const,
}

function request(path: string, init?: RequestInit) {
  return new Request(`https://api.example.test${path}`, {
    headers: { "content-type": "application/json", "x-request-id": "request-a" },
    ...init,
  })
}

describe("client routes", () => {
  it("rejects unauthenticated access before calling the client service", async () => {
    const list = vi.fn()
    const app = createClientRoutes(
      { list } as never,
      vi.fn(async () => ({ allowed: false, reason: "unauthenticated" })) as never,
    )

    const response = await app.handle(request("/api/clients"))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ code: "unauthenticated", requestId: "request-a" })
    expect(list).not.toHaveBeenCalled()
  })

  it("passes only the server-resolved organization to list", async () => {
    const list = vi.fn(async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 0,
    }))
    const app = createClientRoutes(
      { list } as never,
      vi.fn(async () => ({ allowed: true, context: tenantContext })) as never,
    )

    const response = await app.handle(request("/api/clients?page=1&pageSize=20"))

    expect(response.status).toBe(200)
    expect(list).toHaveBeenCalledWith(
      "tenant-a",
      expect.objectContaining({ page: "1", pageSize: "20" }),
    )
  })

  it("lists tenant-scoped tag facets for the client filter", async () => {
    const listTags = vi.fn(async () => ["Frequente", "Manhã"])
    const app = createClientRoutes(
      { listTags } as never,
      vi.fn(async () => ({ allowed: true, context: tenantContext })) as never,
    )

    const response = await app.handle(request("/api/clients/tags"))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(["Frequente", "Manhã"])
    expect(listTags).toHaveBeenCalledWith("tenant-a")
  })

  it("returns a stable safe validation error without echoing submitted PII", async () => {
    const app = createClientRoutes(
      {} as never,
      vi.fn(async () => ({ allowed: true, context: tenantContext })) as never,
    )
    const sensitiveName = "Sensitive Client Name"

    const response = await app.handle(
      request("/api/clients", {
        body: JSON.stringify({ name: sensitiveName.repeat(20) }),
        method: "POST",
      }),
    )
    const serialized = await response.text()

    expect(response.status).toBe(400)
    expect(JSON.parse(serialized)).toEqual({ code: "invalid_request", requestId: "request-a" })
    expect(serialized).not.toContain(sensitiveName)
  })

  it("maps the complete tenant-scoped client lifecycle to the service", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z")
    const detail = {
      createdAt: now,
      id: "client-a",
      name: "Cliente A",
      notes: [{ body: "Nota", createdAt: now, id: "note-a", updatedAt: now, version: 1 }],
      status: "active",
      updatedAt: now,
      version: 1,
    }
    const service = {
      addNote: vi.fn(async () => detail),
      create: vi.fn(async () => detail),
      findDuplicates: vi.fn(async () => []),
      get: vi.fn(async () => detail),
      removeNote: vi.fn(async () => detail),
      setArchived: vi.fn(async () => detail),
      update: vi.fn(async () => detail),
      updateNote: vi.fn(async () => detail),
    }
    const authorize = vi.fn(async () => ({ activeClientLimit: 25, allowed: true }))
    const app = createClientRoutes(
      service as never,
      vi.fn(async () => ({ allowed: true, context: tenantContext })) as never,
      authorize as never,
    )

    const cases: Array<[string, RequestInit, keyof typeof service, number]> = [
      [
        "/api/clients",
        { body: JSON.stringify({ name: "Cliente A" }), method: "POST" },
        "create",
        201,
      ],
      [
        "/api/clients/duplicates",
        { body: JSON.stringify({ email: "client@example.com" }), method: "POST" },
        "findDuplicates",
        200,
      ],
      ["/api/clients/client-a", {}, "get", 200],
      [
        "/api/clients/client-a",
        {
          body: JSON.stringify({
            email: "client@example.com",
            name: "Cliente B",
            phone: "81999999999",
            preferenceNote: "Objetivo",
            servicePreferences: [],
            tags: [],
            version: 1,
          }),
          method: "PATCH",
        },
        "update",
        200,
      ],
      [
        "/api/clients/client-a/archive",
        { body: JSON.stringify({ version: 1 }), method: "POST" },
        "setArchived",
        200,
      ],
      [
        "/api/clients/client-a/restore",
        { body: JSON.stringify({ version: 1 }), method: "POST" },
        "setArchived",
        200,
      ],
      [
        "/api/clients/client-a/notes",
        { body: JSON.stringify({ body: "Nota" }), method: "POST" },
        "addNote",
        201,
      ],
      [
        "/api/clients/client-a/notes/note-a",
        { body: JSON.stringify({ body: "Revisada", version: 1 }), method: "PATCH" },
        "updateNote",
        200,
      ],
      [
        "/api/clients/client-a/notes/note-a",
        { body: JSON.stringify({ version: 1 }), method: "DELETE" },
        "removeNote",
        200,
      ],
    ]

    for (const [path, init, method, expectedStatus] of cases) {
      const response = await app.handle(request(path, init))
      expect(
        response.status,
        `${init.method ?? "GET"} ${path}: ${await response.clone().text()}`,
      ).toBe(expectedStatus)
      expect(service[method]).toHaveBeenCalled()
    }
    expect(authorize).toHaveBeenCalledWith(
      tenantContext,
      "clients.manage",
      expect.objectContaining({ consumeClientCapacity: true }),
    )
  })

  it.each([
    [new ClientValidationError({ name: ["invalid"] }), 400, "invalid_request"],
    [new ClientNotFoundError(), 404, "resource_not_found"],
    [new ClientVersionConflictError(), 409, "version_conflict"],
    [new ClientQuotaReachedError(5), 409, "quota_reached"],
    [new Error("private sentinel"), 500, "internal_error"],
  ])("maps service failures to safe responses", async (failure, status, code) => {
    const app = createClientRoutes(
      { get: vi.fn(async () => Promise.reject(failure)) } as never,
      vi.fn(async () => ({ allowed: true, context: tenantContext })) as never,
    )

    const response = await app.handle(request("/api/clients/client-a"))
    const serialized = await response.text()

    expect(response.status).toBe(status)
    expect(JSON.parse(serialized)).toMatchObject({ code, requestId: "request-a" })
    expect(serialized).not.toContain("private sentinel")
  })

  it.each([
    ["permission_denied", 403],
    ["subscription_inactive", 403],
    ["quota_reached", 409],
  ] as const)("maps %s authorization denials without calling the service", async (reason, status) => {
    const get = vi.fn()
    const app = createClientRoutes(
      { get } as never,
      vi.fn(async () => ({ allowed: true, context: tenantContext })) as never,
      vi.fn(async () => ({
        allowed: false,
        quota: reason === "quota_reached" ? { limit: 10, usage: 10 } : undefined,
        reason,
      })) as never,
    )

    const response = await app.handle(request("/api/clients/client-a"))

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ code: reason })
    expect(get).not.toHaveBeenCalled()
  })
})
