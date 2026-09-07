import { afterEach, describe, expect, it, vi } from "vitest"
import {
  type BackstageClientError,
  createSupportContext,
  createTenant,
  getOperator,
  getSupportWorkspace,
  getTenant,
  getTenantAccess,
  getTenants,
  revokeSupportContext,
  updateTenant,
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

  it("executes the tenant lifecycle and operator contracts", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ id: "tenant/a", status: "active" }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await getOperator()
    await getTenant("tenant/a")
    await updateTenant({
      id: "tenant/a",
      name: "Novo nome",
      reason: "Correção operacional",
      status: "active",
      version: 3,
    })

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      expect.stringContaining("/api/backstage/me"),
      expect.stringContaining("/api/backstage/tenants/tenant%2Fa"),
      expect.stringContaining("/api/backstage/tenants/tenant%2Fa"),
    ])
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          name: "Novo nome",
          reason: "Correção operacional",
          status: "active",
          version: 3,
        }),
        method: "PATCH",
      }),
    )
  })

  it("creates, reads, and revokes a bounded support context", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json(
        String(input).includes("clients")
          ? { items: [], totalCount: 0 }
          : String(input).includes("tenant-summary")
            ? { activeClientCount: 0, activeMemberCount: 1, tenant: { id: "tenant-1" } }
            : { id: "context-1", status: "revoked" },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await createSupportContext({
      durationMinutes: 30,
      organizationId: "tenant-1",
      reason: "Atendimento",
    })
    await expect(
      getSupportWorkspace({ contextId: "context-1", credential: "private" }),
    ).resolves.toMatchObject({
      clients: { totalCount: 0 },
      summary: { activeMemberCount: 1 },
    })
    await revokeSupportContext({ contextId: "context-1", credential: "private" })

    const authorizedCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.headers && JSON.stringify(init.headers).includes("Support private"),
    )
    expect(authorizedCalls).toHaveLength(3)
  })

  it("omits blank inventory searches and maps non-JSON failures safely", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ items: [], page: 1, pageSize: 20, totalCount: 0 }))
      .mockResolvedValueOnce(new Response("gateway", { status: 502 }))
    vi.stubGlobal("fetch", fetchMock)

    await getTenants({ page: 1, search: "   " })
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("search=")
    await expect(getOperator()).rejects.toEqual(
      expect.objectContaining({ code: "unavailable", status: 502 }),
    )
  })
})
