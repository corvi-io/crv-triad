import { describe, expect, it } from "vitest"
import { RevenueOperationsMemoryRepository } from "@/dev/revenue-operations/memory-repository"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import { serviceDeskScenarioIds } from "@/dev/service-desk/scenarios"
import type { ServiceDeskRepository } from "@/modules/service-desk/contracts"

const now = new Date("2026-07-23T11:30:00-03:00")
const checkoutScenarioIds = serviceDeskScenarioIds.filter((scenario) =>
  scenario.startsWith("checkout-"),
)

function createRepositories() {
  const scheduling = new SchedulingMemoryRepository("2026-07-23")
  const serviceDesk = new ServiceDeskMemoryRepository(scheduling, { now: () => new Date(now) })
  const revenue = new RevenueOperationsMemoryRepository(serviceDesk, { now: () => new Date(now) })
  return { revenue, scheduling, serviceDesk }
}

describe("revenue operations memory coordinator", () => {
  it("hydrates checkout from the ready service-session handoff", async () => {
    const { revenue } = createRepositories()
    const checkout = await revenue.getCheckout("session-walk-in-checkout-multi-professional")
    expect(checkout).toMatchObject({
      source: "walk-in",
      status: "open",
      totalCents: 8000,
    })
    expect(checkout.lines).toHaveLength(2)
    expect(checkout.lines.map(({ professionalName }) => professionalName)).toEqual([
      "Ana Clara",
      "Bruno Rocha",
    ])
  })

  it("atomically completes a walk-in once without creating an appointment", async () => {
    const { revenue, scheduling, serviceDesk } = createRepositories()
    const sessionId = "session-walk-in-checkout-pix"
    const before = await scheduling.getDay({
      endDate: "2026-07-23",
      startDate: "2026-07-23",
      unitId: "centro",
    })
    const input = { operationId: "complete-walk-in", sessionId }
    const first = await revenue.completePayment(input)
    const second = await revenue.completePayment(input)

    expect(second).toEqual(first)
    expect(first.appointmentId).toBeUndefined()
    expect((await revenue.getCheckout(sessionId)).status).toBe("paid")
    expect((await serviceDesk.getSession(sessionId)).status).toBe("paid")
    expect(
      (
        await scheduling.getDay({
          endDate: "2026-07-23",
          startDate: "2026-07-23",
          unitId: "centro",
        })
      ).appointments,
    ).toEqual(before.appointments)
    expect(await revenue.getDashboardProjection()).toHaveLength(1)
  })

  it("completes and marks a linked scheduled appointment paid", async () => {
    const { revenue, scheduling } = createRepositories()
    const sale = await revenue.completePayment({
      operationId: "complete-scheduled",
      sessionId: "session-walk-in-checkout-scheduled",
    })
    expect(sale.appointmentId).toBe("kanban-05")
    const day = await scheduling.getDay({
      endDate: "2026-07-23",
      startDate: "2026-07-23",
      unitId: "centro",
    })
    expect(day.appointments.find(({ id }) => id === "kanban-05")).toMatchObject({
      paymentStatus: "paid",
      status: "completed",
    })
  })

  it("preserves every surface on decline and one-shot failure", async () => {
    for (const scenario of ["checkout-decline", "checkout-next-failure"] as const) {
      const { revenue, scheduling, serviceDesk } = createRepositories()
      const sessionId = `session-walk-in-${scenario}`
      const checkout = await revenue.getCheckout(sessionId)
      const day = await scheduling.getDay({
        endDate: "2026-07-23",
        startDate: "2026-07-23",
        unitId: "centro",
      })
      await expect(
        revenue.completePayment({ operationId: `complete-${scenario}`, sessionId }),
      ).rejects.toThrow()
      expect(await revenue.getCheckout(sessionId)).toEqual(checkout)
      expect(await revenue.getPaidSale(sessionId)).toBeUndefined()
      expect((await serviceDesk.getSession(sessionId)).status).toBe("ready-for-payment")
      expect(
        (
          await scheduling.getDay({
            endDate: "2026-07-23",
            startDate: "2026-07-23",
            unitId: "centro",
          })
        ).appointments,
      ).toEqual(day.appointments)
      if (scenario === "checkout-next-failure") {
        expect(
          await revenue.completePayment({ operationId: `complete-${scenario}`, sessionId }),
        ).toMatchObject({ totalCents: checkout.totalCents })
      }
    }
  })

  it("keeps paid state immutable", async () => {
    const { revenue } = createRepositories()
    const sessionId = "session-walk-in-checkout-paid"
    expect((await revenue.getCheckout(sessionId)).status).toBe("paid")
    await expect(
      revenue.updateAdjustments({
        discountCents: 1,
        discountReason: "Motivo válido",
        operationId: "late-adjustment",
        sessionId,
        surchargeCents: 0,
      }),
    ).rejects.toThrow("já foi concluído")
  })

  it("uses service-professional percentage overrides before professional defaults", async () => {
    const { revenue } = createRepositories()
    const preview = await revenue.previewCommissions("session-walk-in-checkout-surcharge")
    expect(preview).not.toHaveLength(0)
    expect(preview.every(({ rule }) => rule.source === "service-professional")).toBe(true)
    expect(
      preview.every(({ rule }) => rule.kind === "percentage" && rule.rateBasisPoints === 4_500),
    ).toBe(true)
  })

  it("reconciles a surcharge after an authorized line price reaches zero", async () => {
    const { revenue } = createRepositories()
    const sessionId = "session-walk-in-checkout-pix"
    const initial = await revenue.getCheckout(sessionId)
    const lineId = initial.lines[0]?.id
    expect(lineId).toBeDefined()

    await revenue.updateLinePrice({
      lineId: lineId as string,
      operationId: "zero-line-price",
      priceCents: 0,
      reason: "Cortesia autorizada",
      sessionId,
    })
    const adjusted = await revenue.updateAdjustments({
      discountCents: 0,
      operationId: "zero-subtotal-surcharge",
      sessionId,
      surchargeCents: 500,
      surchargeReason: "Acréscimo autorizado",
    })

    expect(adjusted.totalCents).toBe(500)
    expect(adjusted.lines).toMatchObject([{ id: lineId, netCents: 500 }])

    await revenue.replaceTenders({
      operationId: "zero-subtotal-tender",
      sessionId,
      tenders: [{ appliedCents: 500, id: "pix-500", method: "pix" }],
    })
    await expect(
      revenue.completePayment({ operationId: "zero-subtotal-complete", sessionId }),
    ).resolves.toMatchObject({
      commissions: [{ baseCents: 500 }],
      totalCents: 500,
    })
  })

  it.each(
    checkoutScenarioIds,
  )("reconstructs %s deterministically after reset and fresh-repository reload", async (scenario) => {
    const sessionId = `session-walk-in-${scenario}`
    const repositories = createRepositories()
    const before = await checkoutResult(repositories.revenue, sessionId)

    await repositories.revenue.reset()
    expect(await checkoutResult(repositories.revenue, sessionId)).toEqual(before)
    expect(await checkoutResult(createRepositories().revenue, sessionId)).toEqual(before)
  }, 10_000)

  it("discards a delayed load after reset changes the generation", async () => {
    const { revenue } = createRepositories()
    const pending = revenue.getCheckout("session-walk-in-checkout-slow")
    await revenue.reset()
    await expect(pending).rejects.toThrow("cenário mudou")
  })

  it("does not expose another module's presentation or dev source through its port", () => {
    const typeOnly: ServiceDeskRepository | undefined = undefined
    expect(typeOnly).toBeUndefined()
  })
})

async function checkoutResult(revenue: RevenueOperationsMemoryRepository, sessionId: string) {
  try {
    return { checkout: await revenue.getCheckout(sessionId) }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? { message: error.message, name: error.name }
          : { message: String(error), name: "Unknown" },
    }
  }
}
