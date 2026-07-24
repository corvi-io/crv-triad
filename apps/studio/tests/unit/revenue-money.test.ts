import { describe, expect, it } from "vitest"
import type { CheckoutLine } from "@/modules/revenue-operations/contracts"
import { RevenueOperationsError } from "@/modules/revenue-operations/contracts"
import {
  allocateNetValues,
  calculateCommission,
  tenderSummary,
} from "@/modules/revenue-operations/money"

const lines = [
  { id: "line-a", priceCents: 100 },
  { id: "line-b", priceCents: 100 },
  { id: "line-c", priceCents: 100 },
]

describe("revenue exact-money rules", () => {
  it("allocates cent remainders in stable item order", () => {
    expect(allocateNetValues(lines, 1, 0)).toEqual([
      { id: "line-a", netCents: 100 },
      { id: "line-b", netCents: 100 },
      { id: "line-c", netCents: 99 },
    ])
    expect(allocateNetValues(lines, 0, 1)).toEqual([
      { id: "line-a", netCents: 101 },
      { id: "line-b", netCents: 100 },
      { id: "line-c", netCents: 100 },
    ])
  })

  it("assigns a zero-subtotal net adjustment to the first line in stable order", () => {
    expect(
      allocateNetValues(
        [
          { id: "line-a", priceCents: 0 },
          { id: "line-b", priceCents: 0 },
        ],
        0,
        500,
      ),
    ).toEqual([
      { id: "line-a", netCents: 500 },
      { id: "line-b", netCents: 0 },
    ])
    expect(() => allocateNetValues([], 0, 500)).toThrow(
      "Não é possível alocar um acréscimo sem serviços.",
    )
  })

  it("rejects totals below zero", () => {
    expect(() => allocateNetValues(lines, 301, 0)).toThrow(RevenueOperationsError)
    expect(() => allocateNetValues([{ id: "line", priceCents: -1 }], 0, 0)).toThrow(
      RevenueOperationsError,
    )
    expect(() =>
      allocateNetValues([{ id: "line", priceCents: Number.MAX_SAFE_INTEGER + 1 }], 0, 0),
    ).toThrow(RevenueOperationsError)
  })

  it("calculates percentage, fixed, capped, and no commission exactly", () => {
    const line = {
      id: "line",
      netCents: 3333,
      professionalId: "professional",
      professionalName: "Pessoa Profissional",
    } as CheckoutLine
    expect(
      calculateCommission(line, {
        id: "percentage",
        kind: "percentage",
        rateBasisPoints: 4_000,
        source: "professional-default",
      }),
    ).toMatchObject({ barbershopCents: 2000, commissionCents: 1333 })
    expect(
      calculateCommission(line, {
        fixedCents: 4000,
        id: "fixed",
        kind: "fixed",
        source: "service-professional",
      }),
    ).toMatchObject({ barbershopCents: 0, commissionCents: 3333 })
    expect(
      calculateCommission(line, {
        id: "none",
        kind: "none",
        source: "service-professional",
      }),
    ).toMatchObject({ barbershopCents: 3333, commissionCents: 0 })
  })

  it("reconciles exact mixed tenders and cash change", () => {
    expect(
      tenderSummary(
        [
          { appliedCents: 2000, id: "pix", method: "pix" },
          { appliedCents: 3000, id: "cash", method: "cash", receivedCents: 5000 },
        ],
        5000,
      ),
    ).toEqual({
      appliedCents: 5000,
      changeCents: 2000,
      reconciled: true,
      remainingCents: 0,
    })
  })

  it("rejects invalid, excessive, and duplicate tender lines", () => {
    expect(() => tenderSummary([{ appliedCents: 0, id: "zero", method: "pix" }], 100)).toThrow(
      "maior que zero",
    )
    expect(() =>
      tenderSummary([{ appliedCents: 101, id: "excess", method: "credit" }], 100),
    ).toThrow("ultrapassam")
    expect(() =>
      tenderSummary(
        [
          { appliedCents: 50, id: "same", method: "pix" },
          { appliedCents: 50, id: "same", method: "debit" },
        ],
        100,
      ),
    ).toThrow("identificador único")
  })
})
