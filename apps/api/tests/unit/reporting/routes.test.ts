import { describe, expect, it, vi } from "vitest"
import { createReportingRoutes } from "../../../src/modules/reporting/http/routes.js"

const actor = {
  organizationId: "tenant-1",
  organizationName: "Tenant",
  actorUserId: "user-1",
  membershipId: "member-1",
  role: "owner" as const,
}

describe("report delivery retry route", () => {
  it("exposes a capability-gated compatible retry endpoint", async () => {
    const retryDelivery = vi.fn(async () => ({
      id: "report-1",
      status: "ready",
      emailDeliveryStatus: "pending",
    }))
    const authorize = vi.fn(async () => ({ allowed: true as const }))
    const app = createReportingRoutes(
      {} as never,
      { retryDelivery } as never,
      async () => ({ allowed: true as const, context: actor }),
      authorize as never,
      true,
    )
    const response = await app.handle(
      new Request("http://localhost/api/reports/generated/report-1/delivery/retry", {
        method: "POST",
      }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      status: "ready",
      emailDeliveryStatus: "pending",
    })
    expect(retryDelivery).toHaveBeenCalledWith(actor, "report-1")
    expect(authorize).toHaveBeenCalledWith(actor, "reports.export")
  })

  it("serves the complete report HTTP contract", async () => {
    const service = { summary: vi.fn(async () => ({ summary: { receiptCount: 1 } })) }
    const exports = {
      catalog: vi.fn(async () => [{ type: "sales_revenue" }]),
      history: vi.fn(async () => [{ id: "report-1" }]),
      status: vi.fn(async (_actor, id: string) => (id === "missing" ? null : { id })),
      request: vi.fn(async () => ({ id: "report-2" })),
      retry: vi.fn(async () => ({ id: "report-1", status: "queued" })),
      retryDelivery: vi.fn(async () => ({ id: "report-1" })),
      download: vi.fn(async (_actor, id: string) => (id === "missing" ? null : "https://download")),
      readLocalArtifact: vi.fn(async (key: string) =>
        key.endsWith("missing.csv")
          ? null
          : { body: "header\nvalue", contentType: "text/csv; charset=utf-8" },
      ),
    }
    const app = createReportingRoutes(
      service as never,
      exports as never,
      async () => ({ allowed: true as const, context: actor }),
      async () => ({ allowed: true as const }),
    )

    const cases: Array<[string, string, number, unknown?]> = [
      ["GET", "/api/reports/summary?from=2026-09-01&to=2026-09-07", 200],
      ["GET", "/api/reports/catalog", 200],
      ["GET", "/api/reports/generated", 200],
      ["GET", "/api/reports/generated/report-1", 200],
      ["GET", "/api/reports/generated/missing", 404],
      ["POST", "/api/reports/generated", 200, { reportType: "sales_revenue" }],
      ["POST", "/api/reports/generated/report-1/retry", 200],
      ["POST", "/api/reports/generated/report-1/delivery/retry", 200],
      ["GET", "/api/reports/generated/report-1/download", 200],
      ["GET", "/api/reports/generated/missing/download", 404],
      ["GET", "/api/reports/local-artifacts/tenants%2Ftenant-1%2Freports%2Freport.csv", 200],
      ["GET", "/api/reports/local-artifacts/tenants%2Ftenant-1%2Freports%2Fmissing.csv", 404],
      ["GET", "/api/reports/local-artifacts/tenants%2Ftenant-2%2Freports%2Freport.csv", 404],
    ]
    for (const [method, path, status, body] of cases) {
      const response = await app.handle(
        new Request(`http://localhost${path}`, {
          method,
          ...(body
            ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
            : {}),
        }),
      )
      expect(response.status, `${method} ${path}`).toBe(status)
    }
    expect(service.summary).toHaveBeenCalled()
    expect(exports.readLocalArtifact).toHaveBeenCalled()
  })

  it.each([
    ["unauthenticated", 401],
    ["tenant_forbidden", 403],
  ] as const)("maps resolver denial %s", async (reason, status) => {
    const app = createReportingRoutes(
      {} as never,
      {} as never,
      async () => ({ allowed: false as const, reason }),
      vi.fn() as never,
    )
    const response = await app.handle(new Request("http://localhost/api/reports/catalog"))
    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ code: reason })
  })

  it("maps capability denial and known export conflicts", async () => {
    const denied = createReportingRoutes(
      {} as never,
      {} as never,
      async () => ({ allowed: true as const, context: actor }),
      async () => ({ allowed: false as const, reason: "capability_forbidden" }),
    )
    expect((await denied.handle(new Request("http://localhost/api/reports/catalog"))).status).toBe(
      403,
    )

    for (const code of ["requester_email_unverified", "idempotency_conflict"]) {
      const app = createReportingRoutes(
        {} as never,
        {
          request: vi.fn(async () => {
            throw new Error(code)
          }),
        } as never,
        async () => ({ allowed: true as const, context: actor }),
        async () => ({ allowed: true as const }),
      )
      const response = await app.handle(
        new Request("http://localhost/api/reports/generated", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
      )
      expect(response.status).toBe(409)
      expect(await response.json()).toEqual({ code })
    }
  })

  it("returns service unavailable for disabled exports", async () => {
    const app = createReportingRoutes(
      {} as never,
      {} as never,
      async () => ({ allowed: true as const, context: actor }),
      async () => ({ allowed: true as const }),
      false,
    )
    for (const path of [
      "/api/reports/generated",
      "/api/reports/generated/report-1/retry",
      "/api/reports/generated/report-1/delivery/retry",
    ]) {
      const response = await app.handle(
        new Request(`http://localhost${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: path.endsWith("generated") ? "{}" : undefined,
        }),
      )
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ code: "report_export_unavailable" })
    }
  })

  it("handles missing delivery retry and unexpected validation errors", async () => {
    const app = createReportingRoutes(
      {
        summary: vi.fn(async () => {
          throw new Error("boom")
        }),
      } as never,
      { retryDelivery: vi.fn(async () => null) } as never,
      async () => ({ allowed: true as const, context: actor }),
      async () => ({ allowed: true as const }),
    )
    const missing = await app.handle(
      new Request("http://localhost/api/reports/generated/missing/delivery/retry", {
        method: "POST",
      }),
    )
    expect(missing.status).toBe(404)
    const invalid = await app.handle(new Request("http://localhost/api/reports/summary"))
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toEqual({ code: "invalid_request" })
  })

  it("does not expose local artifacts when the provider is unavailable", async () => {
    const app = createReportingRoutes(
      {} as never,
      {} as never,
      async () => ({ allowed: true as const, context: actor }),
      async () => ({ allowed: true as const }),
    )
    const response = await app.handle(
      new Request(
        "http://localhost/api/reports/local-artifacts/tenants%2Ftenant-1%2Freports%2Freport.csv",
      ),
    )
    expect(response.status).toBe(404)
  })
})
