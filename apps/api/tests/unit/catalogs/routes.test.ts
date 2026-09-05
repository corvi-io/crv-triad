import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import {
  CatalogError,
  mapCatalogPersistenceError,
} from "../../../src/modules/services/application/catalog-service.js"
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
  it("maps wrapped constraints and schema issues to exact form fields", () => {
    expect(
      mapCatalogPersistenceError({
        cause: { code: "23505", constraint: "services_organization_normalized_name_unique" },
      }),
    ).toMatchObject({ code: "duplicate_name", details: { field: "name" } })
    expect(
      mapCatalogPersistenceError({
        cause: { code: "23505", constraint: "units_organization_normalized_code_unique" },
      }),
    ).toMatchObject({ code: "duplicate_code", details: { field: "code" } })
    expect(
      mapCatalogPersistenceError(
        new z.ZodError([{ code: "custom", message: "invalid", path: ["description"] }]),
      ),
    ).toMatchObject({ code: "invalid_request", details: { field: "description" } })
    expect(mapCatalogPersistenceError({ cause: { code: "22001" } })).toMatchObject({
      code: "invalid_request",
    })
    expect(mapCatalogPersistenceError(null)).toMatchObject({ code: "invalid_request" })
  })
  it("creates a professional only through a tenant invitation", async () => {
    const inviteProfessional = vi.fn(async () => ({
      email: "professional@example.com",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      identityInvitationId: "invitation-a",
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

  it("lists, resends, and revokes tenant-scoped pending professional invitations", async () => {
    const service = {
      listPendingProfessionalInvitations: vi.fn(async () => [
        { email: "professional@example.com", id: "invite-a", status: "pending" as const },
      ]),
      resendProfessionalInvitation: vi.fn(async () => ({
        email: "professional@example.com",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        token: "rotated-token",
      })),
      revokeProfessionalInvitation: vi.fn(async () => ({ id: "invite-a", status: "revoked" })),
    }
    const sendInvitation = vi.fn(async () => "sent" as const)
    const app = createCatalogRoutes(service as never, resolve as never, authorize as never, {
      sendInvitation,
    })

    expect((await app.handle(request("/api/professionals/invitations"))).status).toBe(200)
    expect(
      (
        await app.handle(
          request("/api/professionals/invitations/invite-a/resend", { method: "POST" }),
        )
      ).status,
    ).toBe(200)
    expect(
      (
        await app.handle(
          request("/api/professionals/invitations/invite-a/revoke", { method: "POST" }),
        )
      ).status,
    ).toBe(200)

    expect(service.listPendingProfessionalInvitations).toHaveBeenCalledWith("tenant-a")
    expect(service.resendProfessionalInvitation).toHaveBeenCalledWith("tenant-a", "invite-a")
    expect(service.revokeProfessionalInvitation).toHaveBeenCalledWith("tenant-a", "invite-a")
    expect(sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ email: "professional@example.com", token: "rotated-token" }),
    )
  })

  it("returns safe field metadata for a duplicate catalog value", async () => {
    const app = createCatalogRoutes(
      {
        create: vi.fn(async () => {
          throw new CatalogError("duplicate_name", { field: "name" })
        }),
      } as never,
      resolve as never,
      authorize as never,
    )
    const response = await app.handle(
      request("/api/services/", {
        body: JSON.stringify({ name: "Corte Masculino" }),
        method: "POST",
      }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      code: "duplicate_name",
      details: { field: "name" },
      requestId: "request-a",
    })
  })

  it("revokes an invitation when its email cannot be delivered so it can be retried", async () => {
    const revokeUndeliveredProfessionalInvitation = vi.fn(async () => undefined)
    const app = createCatalogRoutes(
      {
        inviteProfessional: vi.fn(async () => ({
          email: "professional@example.com",
          expiresAt: new Date("2099-01-01T00:00:00.000Z"),
          identityInvitationId: "invitation-a",
          mode: "invited" as const,
          token: "opaque-token",
        })),
        revokeUndeliveredProfessionalInvitation,
      } as never,
      resolve as never,
      authorize as never,
      { sendInvitation: vi.fn(async () => "failed" as const) },
    )

    const response = await app.handle(
      request("/api/professionals/invite", {
        body: JSON.stringify({ email: "professional@example.com" }),
        method: "POST",
      }),
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      code: "invitation_delivery_failed",
      requestId: "request-a",
    })
    expect(revokeUndeliveredProfessionalInvitation).toHaveBeenCalledWith(
      "tenant-a",
      "invitation-a",
      "professional@example.com",
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
    const writeAudit = vi.fn(async (_input: unknown) => undefined)
    const service = {
      get: vi.fn(async () => ({ id: "unit-a" })),
      options: vi.fn(async () => [{ id: "unit-a" }]),
      setArchived: vi.fn(async (_tenant, _kind, _id, archived) => ({ archived })),
      update: vi.fn(async () => ({ id: "unit-a", version: 2 })),
    }
    const app = createCatalogRoutes(
      service as never,
      resolve as never,
      authorize as never,
      undefined,
      writeAudit,
    )

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
    expect(writeAudit).toHaveBeenCalledTimes(3)
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        changedFields: ["address", "businessHours", "code", "name"],
        entityId: "unit-a",
        entityType: "unit",
        requestId: "request-a",
        result: "succeeded",
      }),
    )
  })

  it("audits failed mutations without including request values", async () => {
    const writeAudit = vi.fn(async (_input: unknown) => undefined)
    const app = createCatalogRoutes(
      { update: vi.fn(async () => Promise.reject(new CatalogError("invalid_relation"))) } as never,
      resolve as never,
      authorize as never,
      undefined,
      writeAudit,
    )
    const response = await app.handle(
      request("/api/services/service-a", {
        body: JSON.stringify({ description: "sensitive-sentinel", version: 1 }),
        method: "PATCH",
      }),
    )

    expect(response.status).toBe(400)
    const audited = writeAudit.mock.calls[0]?.[0]
    expect(audited).toMatchObject({ entityId: "service-a", result: "failed" })
    expect(JSON.stringify(audited)).not.toContain("sensitive-sentinel")
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

  it.each([
    ["professionals", "professional"],
    ["services", "service"],
  ] as const)("audits %s creation with its allowlisted fields", async (path, entityType) => {
    const writeAudit = vi.fn(async (_input: unknown) => undefined)
    const app = createCatalogRoutes(
      { create: vi.fn(async () => ({ id: `${entityType}-a` })) } as never,
      resolve as never,
      authorize as never,
      undefined,
      writeAudit,
    )
    expect(
      (
        await app.handle(
          request(`/api/${path}`, { body: JSON.stringify({ name: "Teste" }), method: "POST" }),
        )
      ).status,
    ).toBe(201)
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: `${entityType}-a`, entityType }),
    )
  })
})
