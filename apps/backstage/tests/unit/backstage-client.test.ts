import { afterEach, describe, expect, it, vi } from "vitest"
import {
  type BackstageClientError,
  createTenant,
  getTenantAccess,
  getTenants,
  updateTenantAccess,
} from "@/modules/backstage/backstage-client"

describe("Backstage API client", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("requests a bounded tenant inventory with browser credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], page: 1, pageSize: 20, totalCount: 0 }), {
        status: 200,
      }),
    )
    vi.stubGlobal("fetch", fetchMock)
    await getTenants({ page: 1, search: "Aurora" })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/backstage/inventory?page=1&pageSize=20&search=Aurora"),
      expect.objectContaining({ credentials: "include" }),
    )
  })

  it("preserves the safe API error code for tenant provisioning recovery", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ code: "slug_conflict" }), { status: 409 }),
        ),
    )
    await expect(
      createTenant({
        name: "Aurora",
        ownerEmail: "owner@example.com",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<BackstageClientError>>({
        code: "slug_conflict",
        status: 409,
      }),
    )
  })

  it("leaves slug generation to the Backstage API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          emailDelivery: "sent",
          id: "tenant-a",
          name: "Barbearia Aurora",
          ownerAccess: "invited",
          slug: "barbearia-aurora-a1b2c",
        }),
        { status: 201 },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await createTenant({ name: "Barbearia Aurora", ownerEmail: "owner@example.com" })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/backstage/tenants"),
      expect.objectContaining({
        body: JSON.stringify({ name: "Barbearia Aurora", ownerEmail: "owner@example.com" }),
        method: "POST",
      }),
    )
  })

  it("loads and updates tenant capabilities through the governed access contract", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        capabilities: [{ enabled: true, key: "revenue.read_checkout" }],
        subscriptionVersion: 2,
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await getTenantAccess("tenant-a")
    await updateTenantAccess({
      enabledCapabilities: ["revenue.read_checkout"],
      id: "tenant-a",
      reason: "Habilitação solicitada pela operação",
      subscriptionVersion: 2,
    })

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/backstage/tenants/tenant-a/access"),
      expect.objectContaining({
        credentials: "include",
        method: "PUT",
        body: JSON.stringify({
          enabledCapabilities: ["revenue.read_checkout"],
          reason: "Habilitação solicitada pela operação",
          subscriptionVersion: 2,
        }),
      }),
    )
  })
})
