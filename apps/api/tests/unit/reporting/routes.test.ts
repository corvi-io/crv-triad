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
})
