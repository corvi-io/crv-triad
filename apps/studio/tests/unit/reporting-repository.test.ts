import { beforeEach, describe, expect, it } from "vitest"
import { createReportingRepository } from "@/dev/reporting/entry"
import { ReportingOperationInvalidatedError } from "@/modules/reporting/contracts"

const filters = { from: "2026-07-01", to: "2026-07-31" }

describe("reporting memory repository", () => {
  const repository = createReportingRepository()

  beforeEach(async () => {
    await repository.reset()
  })

  it("composes accepted source seams into exact normal, filtered, empty, and edge results", async () => {
    const normal = await repository.getReport({ filters, scenarioId: "typical" })
    expect(normal.summary).toEqual({
      paidSaleCount: 4,
      performedServiceCount: 4,
      totalCommissionCents: 5600,
      totalRevenueCents: 14000,
    })
    expect(normal.summary.totalRevenueCents).toBe(
      normal.revenue.series.reduce((total, bucket) => total + bucket.valueCents, 0),
    )
    expect(normal.summary.totalCommissionCents).toBe(
      normal.commissions.items.reduce((total, item) => total + item.valueCents, 0),
    )
    expect(normal.customers.unknownCount).toBeGreaterThan(0)
    expect(normal.customers.returningCount).toBe(1)

    const pix = await repository.getReport({
      filters: { ...filters, paymentMethod: "pix" },
      scenarioId: "typical",
    })
    expect(pix.summary.totalRevenueCents).toBeLessThanOrEqual(normal.summary.totalRevenueCents)

    expect(
      (await repository.getReport({ filters, scenarioId: "empty" })).summary.totalRevenueCents,
    ).toBe(0)
    expect(
      (await repository.getReport({ filters, scenarioId: "zero-paid-sales" })).averageTicket
        .ticketCents,
    ).toBeNull()
    const partial = await repository.getReport({ filters, scenarioId: "partial" })
    expect(partial.customers.unavailableReason).toContain("indisponível")
    expect(partial.customers.unknownCount).toBe(partial.summary.paidSaleCount)
  })

  it("supports fail-next, persistent failure, reset, reload reconstruction, and stale protection", async () => {
    await expect(repository.getReport({ filters, scenarioId: "next-failure" })).rejects.toThrow(
      "próxima consulta",
    )
    repository.retry()
    await expect(
      repository.getReport({ filters, scenarioId: "next-failure" }),
    ).resolves.toMatchObject({ sourceDate: "2026-07-24" })
    await expect(repository.getReport({ filters, scenarioId: "persistent-error" })).rejects.toThrow(
      "não puderam ser carregados",
    )

    const stale = repository.getReport({ filters, scenarioId: "slow" })
    await repository.getReport({ filters, scenarioId: "typical" })
    await expect(stale).rejects.toBeInstanceOf(ReportingOperationInvalidatedError)

    const beforeReset = await repository.getReport({ filters, scenarioId: "typical" })
    await repository.reset()
    const afterReset = await repository.getReport({ filters, scenarioId: "typical" })
    expect(afterReset).toEqual(beforeReset)
  })
})
