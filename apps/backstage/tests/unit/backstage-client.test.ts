import { afterEach, describe, expect, it, vi } from "vitest"
import {
  type BackstageClientError,
  createTenant,
  getTenants,
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
})
