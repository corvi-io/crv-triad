import { describe, expect, it } from "vitest"
import { RevenueOperationsError } from "../../../src/modules/revenue-operations/domain/errors.js"
import {
  allocateNet,
  cents,
  checkedSignedSum,
  checkedSum,
  MAX_MONEY_CENTS,
  reason,
  reconcileTenders,
  validateTenderDraft,
} from "../../../src/modules/revenue-operations/domain/money.js"

describe("revenue exact money", () => {
  it("sums bounded signed ledger effects without floating point", () => {
    expect(checkedSignedSum([500, -200, -300])).toBe(0)
    expect(() => checkedSignedSum([MAX_MONEY_CENTS, 1])).toThrowError(/invalid_money/)
  })

  it("allocates proportional net cents with stable remainder order", () => {
    expect(
      allocateNet(
        [
          { id: "first", priceCents: 1_000 },
          { id: "second", priceCents: 2_000 },
          { id: "third", priceCents: 3_000 },
        ],
        1_001,
        2,
      ),
    ).toEqual({
      subtotal: 6_000,
      total: 5_001,
      lines: [
        { id: "first", netCents: 834 },
        { id: "second", netCents: 1_667 },
        { id: "third", netCents: 2_500 },
      ],
    })
  })

  it("assigns a zero-subtotal surcharge to the first stable line", () => {
    expect(
      allocateNet(
        [
          { id: "first", priceCents: 0 },
          { id: "second", priceCents: 0 },
        ],
        0,
        101,
      ).lines,
    ).toEqual([
      { id: "first", netCents: 101 },
      { id: "second", netCents: 0 },
    ])
  })

  it("uses BigInt intermediates and rejects unsafe totals", () => {
    expect(allocateNet([{ id: "large", priceCents: MAX_MONEY_CENTS }], 0, 0).total).toBe(
      MAX_MONEY_CENTS,
    )
    expect(() => checkedSum([MAX_MONEY_CENTS, 1])).toThrowError(RevenueOperationsError)
    expect(() => cents(Number.MAX_SAFE_INTEGER)).toThrowError(RevenueOperationsError)
    expect(() => cents(1.5)).toThrowError(RevenueOperationsError)
    expect(() => cents(-1)).toThrowError(RevenueOperationsError)
  })

  it("requires a bounded normalized reason", () => {
    expect(reason("  conferência operacional  ")).toBe("conferência operacional")
    expect(() => reason("x")).toThrowError(RevenueOperationsError)
    expect(() => reason("x".repeat(161))).toThrowError(RevenueOperationsError)
  })

  it("reconciles mixed tenders and exact cash change", () => {
    expect(validateTenderDraft([{ method: "pix", appliedCents: 500 }])).toEqual({
      appliedCents: 500,
      changeCents: 0,
    })
    expect(
      reconcileTenders(
        [
          { method: "pix", appliedCents: 1_000 },
          { method: "cash", appliedCents: 2_000, receivedCents: 2_500 },
        ],
        3_000,
      ),
    ).toEqual({ appliedCents: 3_000, changeCents: 500 })
    expect(reconcileTenders([], 0)).toEqual({ appliedCents: 0, changeCents: 0 })
  })

  it.each([
    [
      [
        { method: "pix", appliedCents: 500 },
        { method: "pix", appliedCents: 500 },
      ],
      1_000,
    ],
    [[{ method: "cash", appliedCents: 1_000, receivedCents: 999 }], 1_000],
    [[{ method: "debit", appliedCents: 1_000, receivedCents: 1_000 }], 1_000],
    [[{ method: "credit", appliedCents: 999 }], 1_000],
  ] as const)("rejects invalid tender composition %#", (tenders, total) => {
    expect(() => reconcileTenders(tenders, total)).toThrowError(RevenueOperationsError)
  })
})
