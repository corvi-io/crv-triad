import { describe, expect, it, vi } from "vitest"

import { createReportingService } from "../../../src/modules/reporting/application/reporting-service.js"

const actor = { organizationId: "tenant-1" } as never
const filters = { from: "2026-09-01", to: "2026-09-07" }

function database(...rows: Record<string, string>[][]) {
  const execute = vi.fn()
  for (const result of rows) execute.mockResolvedValueOnce({ rows: result })
  return { db: { execute } as never, execute }
}

describe("reporting service", () => {
  it("validates report periods before querying", async () => {
    const { db, execute } = database()
    const service = createReportingService(db)

    await expect(service.summary(actor, { from: "2026-09-08", to: "2026-09-07" })).rejects.toThrow(
      "range_too_large",
    )
    await expect(
      service.report(
        actor,
        "sales_revenue",
        { from: "2025-01-01", to: "2026-09-07" },
        {
          reportType: "sales_revenue",
          filters,
          timezone: "America/Recife",
          includeReversals: true,
        },
      ),
    ).rejects.toThrow("range_too_large")
    expect(execute).not.toHaveBeenCalled()
  })

  it("maps the operational summary and safe empty aggregates", async () => {
    const populated = database([
      {
        receipt_count: "3",
        net_revenue_cents: "12000",
        performed_items: "4",
        gross_cents: "14000",
        commission_cents: "3000",
        barbershop_share_cents: "9000",
        reversal_count: "1",
      },
    ])
    await expect(
      createReportingService(populated.db).summary(actor, filters),
    ).resolves.toMatchObject({
      summary: { receiptCount: 3, netRevenueCents: 12000, reversalCount: 1 },
      coverage: { revenue: "complete", commissions: "complete" },
    })

    const empty = database([])
    await expect(createReportingService(empty.db).summary(actor, filters)).resolves.toMatchObject({
      summary: {
        receiptCount: 0,
        netRevenueCents: 0,
        performedItems: 0,
        grossCents: 0,
        commissionCents: 0,
        barbershopShareCents: 0,
        reversalCount: 0,
      },
    })
  })

  it("compares sales with the previous equal-length period and applies reversals", async () => {
    const { db } = database(
      [{ sales: "2", services: "3", gross: "15000", net: "12000", refunds: "2000" }],
      [{ sales: "1", services: "1", gross: "5000", net: "5000", refunds: "500" }],
    )
    const rows = await createReportingService(db).report(actor, "sales_revenue", filters, {
      reportType: "sales_revenue",
      filters,
      timezone: "America/Recife",
      includeReversals: true,
    })
    expect(rows).toEqual(
      expect.arrayContaining([
        ["Receita líquida (centavos)", "10000"],
        ["Ticket médio (centavos)", "6000"],
        ["Período anterior — receita líquida (centavos)", "4500"],
        ["Variação contra período anterior (centavos)", "5500"],
      ]),
    )
  })

  it("supports sales without reversals and empty database results", async () => {
    const { db } = database([], [])
    const rows = await createReportingService(db).report(actor, "sales_revenue", filters, {
      reportType: "sales_revenue",
      filters,
      timezone: "America/Recife",
      includeReversals: false,
    })
    expect(rows).toEqual(
      expect.arrayContaining([
        ["Ticket médio (centavos)", "0"],
        ["Estornos (centavos)", "0"],
      ]),
    )
  })

  it.each([
    "revenue",
    "appointments",
  ] as const)("renders professional performance ranked by %s", async (ranking) => {
    const { db } = database([
      {
        professional_id: "professional-1",
        professional_name: "Ana",
        completed_appointments: "4",
        cancelled: "1",
        no_shows: "2",
        sales: ranking === "revenue" ? "2" : "0",
        revenue: "10000",
      },
    ])
    const rows = await createReportingService(db).report(
      actor,
      "professional_performance",
      filters,
      {
        reportType: "professional_performance",
        filters,
        timezone: "America/Recife",
        ranking,
      },
    )
    expect(rows).toContainEqual(["Ana — agendamentos concluídos", "4"])
    expect(rows).toContainEqual([
      "Ana — ticket médio (centavos)",
      ranking === "revenue" ? "5000" : "0",
    ])
  })

  it.each([
    true,
    false,
  ])("renders commission aggregates with includeReversals=%s", async (includeReversals) => {
    const { db } = database([
      {
        professional_id: "professional-1",
        professional_name: "Bia",
        facts: "5",
        reversals: "1",
        service_revenue: "20000",
        commission: "6000",
        barbershop: "14000",
      },
    ])
    const rows = await createReportingService(db).report(actor, "commissions", filters, {
      reportType: "commissions",
      filters,
      timezone: "America/Recife",
      includeReversals,
    })
    expect(rows).toContainEqual(["Bia — comissão (centavos)", "6000"])
    expect(rows).toContainEqual(["Bia — estornos", "1"])
  })

  it("classifies new, returning, and unidentified customers", async () => {
    const { db } = database([{ new_count: "3", returning_count: "1", unknown_count: "2" }])
    const rows = await createReportingService(db).report(
      actor,
      "new_returning_customers",
      filters,
      {
        reportType: "new_returning_customers",
        filters,
        timezone: "America/Recife",
        customerDefinition: "first_completed_receipt_in_tenant",
      },
    )
    expect(rows).toEqual(
      expect.arrayContaining([
        ["Clientes únicos identificados", "4"],
        ["Novos (basis points)", "7500"],
        ["Recorrentes (basis points)", "2500"],
      ]),
    )
  })

  it("returns zero customer rates without identifiable customers", async () => {
    const { db } = database([])
    const rows = await createReportingService(db).report(
      actor,
      "new_returning_customers",
      filters,
      {
        reportType: "new_returning_customers",
        filters,
        timezone: "America/Recife",
        customerDefinition: "first_completed_receipt_in_tenant",
      },
    )
    expect(rows).toContainEqual(["Novos (basis points)", "0"])
  })

  it.each([
    [true, true, true, true],
    [false, false, false, false],
  ] as const)("honors cancellation visibility (%s, %s)", async (includeCancelled, includeNoShows, showsCancelled, showsNoShows) => {
    const { db } = database([
      { cancelled: "2", no_shows: "1", denominator: "10", affected_value: "9000" },
    ])
    const rows = await createReportingService(db).report(actor, "cancellations_no_shows", filters, {
      reportType: "cancellations_no_shows",
      filters,
      timezone: "America/Recife",
      includeCancelled,
      includeNoShows,
    })
    expect(rows.some(([label]) => label === "Cancelamentos")).toBe(showsCancelled)
    expect(rows.some(([label]) => label === "Ausências")).toBe(showsNoShows)
    expect(rows).toContainEqual(["Taxa de ausência (basis points)", "1000"])
  })

  it.each([
    true,
    false,
  ])("renders payment reconciliation with includeReversals=%s", async (includeReversals) => {
    const { db } = database([
      {
        method: "pix",
        receipts: "2",
        reversals: "1",
        gross: "8000",
        reversed: "2000",
        net: "6000",
      },
      {
        method: "voucher",
        receipts: "1",
        reversals: "0",
        gross: "1000",
        reversed: "0",
        net: "1000",
      },
    ])
    const rows = await createReportingService(db).report(actor, "cash_payments", filters, {
      reportType: "cash_payments",
      filters,
      timezone: "America/Recife",
      includeReversals,
    })
    expect(rows).toContainEqual(["Pix — líquido (centavos)", "6000"])
    expect(rows).toContainEqual(["voucher — recibos", "1"])
  })

  it("accepts every supported filter when composing report queries", async () => {
    const allFilters = {
      ...filters,
      unitId: "unit-1",
      professionalId: "professional-1",
      serviceId: "service-1",
      paymentMethod: "credit" as const,
    }
    const { db } = database([], [])
    await createReportingService(db).report(actor, "sales_revenue", allFilters, {
      reportType: "sales_revenue",
      filters: allFilters,
      timezone: "America/Recife",
      includeReversals: true,
    })
  })
})
