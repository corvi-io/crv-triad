import { describe, expect, it, vi } from "vitest"
import { RevenueOperationsError } from "../../../src/modules/revenue-operations/domain/errors.js"
import { createRevenueOperationsRoutes } from "../../../src/modules/revenue-operations/http/routes.js"

const checkoutId = "018f57e7-a3c2-7000-8000-000000000001"
const lineId = "018f57e7-a3c2-7000-8000-000000000002"
const visitId = "018f57e7-a3c2-7000-8000-000000000003"
const dayId = "018f57e7-a3c2-7000-8000-000000000004"
const movementId = "018f57e7-a3c2-7000-8000-000000000005"
const commandId = "018f57e7-a3c2-7000-8000-000000000006"
const tenant = {
  organizationId: "tenant-a",
  actorUserId: "user-a",
  membershipId: "member-a",
  organizationName: "A",
  role: "owner" as const,
}
const resolve = async () => ({ allowed: true as const, context: tenant })
const allow = async () => ({ allowed: true as const })
type AsyncStub = (...args: unknown[]) => Promise<unknown>

function app(
  service: object,
  authorize: AsyncStub = allow,
  resolver: AsyncStub = resolve,
  observe = vi.fn(),
) {
  return createRevenueOperationsRoutes(
    service as never,
    resolver as never,
    authorize as never,
    observe,
  )
}

function request(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost/api/revenue-operations${path}`, {
    method,
    headers: { "content-type": "application/json", "x-request-id": "revenue-request" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

describe("revenue operations HTTP boundary", () => {
  it.each([
    ["GET", `/checkouts/${checkoutId}`, "getCheckout", "revenue.read_checkout", undefined],
    [
      "POST",
      "/checkouts",
      "openCheckout",
      "revenue.read_checkout",
      { visitId, idempotencyKey: commandId },
    ],
    [
      "PATCH",
      `/checkouts/${checkoutId}/lines/${lineId}`,
      "updateLine",
      "revenue.adjust",
      {
        expectedVersion: 1,
        priceCents: 5000,
        reason: "Correção aprovada",
        idempotencyKey: commandId,
      },
    ],
    [
      "POST",
      `/checkouts/${checkoutId}/register`,
      "registerReceipt",
      "revenue.register",
      { expectedCheckoutVersion: 1, expectedDayVersion: 1, idempotencyKey: commandId },
    ],
    ["GET", `/cash-days/${dayId}`, "getCashDayById", "cash.read", undefined],
    [
      "POST",
      `/cash-days/${dayId}/movements`,
      "addMovement",
      "cash.manage",
      {
        kind: "supply",
        amountCents: 100,
        reason: "Suprimento de caixa",
        expectedVersion: 1,
        idempotencyKey: commandId,
      },
    ],
  ] as const)("authorizes %s %s with %s", async (method, path, operation, capability, body) => {
    const call = vi.fn(async () => ({ id: checkoutId }))
    const authorize = vi.fn(allow)
    const response = await app({ [operation]: call }, authorize).handle(request(method, path, body))
    expect(response.status).toBe(200)
    expect(authorize).toHaveBeenCalledWith(tenant, capability)
    expect(call).toHaveBeenCalledTimes(1)
  })

  it("denies forged member adjustments before resource lookup", async () => {
    const updateLine = vi.fn()
    const response = await app({ updateLine }, async (_tenant: unknown, capability: unknown) =>
      capability === "revenue.adjust"
        ? ({ allowed: false, reason: "capability_forbidden" } as const)
        : ({ allowed: true } as const),
    ).handle(
      request("PATCH", `/checkouts/${checkoutId}/lines/${lineId}`, {
        expectedVersion: 1,
        priceCents: 1,
        reason: "PRIVATE_REASON_SENTINEL",
        idempotencyKey: commandId,
      }),
    )
    expect(response.status).toBe(403)
    expect(updateLine).not.toHaveBeenCalled()
    expect(await response.text()).not.toContain("PRIVATE_REASON_SENTINEL")
  })

  it("keeps reason, money and command sentinels out of safe errors and telemetry", async () => {
    const observe = vi.fn()
    const response = await app(
      {
        reverseMovement: async () => {
          throw new RevenueOperationsError("version_conflict")
        },
      },
      allow,
      resolve,
      observe,
    ).handle(
      request("POST", `/cash-days/${dayId}/movements/${movementId}/reverse`, {
        expectedVersion: 1,
        reason: "PRIVATE_REASON_SENTINEL",
        idempotencyKey: commandId,
      }),
    )
    expect(response.status).toBe(409)
    const result = await response.text()
    expect(result).toContain("version_conflict")
    expect(result).toContain("revenue-request")
    expect(result).not.toContain("PRIVATE_REASON_SENTINEL")
    await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1))
    expect(JSON.stringify(observe.mock.calls)).not.toContain("PRIVATE_REASON_SENTINEL")
    expect(JSON.stringify(observe.mock.calls)).not.toContain(commandId)
  })

  it("rejects a caller-provided closing actor before invoking the service", async () => {
    const closeDay = vi.fn()
    const response = await app({ closeDay }).handle(
      request("POST", `/cash-days/${dayId}/close`, {
        expectedVersion: 1,
        countedCashCents: 10_000,
        reason: "Conferência concluída",
        idempotencyKey: commandId,
        responsiblePersonName: "SPOOFED_ACTOR_SENTINEL",
      }),
    )

    expect(response.status).toBe(400)
    expect(closeDay).not.toHaveBeenCalled()
    expect(await response.text()).not.toContain("SPOOFED_ACTOR_SENTINEL")
  })

  it("rejects anonymous reads and invalid pagination without calling the service", async () => {
    const listCheckouts = vi.fn()
    const anonymous = app(
      { listCheckouts },
      allow,
      async () => ({ allowed: false, reason: "unauthenticated" }) as never,
    )
    expect((await anonymous.handle(request("GET", "/checkouts?page=1&pageSize=20"))).status).toBe(
      401,
    )
    expect(listCheckouts).not.toHaveBeenCalled()

    const invalid = app({ listCheckouts })
    expect((await invalid.handle(request("GET", "/checkouts?page=1&pageSize=100"))).status).toBe(
      400,
    )
    expect(listCheckouts).not.toHaveBeenCalled()
  })
})
