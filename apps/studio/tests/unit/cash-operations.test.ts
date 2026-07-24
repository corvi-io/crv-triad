import { describe, expect, it } from "vitest"
import { createRevenueOperationsRepository } from "@/dev/revenue-operations/entry"
import {
  createClosingSnapshot,
  operationalDate,
  projectCashCount,
  projectOpenDay,
} from "@/modules/revenue-operations/cash"
import type { PaidSale } from "@/modules/revenue-operations/contracts"
import { RevenueOperationsError } from "@/modules/revenue-operations/contracts"

const date = localDate(new Date())
const query = { date, scenarioId: "cash-typical", unitId: "centro" as const }

describe("cash operation projections", () => {
  it("reconciles integer-cent payment, commission, professional, and cash totals", () => {
    const summary = projectOpenDay({
      cancellationCount: 2,
      date: "2026-07-24",
      noShowCount: 1,
      paidSales: [sale()],
      unitId: "centro",
      unitName: "Centro",
    })

    expect(summary).toMatchObject({
      barbershopCents: 6000,
      cancellationCount: 2,
      commissionCents: 4000,
      discountCents: 500,
      expectedCashCents: 4000,
      noShowCount: 1,
      paidSaleCount: 1,
      receivedCents: 10_000,
      surchargeCents: 200,
    })
    expect(summary.paymentMethods).toEqual([
      { method: "cash", totalCents: 4000 },
      { method: "pix", totalCents: 6000 },
    ])
    expect(summary.professionals[0]).toMatchObject({
      barbershopCents: 6000,
      commissionCents: 4000,
      revenueCents: 10_000,
    })
  })

  it("derives signed differences and requires a bounded reason only for mismatches", () => {
    expect(projectCashCount(5000, 5000)).toEqual({
      countedCashCents: 5000,
      differenceCents: 0,
      reason: undefined,
    })
    expect(projectCashCount(5000, 5125, "  Conferência física  ")).toEqual({
      countedCashCents: 5125,
      differenceCents: 125,
      reason: "Conferência física",
    })
    expect(() => projectCashCount(5000, 4900)).toThrow("Informe um motivo")
    expect(() => projectCashCount(5000, -1)).toThrow("valor contado válido")
  })

  it("creates detached immutable-value snapshots", () => {
    const summary = projectOpenDay({
      cancellationCount: 0,
      date: "2026-07-24",
      noShowCount: 0,
      paidSales: [sale()],
      unitId: "centro",
      unitName: "Centro",
    })
    const snapshot = createClosingSnapshot({
      cashCount: projectCashCount(4000, 4000),
      closedAt: "2026-07-24T21:00:00.000Z",
      id: "closing-centro-2026-07-24",
      responsiblePersonName: "Marina Souza",
      summary,
    })
    ;(summary.paymentMethods as unknown as { totalCents: number }[])[0].totalCents = 0
    expect(snapshot.paymentMethods[0].totalCents).toBe(4000)
    expect(snapshot.status).toBe("closed")
  })

  it("uses the browser-local operational date instead of truncating UTC", () => {
    expect(operationalDate("2026-07-24T02:30:00.000Z")).toMatch(/2026-07-(23|24)/)
  })
})

