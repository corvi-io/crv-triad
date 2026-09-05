import { describe, expect, it, vi } from "vitest"
import { CatalogError } from "../../../src/modules/services/application/catalog-service.js"
import { createCatalogRoutes } from "../../../src/modules/services/http/catalog-routes.js"

const context = {
  actorUserId: "user-a",
  membershipId: "member-a",
  organizationId: "tenant-a",
  organizationName: "Tenant A",
  role: "owner" as const,
}
const resolve = vi.fn(async () => ({ allowed: true as const, context }))
const authorize = vi.fn(async () => ({ allowed: true as const }))
function request(path: string, init?: RequestInit) {
  return new Request(`https://api.test${path}`, {
    headers: { "content-type": "application/json", "x-request-id": "request-a" },
    ...init,
  })
}

describe("catalog routes", () => {
  it("creates a professional only through a tenant invitation", async () => {
    const inviteProfessional = vi.fn(async () => ({
      email: "professional@example.com",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      mode: "invited" as const,
      token: "opaque-token",
    }))
    const sendInvitation = vi.fn(async () => "sent" as const)
    const app = createCatalogRoutes(
      { inviteProfessional } as never,
      resolve as never,
      authorize as never,
      { sendInvitation },
    )

    const response = await app.handle(
      request("/api/professionals/invite", {
        body: JSON.stringify({
          commissionBasisPoints: 4_000,
          email: "professional@example.com",
          role: "Barbeiro",
          serviceIds: [],
          specialties: ["Corte"],
          unitIds: [],
        }),
        method: "POST",
      }),
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ emailDelivery: "sent", status: "pending" })
    expect(inviteProfessional).toHaveBeenCalledWith(
      "tenant-a",
      "user-a",
      expect.objectContaining({ email: "professional@example.com" }),
    )
    expect(sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "professional@example.com",
        role: "member",
        token: "opaque-token",
      }),
    )
  })

  it("scopes reads and mutations to the server tenant with distinct capabilities", async () => {
    const service = {
      create: vi.fn(async () => ({ id: "unit-a" })),
      list: vi.fn(async () => ({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 })),
      options: vi.fn(async () => []),
    }
    const app = createCatalogRoutes(service as never, resolve as never, authorize as never)
    expect((await app.handle(request("/api/units?page=1"))).status).toBe(200)
    expect(
      (
        await app.handle(
          request("/api/units", { body: JSON.stringify({ name: "Centro" }), method: "POST" }),
        )
      ).status,
    ).toBe(201)
    expect(service.list).toHaveBeenCalledWith(
      "tenant-a",
      "unit",
      expect.objectContaining({ page: "1" }),
    )
    expect(service.create).toHaveBeenCalledWith("tenant-a", "unit", expect.anything())
    expect(authorize).toHaveBeenCalledWith(context, "catalogs.read")
    expect(authorize).toHaveBeenCalledWith(context, "catalogs.manage")
  })

  it("returns safe stable errors without leaking failures", async () => {
    const app = createCatalogRoutes(
      {
        get: vi.fn(async () => {
          throw new CatalogError("version_conflict")
        }),
      } as never,
      resolve as never,
      authorize as never,
    )
    const response = await app.handle(request("/api/services/service-a"))
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ code: "version_conflict", requestId: "request-a" })
  })

  it("does not call the service when tenant context is unavailable", async () => {
    const list = vi.fn()
    const app = createCatalogRoutes(
      { list } as never,
      vi.fn(async () => ({ allowed: false, reason: "unauthenticated" })) as never,
      authorize as never,
    )
    const response = await app.handle(request("/api/professionals"))
    expect(response.status).toBe(401)
    expect(list).not.toHaveBeenCalled()
  })

  it("composes detail, option, update, archive, and restore routes", async () => {
    const service = {
      get: vi.fn(async () => ({ id: "unit-a" })),
      options: vi.fn(async () => [{ id: "unit-a" }]),
      setArchived: vi.fn(async (_tenant, _kind, _id, archived) => ({ archived })),
      update: vi.fn(async () => ({ id: "unit-a", version: 2 })),
    }
    const app = createCatalogRoutes(service as never, resolve as never, authorize as never)

    expect((await app.handle(request("/api/units/options?search=Centro"))).status).toBe(200)
    expect((await app.handle(request("/api/units/unit-a"))).status).toBe(200)
    expect(
      (
        await app.handle(
          request("/api/units/unit-a", {
            body: JSON.stringify({ name: "Centro", version: 1 }),
            method: "PATCH",
          }),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await app.handle(
          request("/api/units/unit-a/archive", {
            body: JSON.stringify({ version: 1 }),
            method: "POST",
          }),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await app.handle(
          request("/api/units/unit-a/restore", {
            body: JSON.stringify({ version: 2 }),
            method: "POST",
          }),
        )
      ).status,
    ).toBe(200)
    expect(service.update).toHaveBeenCalledWith("tenant-a", "unit", "unit-a", 1, {
      name: "Centro",
    })
    expect(service.setArchived).toHaveBeenCalledWith("tenant-a", "unit", "unit-a", true, 1)
    expect(service.setArchived).toHaveBeenCalledWith("tenant-a", "unit", "unit-a", false, 2)
  })

  it("maps forbidden, not-found, validation, and unexpected failures safely", async () => {
    const forbidden = createCatalogRoutes(
      { list: vi.fn() } as never,
      resolve as never,
      vi.fn(async () => ({ allowed: false, reason: "insufficient_role" })) as never,
    )
    expect((await forbidden.handle(request("/api/units"))).status).toBe(403)

    const notFound = createCatalogRoutes(
      { get: vi.fn(async () => Promise.reject(new CatalogError("not_found"))) } as never,
      resolve as never,
      authorize as never,
    )
    expect((await notFound.handle(request("/api/units/missing"))).status).toBe(404)

    const unexpected = createCatalogRoutes(
      { get: vi.fn(async () => Promise.reject(new Error("private database detail"))) } as never,
      resolve as never,
      authorize as never,
    )
    const response = await unexpected.handle(request("/api/units/unit-a"))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ code: "internal_error", requestId: "request-a" })

    const invalid = createCatalogRoutes(
      { update: vi.fn() } as never,
      resolve as never,
      authorize as never,
    )
    expect(
      (
        await invalid.handle(
          request("/api/units/unit-a", { body: JSON.stringify({ version: 0 }), method: "PATCH" }),
        )
      ).status,
    ).toBe(400)
  })

  it("rejects the invitation endpoint for non-professional catalogs", async () => {
    const app = createCatalogRoutes({} as never, resolve as never, authorize as never)
    const response = await app.handle(
      request("/api/services/invite", { body: JSON.stringify({}), method: "POST" }),
    )
    expect(response.status).toBe(404)
  })
})
