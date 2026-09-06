import { afterEach, describe, expect, it, vi } from "vitest"
import { RevenueOperationsHttpRepository } from "@/modules/revenue-operations/http-repository"

const unitId = "018f57e7-a3c2-7000-8000-000000000001"
const dayId = "018f57e7-a3c2-7000-8000-000000000002"
const operationId = "018f57e7-a3c2-7000-8000-000000000003"

const summary = {
  openingCashCents: 10_000,
  expectedCashCents: 10_000,
  supplyCents: 0,
  withdrawalCents: 0,
  cashReceiptReversalCents: 0,
  grossReceiptCents: 0,
  reversedReceiptCents: 0,
  netReceiptCents: 0,
  discountCents: 0,
  surchargeCents: 0,
  noChargeCount: 0,
  pendingCheckoutCount: 0,
  reversalCount: 0,
  receiptCount: 0,
  paymentMethods: [],
}

afterEach(() => vi.unstubAllGlobals())

describe("production revenue operations HTTP adapter", () => {
  it("never submits a caller-provided closing actor", async () => {
    const fetch = vi.fn(async (rawUrl: string | URL | Request, _options?: RequestInit) => {
      const url = String(rawUrl)
      if (url.endsWith("/api/scheduling/units"))
        return json([{ id: unitId, name: "Centro", timezone: "America/Recife" }])
      if (url.includes("/api/revenue-operations/cash-days?"))
        return json({
          day: {
            id: dayId,
            localDate: "2026-09-05",
            status: "open",
            unitId,
            version: 3,
            openedByName: "Servidor",
            closings: [],
            summary,
          },
        })
      return json({
        id: dayId,
        localDate: "2026-09-05",
        status: "closed",
        unitId,
        version: 4,
        openedByName: "Servidor",
        summary,
        closings: [
          {
            id: "018f57e7-a3c2-7000-8000-000000000004",
            actorDisplayName: "Nome derivado no servidor",
            createdAt: "2026-09-05T20:00:00.000Z",
            kind: "close",
            reason: null,
            revision: 1,
            snapshot: { ...summary, countedCashCents: 10_000, differenceCents: 0 },
          },
        ],
      })
    })
    vi.stubGlobal("fetch", fetch)

    const result = await new RevenueOperationsHttpRepository().closeDay({
      countedCashCents: 10_000,
      date: "2026-09-05",
      operationId,
      unitId,
    })

    const closingCall = fetch.mock.calls.find(([url]) =>
      String(url).endsWith(`/cash-days/${dayId}/close`),
    )
    expect(closingCall).toBeDefined()
    const body = JSON.parse(String((closingCall?.[1] as RequestInit | undefined)?.body))
    expect(body).toEqual({
      expectedVersion: 3,
      countedCashCents: 10_000,
      idempotencyKey: operationId,
    })
    expect(JSON.stringify(body)).not.toContain("responsiblePersonName")
    expect(result.responsiblePersonName).toBe("Nome derivado no servidor")
  })

  it("maps the complete production command and bounded-history surface", async () => {
    const checkoutId = "checkout-a"
    const receiptId = "receipt-a"
    const closingId = "closing-a"
    const checkout = checkoutFixture(checkoutId, receiptId)
    const cashDay = cashDayFixture(closingId)
    const fetch = vi.fn(async (rawUrl: string | URL | Request, options?: RequestInit) => {
      const url = new URL(String(rawUrl), "http://studio.local")
      const path = `${url.pathname}${url.search}`
      if (path === "/api/scheduling/units")
        return json([{ id: unitId, name: "Centro", timezone: "America/Recife" }])
      if (path === "/api/access/summary")
        return json({ capabilities: [{ capability: "revenue.adjust", allowed: true }] })
      if (path.endsWith("/registration-context"))
        return json({ cashDay: { id: dayId, status: "open", version: 3 }, checkoutVersion: 7 })
      if (path.endsWith("/register") || path === `/api/revenue-operations/receipts/${receiptId}`)
        return json(checkout.receipts[0])
      if (path.endsWith("/cancel")) return json({ ...checkout.receipts[0], status: "reversed" })
      if (path.includes("/cash-days?") && path.includes("from="))
        return json({ items: [{ id: dayId }] })
      if (path.includes("/cash-days?")) return json({ day: cashDay })
      if (path.includes("/cash-days/")) return json(cashDay)
      if (path === "/api/revenue-operations/cash-days" && options?.method === "POST")
        return json(cashDay)
      return json(checkout)
    })
    vi.stubGlobal("fetch", fetch)
    const repository = new RevenueOperationsHttpRepository()

    expect(await repository.units()).toHaveLength(1)
    expect(await repository.units()).toHaveLength(1)
    expect((await repository.openCheckout("visit/a", operationId)).source).toBe("scheduled")
    expect((await repository.getCheckout("visit/a")).adjustmentAuthorized).toBe(true)
    expect(
      await repository.updateLinePrice({
        lineId: "line/a",
        operationId,
        priceCents: 4_500,
        reason: "Correção",
        sessionId: checkoutId,
      }),
    ).toMatchObject({ totalCents: 5_000 })
    await repository.updateAdjustments({
      discountCents: 100,
      discountReason: "Desconto",
      operationId,
      sessionId: checkoutId,
      surchargeCents: 0,
    })
    await repository.replaceTenders({
      operationId,
      sessionId: checkoutId,
      tenders: [{ id: "draft-cash", appliedCents: 5_000, method: "cash", receivedCents: 6_000 }],
    })
    expect((await repository.completePayment({ operationId, sessionId: checkoutId })).id).toBe(
      receiptId,
    )
    expect(await repository.getPaidSale("visit/a")).toMatchObject({ id: receiptId })
    expect(
      await repository.cancelReceipt({
        checkoutId,
        operationId,
        reason: "Registro incorreto",
        receiptId,
      }),
    ).toMatchObject({ id: checkoutId })

    expect(
      await repository.getOpenDaySummary({ date: "2026-09-05", unitId: "centro" }),
    ).toMatchObject({
      id: dayId,
      paidSaleCount: 1,
    })
    await repository.openCashDay(unitId, 10_000, operationId)
    await repository.addCashMovement({
      amountCents: 1_000,
      cashDayId: dayId,
      kind: "supply",
      operationId,
      reason: "Reforço",
    })
    await repository.reverseCashMovement({
      cashDayId: dayId,
      movementId: "movement/a",
      operationId,
      reason: "Correção",
    })
    await repository.reopenDay(dayId, operationId, "Conferência")
    expect(
      await repository.listDailyClosings({ date: "2026-09-05", limit: 10, unitId }),
    ).toHaveLength(1)
    expect(
      await repository.getDailyClosing({ date: "2026-09-05", id: closingId, unitId }),
    ).toMatchObject({ id: closingId, responsiblePersonName: "Pessoa Servidora" })
    expect(await repository.getDashboardProjection()).toEqual([])
    expect(await repository.listPaidSales()).toEqual([])
    expect(await repository.previewCommissions()).toEqual([])
    await repository.reset()
  })

  it("keeps missing, stale, closed-day and unmapped failures explicit", async () => {
    const responses = new Map<string, Response>([
      ["/api/scheduling/units", json([{ id: unitId, name: "Centro", timezone: null }])],
      ["/api/revenue-operations/checkouts/by-visit/missing", json(null)],
    ])
    vi.stubGlobal(
      "fetch",
      vi.fn(async (rawUrl: string | URL | Request) => {
        const path = new URL(String(rawUrl), "http://studio.local").pathname
        return responses.get(path) ?? json({ code: "unknown_failure" }, 422)
      }),
    )
    const repository = new RevenueOperationsHttpRepository()

    await expect(repository.getCheckout("missing")).rejects.toMatchObject({ code: "not-ready" })
    await expect(
      repository.getOpenDaySummary({ date: "2026-09-05", unitId: "inexistente" }),
    ).rejects.toMatchObject({ code: "not-found" })
    await expect(
      repository.updateLinePrice({
        lineId: "line-a",
        operationId,
        priceCents: 1,
        reason: "Correção",
        sessionId: "never-loaded",
      }),
    ).rejects.toBeTruthy()
  })

  it("covers defensive production states without inventing local financial data", async () => {
    const checkoutId = "checkout-defensive"
    const baseCheckout = checkoutFixture(checkoutId, "receipt-defensive")
    const units = [{ id: unitId, name: "Centro", timezone: "America/Recife" }]

    vi.stubGlobal(
      "fetch",
      vi.fn(async (rawUrl: string | URL | Request) => {
        const path = new URL(String(rawUrl), "http://studio.local").pathname
        if (path === "/api/scheduling/units") return json(units)
        if (path === "/api/access/summary") return json({ capabilities: [] })
        return json({
          ...baseCheckout,
          appointmentId: null,
          adjustments: [],
          receipts: [],
          tenders: [{ id: "pix-a", method: "pix", appliedCents: 5_000, receivedCents: null }],
        })
      }),
    )
    const walkIn = new RevenueOperationsHttpRepository()
    expect(await walkIn.getCheckout("walk-in")).toMatchObject({
      adjustmentAuthorized: false,
      appointmentId: undefined,
      source: "walk-in",
    })
    expect(await walkIn.getPaidSale("walk-in")).toBeUndefined()

    for (const status of [null, "closed"] as const) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (rawUrl: string | URL | Request) => {
          const path = new URL(String(rawUrl), "http://studio.local").pathname
          if (path === "/api/scheduling/units") return json(units)
          if (path === "/api/access/summary")
            return json({ capabilities: [{ capability: "revenue.adjust", allowed: false }] })
          if (path.endsWith("/registration-context"))
            return json({
              cashDay: status ? { id: dayId, status, version: 1 } : null,
              checkoutVersion: 1,
            })
          return json(baseCheckout)
        }),
      )
      const repository = new RevenueOperationsHttpRepository()
      await expect(
        repository.completePayment({ operationId, sessionId: checkoutId }),
      ).rejects.toMatchObject({ code: status ? "cash-day-closed" : "cash-day-required" })
      await expect(
        repository.cancelReceipt({
          checkoutId,
          operationId,
          reason: "Correção",
          receiptId: "receipt-a",
        }),
      ).rejects.toMatchObject({ code: status ? "cash-day-closed" : "cash-day-required" })
    }

    vi.stubGlobal(
      "fetch",
      vi.fn(async (rawUrl: string | URL | Request) => {
        const url = new URL(String(rawUrl), "http://studio.local")
        if (url.pathname === "/api/scheduling/units") return json(units)
        return json({ day: null })
      }),
    )
    const empty = new RevenueOperationsHttpRepository()
    expect(await empty.getOpenDaySummary({ date: "2026-09-05", unitId })).toMatchObject({
      receivedCents: 0,
    })
    await expect(
      empty.closeDay({ countedCashCents: 0, date: "2026-09-05", operationId, unitId }),
    ).rejects.toMatchObject({ code: "not-ready" })
    await expect(
      empty.addCashMovement({
        amountCents: 100,
        cashDayId: "not-loaded",
        kind: "supply",
        operationId,
        reason: "Reforço",
      }),
    ).rejects.toMatchObject({ code: "stale" })
  })

  it.each([
    ["already_registered", "already-paid"],
    ["cash_day_required", "cash-day-required"],
    ["capability_forbidden", "forbidden"],
    ["idempotency_conflict", "idempotency-conflict"],
    ["invalid_money", "invalid-adjustment"],
    ["invalid_reason", "invalid-adjustment"],
    ["invalid_tenders", "invalid-tender"],
    ["module_not_included", "forbidden"],
    ["not_found", "not-found"],
    ["payment_method_disabled", "invalid-tender"],
    ["version_conflict", "stale"],
  ])("maps server error %s to the stable Studio code %s", async (serverCode, studioCode) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ code: serverCode }, 422)),
    )
    await expect(
      new RevenueOperationsHttpRepository().openCheckout("visit-a", operationId),
    ).rejects.toMatchObject({ code: studioCode })
  })
})

