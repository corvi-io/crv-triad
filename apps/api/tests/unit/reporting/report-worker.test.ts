import { describe, expect, it } from "vitest"
import { createReportObjectKey } from "../../../src/modules/reporting/application/report-worker.js"

describe("report worker object keys", () => {
  it("places tenant reports in a dated ownership namespace", () => {
    expect(
      createReportObjectKey({
        organizationId: "tenant-1",
        reportType: "sales_revenue",
        createdAt: new Date("2026-09-07T23:30:00-03:00"),
        reportRequestId: "request-1",
        attempt: 2,
        format: "csv",
      }),
    ).toBe("tenants/tenant-1/reports/sales-revenue/2026/09/request-1/attempt-2.csv")
  })
})
