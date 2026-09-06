import { describe, expect, it } from "vitest"
import {
  createReportRequestSchema,
  reportCatalog,
  reportConfigSnapshotSchema,
} from "../../../src/modules/reporting/application/report-catalog.js"

describe("report catalog contracts", () => {
  it("publishes exactly the six supported report types", () => {
    expect(reportCatalog.map((item) => item.type)).toEqual([
      "sales_revenue",
      "professional_performance",
      "commissions",
      "new_returning_customers",
      "cancellations_no_shows",
      "cash_payments",
    ])
  })

  it("creates an immutable typed snapshot while accepting the Initiative 25 request shape", () => {
    const parsed = createReportRequestSchema.parse({
      format: "csv",
      filters: { from: "2026-09-01", to: "2026-09-06" },
      timezone: "America/Recife",
      idempotencyKey: crypto.randomUUID(),
    })
    expect(parsed.reportType).toBe("sales_revenue")
    expect(parsed.configSnapshot).toMatchObject({
      reportType: "sales_revenue",
      includeReversals: true,
      timezone: "America/Recife",
    })
  })

  it("rejects configuration fields belonging to another report type", () => {
    expect(() =>
      reportConfigSnapshotSchema.parse({
        reportType: "commissions",
        filters: { from: "2026-09-01", to: "2026-09-06" },
        timezone: "America/Recife",
        ranking: "revenue",
      }),
    ).toThrow()
  })
})