describe("cash memory repository", () => {
  it("derives the open day from accepted paid sales and scheduling outcomes", async () => {
    const repository = createRevenueOperationsRepository()
    await repository.reset()
    const summary = await repository.getOpenDaySummary(query)
    expect(summary.status).toBe("open")
    expect(summary.paidSaleCount).toBe(3)
    expect(summary.receivedCents).toBeGreaterThan(0)
    expect(summary.paymentMethods.reduce((sum, item) => sum + item.totalCents, 0)).toBe(
      summary.receivedCents,
    )
    expect(summary.cancellationCount).toBeGreaterThan(0)
    expect(summary.noShowCount).toBeGreaterThan(0)
  })

  it("closes atomically once and returns the same immutable snapshot for a duplicate", async () => {
    const repository = createRevenueOperationsRepository()
    await repository.reset()
    const summary = await repository.getOpenDaySummary(query)
    const input = {
      countedCashCents: summary.expectedCashCents,
      date,
      operationId: "close-1",
      responsiblePersonName: "Marina Souza",
      scenarioId: query.scenarioId,
      unitId: query.unitId,
    }
    const first = await repository.closeDay(input)
    const duplicate = await repository.closeDay({ ...input, operationId: "close-2" })
    expect(duplicate).toEqual(first)
    expect(await repository.listDailyClosings({ limit: 24, ...query })).toHaveLength(1)
    expect((await repository.getOpenDaySummary(query)).status).toBe("closed")
  })

  it("coalesces concurrent close requests into one snapshot", async () => {
    const repository = createRevenueOperationsRepository()
    await repository.reset()
    const summary = await repository.getOpenDaySummary(query)
    const input = {
      countedCashCents: summary.expectedCashCents,
      date,
      operationId: "close-concurrent-1",
      responsiblePersonName: "Marina Souza",
      scenarioId: query.scenarioId,
      unitId: query.unitId,
    }
    const [first, second] = await Promise.all([
      repository.closeDay(input),
      repository.closeDay({ ...input, operationId: "close-concurrent-2" }),
    ])
    expect(second).toEqual(first)
    expect(await repository.listDailyClosings({ limit: 24, ...query })).toHaveLength(1)
    await expect(
      repository.getDailyClosing({ id: first.id, unitId: "artesao" }),
    ).resolves.toBeUndefined()
    await expect(repository.getDailyClosing({ id: first.id, unitId: "centro" })).resolves.toEqual(
      first,
    )
  })

  it("keeps the day open when the one-shot close fails and then recovers", async () => {
    const repository = createRevenueOperationsRepository()
    await repository.reset()
    const failureQuery = { ...query, scenarioId: "cash-next-failure" }
    const summary = await repository.getOpenDaySummary(failureQuery)
    const input = {
      countedCashCents: summary.expectedCashCents,
      date,
      operationId: "close-failure",
      responsiblePersonName: "Marina Souza",
      scenarioId: failureQuery.scenarioId,
      unitId: query.unitId,
    }
    await expect(repository.closeDay(input)).rejects.toBeInstanceOf(RevenueOperationsError)
    expect((await repository.getOpenDaySummary(failureQuery)).status).toBe("open")
    await expect(
      repository.closeDay({ ...input, operationId: "close-retry" }),
    ).resolves.toMatchObject({ status: "closed" })
  })

  it("bounds dense history and reconstructs scenarios after reset", async () => {
    const repository = createRevenueOperationsRepository()
    await repository.reset()
    const denseQuery = { ...query, scenarioId: "cash-dense-history" }
    const before = await repository.getOpenDaySummary(denseQuery)
    expect(await repository.listDailyClosings({ limit: 99, ...denseQuery })).toHaveLength(24)
    await repository.reset()
    expect(await repository.getOpenDaySummary(denseQuery)).toEqual(before)
  })

  it("rejects delayed work after a scenario generation changes", async () => {
    const repository = createRevenueOperationsRepository()
    await repository.reset()
    const delayed = repository.getOpenDaySummary({ ...query, scenarioId: "cash-slow" })
    await new Promise((resolve) => setTimeout(resolve, 20))
    await repository.getOpenDaySummary({ ...query, scenarioId: "cash-empty" })
    await expect(delayed).rejects.toMatchObject({ code: "stale" })
  })
})

function sale(): PaidSale {
  return {
    commissions: [
      {
        barbershopCents: 6000,
        baseCents: 10_000,
        commissionCents: 4000,
        lineId: "line-1",
        professionalId: "professional-1",
        professionalName: "Marina",
        rule: {
          id: "rule-1",
          kind: "percentage",
          rateBasisPoints: 4000,
          source: "professional-default",
        },
      },
    ],
    completedAt: "2026-07-24T15:00:00.000Z",
    discountCents: 500,
    id: "sale-1",
    lines: [
      {
        basePriceCents: 10_300,
        id: "line-1",
        netCents: 10_000,
        priceCents: 10_300,
        professionalId: "professional-1",
        professionalName: "Marina",
        serviceId: "service-1",
        serviceName: "Corte",
      },
    ],
    source: "walk-in",
    surchargeCents: 200,
    tenders: [
      { appliedCents: 4000, id: "cash", method: "cash", receivedCents: 4000 },
      { appliedCents: 6000, id: "pix", method: "pix" },
    ],
    totalCents: 10_000,
    unitId: "centro",
  }
}

function localDate(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-")
}
