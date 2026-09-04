import { afterEach, describe, expect, it, vi } from "vitest"

import { ClientHttpRepository } from "@/modules/clients/http-repository"
import { getContextDestination } from "@/modules/workspace/context-routing"
import {
  type AvailableContexts,
  selectTenantWorkspace,
} from "@/modules/workspace/services/context-client"

const tenant = { id: "tenant-a", name: "Barbearia A", role: "owner" as const }

function contexts(overrides: Partial<AvailableContexts> = {}): AvailableContexts {
  return {
    activeOrganizationId: null,
    platform: null,
    status: "available",
    tenants: [],
    ...overrides,
  }
}

describe("workspace context routing", () => {
  it("selects the only tenant before opening overview", () => {
    expect(getContextDestination(contexts({ tenants: [tenant] }), "/clients")).toBe("/overview")
  })

  it("keeps platform operators out of Studio tenant routes when they have no tenant", () => {
    expect(
      getContextDestination(
        contexts({ platform: { id: "platform", label: "Operações CRV" } }),
        "/overview",
      ),
    ).toBe("/select-workspace")
  })

  it("requires selection for multiple contexts and preserves a confirmed tenant", () => {
    const many = contexts({ tenants: [tenant, { ...tenant, id: "tenant-b" }] })
    expect(getContextDestination(many, "/overview")).toBe("/select-workspace")
    expect(
      getContextDestination({ ...many, activeOrganizationId: "tenant-b" }, "/clients"),
    ).toBeNull()
  })
})

describe("workspace context selection", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("confirms the active tenant through the bounded tenancy endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: "selected" })))
    vi.stubGlobal("fetch", fetchMock)

    await selectTenantWorkspace("tenant-a")

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/contexts/active"),
      expect.objectContaining({
        body: JSON.stringify({ organizationId: "tenant-a" }),
        credentials: "include",
        method: "POST",
      }),
    )
  })
})

describe("ClientHttpRepository", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("uses credentials and never falls back when the server denies access", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ code: "tenant_forbidden" }), { status: 403 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(new ClientHttpRepository().get("foreign-client")).rejects.toThrow("não tem acesso")
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/clients/foreign-client"),
      expect.objectContaining({ credentials: "include" }),
    )
  })
})
