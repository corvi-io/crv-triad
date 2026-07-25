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

  it("applies today, last-seven-days, and custom ranges at the repository boundary", async () => {
    const today = await repository.getReport({
      filters: { from: "2026-07-24", to: "2026-07-24" },
      scenarioId: "typical",
    })
    expect(today.summary).toMatchObject({ paidSaleCount: 1, totalRevenueCents: 3500 })

    const lastSevenDays = await repository.getReport({
      filters: { from: "2026-07-18", to: "2026-07-24" },
      scenarioId: "typical",
    })
    expect(lastSevenDays.summary).toEqual(today.summary)

    const custom = await repository.getReport({
      filters: { from: "2026-07-09", to: "2026-07-17" },
      scenarioId: "typical",
    })
    expect(custom.summary).toMatchObject({ paidSaleCount: 2, totalRevenueCents: 7000 })
    expect(custom.revenue.series.map(({ date }) => date)).toEqual(["2026-07-10", "2026-07-17"])
  })

  it("applies each professional, service, and payment filter independently", async () => {
    const professional = await repository.getReport({
      filters: { ...filters, professionalId: "professional-ana" },
      scenarioId: "typical",
    })
    expect(professional.appliedFilters.professionalId).toBe("professional-ana")
    expect(professional.summary.totalRevenueCents).toBe(14000)

    const service = await repository.getReport({
      filters: { ...filters, serviceId: "service-hair-beard" },
      scenarioId: "typical",
    })
    expect(service.appliedFilters.serviceId).toBe("service-hair-beard")
    expect(service.summary.totalRevenueCents).toBe(0)
    expect(service.cancellations).toMatchObject({
      cancellationCount: 1,
      denominator: 8,
      noShowCount: 1,
    })

    const payment = await repository.getReport({
      filters: { ...filters, paymentMethod: "cash" },
      scenarioId: "typical",
    })
    expect(payment.appliedFilters.paymentMethod).toBe("cash")
    expect(payment.summary).toMatchObject({ paidSaleCount: 1, totalRevenueCents: 3500 })
  })

  it("allocates checkout-mixed cents truthfully across Pix and Debit", async () => {
    const normal = await repository.getReport({ filters, scenarioId: "typical" })
    const [pix, debit, cash] = await Promise.all([
      repository.getReport({
        filters: { ...filters, paymentMethod: "pix" },
        scenarioId: "typical",
      }),
      repository.getReport({
        filters: { ...filters, paymentMethod: "debit" },
        scenarioId: "typical",
      }),
      repository.getReport({
        filters: { ...filters, paymentMethod: "cash" },
        scenarioId: "typical",
      }),
    ])

    expect(pix.summary).toEqual({
      paidSaleCount: 3,
      performedServiceCount: 3,
      totalCommissionCents: 3500,
      totalRevenueCents: 8750,
    })
    expect(pix.averageTicket.ticketCents).toBe(2917)
    expect(pix.topServices.items[0]).toMatchObject({ quantity: 3, valueCents: 8750 })
    expect(pix.commissions.items[0]).toMatchObject({ quantity: 3, valueCents: 3500 })

    expect(debit.summary).toEqual({
      paidSaleCount: 1,
      performedServiceCount: 1,
      totalCommissionCents: 700,
      totalRevenueCents: 1750,
    })
    expect(debit.averageTicket.ticketCents).toBe(1750)
    expect(debit.topServices.items[0]).toMatchObject({ quantity: 1, valueCents: 1750 })
    expect(debit.commissions.items[0]).toMatchObject({ quantity: 1, valueCents: 700 })

    expect(
      pix.summary.totalRevenueCents +
        debit.summary.totalRevenueCents +
        cash.summary.totalRevenueCents,
    ).toBe(normal.summary.totalRevenueCents)
    expect(
      pix.summary.totalCommissionCents +
        debit.summary.totalCommissionCents +
        cash.summary.totalCommissionCents,
    ).toBe(normal.summary.totalCommissionCents)
  })

  it("keeps unknown-customer and long-label scenarios explicit and deterministic", async () => {
    const unknownCustomers = await repository.getReport({
      filters,
      scenarioId: "unknown-customers",
    })
    expect(unknownCustomers.customers).toMatchObject({
      identifiableCount: 0,
      newCount: 0,
      returningCount: 0,
      unknownCount: 4,
    })

    const longLabels = await repository.getReport({ filters, scenarioId: "long-labels" })
    expect(longLabels.topServices.items[0]?.label).toBe(
      "Corte simples com acabamento detalhado e consultoria de estilo",
    )
    expect(longLabels.professionalAttendance.items[0]?.label).toBe(
      "Ana Clara da Unidade Centro de Formação Profissional",
    )
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