function checkoutFixture(checkoutId: string, receiptId: string) {
  return {
    id: checkoutId,
    appointmentId: "appointment-a",
    customerDisplayName: "Cliente",
    discountCents: 0,
    finishedAt: "2026-09-05T18:00:00.000Z",
    status: "registered",
    surchargeCents: 0,
    total: 5_000,
    unitId,
    unitName: "Centro",
    version: 7,
    adjustments: [
      {
        kind: "line-price",
        lineId: "line/a",
        reason: "Correção",
        createdAt: "2026-09-05T18:01:00.000Z",
      },
      { kind: "discount", lineId: null, reason: "Desconto", createdAt: "2026-09-05T18:02:00.000Z" },
    ],
    methods: [
      { enabled: true, method: "cash", version: 1 },
      { enabled: false, method: "credit", version: 1 },
    ],
    lines: [
      {
        id: "line/a",
        priceCents: 5_000,
        netCents: 5_000,
        snapshot: {
          handoffPriceCents: 5_000,
          professionalId: "professional-a",
          professionalName: "Profissional",
          serviceId: "service-a",
          serviceName: "Corte",
        },
      },
    ],
    tenders: [{ id: "tender-a", method: "cash", appliedCents: 5_000, receivedCents: 6_000 }],
    receipts: [
      {
        id: receiptId,
        localDate: "2026-09-05",
        registeredAt: "2026-09-05T18:03:00.000Z",
        replacesReceiptId: null,
        status: "active",
        subtotalCents: 5_000,
        discountCents: 0,
        surchargeCents: 0,
        totalCents: 5_000,
        tenders: [{ id: "tender-a", method: "cash", appliedCents: 5_000, receivedCents: null }],
      },
    ],
  }
}

function cashDayFixture(closingId: string) {
  return {
    id: dayId,
    localDate: "2026-09-05",
    status: "open",
    unitId,
    version: 3,
    openedByName: "Pessoa Servidora",
    summary: { ...summary, receiptCount: 2, reversalCount: 1 },
    closings: [
      {
        id: closingId,
        actorDisplayName: "Pessoa Servidora",
        createdAt: "2026-09-05T20:00:00.000Z",
        kind: "close",
        reason: "Conferência",
        revision: 1,
        snapshot: { ...summary, countedCashCents: 10_000, differenceCents: 0 },
      },
      {
        id: "reopen-a",
        actorDisplayName: "Pessoa Servidora",
        createdAt: "2026-09-05T20:01:00.000Z",
        kind: "reopen",
        reason: "Conferência",
        revision: 2,
        snapshot: null,
      },
    ],
  }
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status,
  })
}
