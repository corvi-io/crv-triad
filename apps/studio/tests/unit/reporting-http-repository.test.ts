import { afterEach, describe, expect, it, vi } from "vitest"
import { ReportingHttpRepository } from "@/modules/reporting/http-repository"

afterEach(() => vi.unstubAllGlobals())

describe("production reporting HTTP adapter", () => {
  it("maps bounded aggregates and keeps every accepted report surface", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({
          coverage: { customers: "partial", cash: "partial" },
          summary: {
            receiptCount: 2,
            netRevenueCents: 12000,
            performedItems: 3,
            grossCents: 13000,
            commissionCents: 3000,
            barbershopShareCents: 9000,
            reversalCount: 1,
          },
        }),
      ),
    )
    const result = await new ReportingHttpRepository().getReport({
      scenarioId: "production",
      filters: { from: "2026-09-01", to: "2026-09-06", unitId: "unit-a", paymentMethod: "pix" },
    })
    expect(result.summary).toEqual({
      paidSaleCount: 2,
      performedServiceCount: 3,
      totalCommissionCents: 3000,
      totalRevenueCents: 12000,
    })
    expect(result.averageTicket.ticketCents).toBe(6000)
    expect(result.customers.unavailableReason).toMatch(/parcialmente/)
    expect(String((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain("unitId=unit-a")
  })

  it("creates, retries, lists and requests a short-lived download", async () => {
    const fetch = vi.fn(async (raw: string | URL | Request, options?: RequestInit) => {
      const url = String(raw)
      if (url.endsWith("/download")) return json({ url: "https://private.invalid/object" })
      if (options?.method === "POST" || url.endsWith("/generated"))
        return json(options?.method === "POST" ? report : [report])
      return json(report)
    })
    vi.stubGlobal("fetch", fetch)
    const repository = new ReportingHttpRepository()
    await repository.createExport({
      format: "pdf",
      filters: { from: "2026-09-01", to: "2026-09-06" },
      idempotencyKey: "018e90d8-31f8-7a65-9d01-7dd1876d4400",
      reportType: "sales_revenue",
    })
    await expect(repository.listExports()).resolves.toEqual([report])
    await expect(repository.retryExport(report.id)).resolves.toEqual(report)
    await expect(repository.retryExportDelivery(report.id)).resolves.toEqual(report)
    await expect(repository.downloadExport(report.id)).resolves.toBe(
      "https://private.invalid/object",
    )
    const createBody = JSON.parse(String((fetch.mock.calls[0][1] as RequestInit).body))
    expect(createBody).toMatchObject({
      format: "pdf",
      timezone: expect.any(String),
      idempotencyKey: "018e90d8-31f8-7a65-9d01-7dd1876d4400",
      reportType: "sales_revenue",
    })
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith("/delivery/retry"))).toBe(true)
  })

  it("loads the typed catalog and verified masked requester contract", async () => {
    const catalog = {
      items: [],
      requester: { maskedEmail: "ma••••@exemplo.com", verified: true as const },
      schemaVersion: 1 as const,
    }
    const fetch = vi.fn(async () => json(catalog))
    vi.stubGlobal("fetch", fetch)

    await expect(new ReportingHttpRepository().getExportCatalog()).resolves.toEqual(catalog)
    expect(String((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain(
      "/api/reports/catalog",
    )
  })

  it.each([
    [403, "forbidden", "permissão"],
    [503, "unavailable", "indisponível"],
    [400, "invalid_request", "filtros"],
    [500, "unexpected", "concluir"],
  ])("classifies HTTP %i without leaking provider details", async (status, code, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code }), {
            status,
            headers: { "content-type": "application/json" },
          }),
      ),
    )
    await expect(new ReportingHttpRepository().listExports()).rejects.toThrow(message)
  })
})

const report = {
  id: "report-a",
  format: "pdf" as const,
  status: "failed" as const,
  activeAttempt: 1,
  createdAt: "2026-09-06T10:00:00Z",
}
function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}
