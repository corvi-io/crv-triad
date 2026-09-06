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
})

function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  })
}
