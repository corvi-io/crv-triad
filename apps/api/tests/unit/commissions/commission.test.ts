import { describe, expect, it } from "vitest"
import { calculateCommission } from "../../../src/modules/commissions/domain/commission.js"

describe("commission calculation", () => {
  it("rounds percentage commission deterministically to cents", () => {
    expect(
      calculateCommission(10_005, {
        kind: "percentage",
        basisPoints: 3333,
        source: "default",
        policyVersion: 2,
      }),
    ).toEqual({ netBaseCents: 10_005, commissionCents: 3335, barbershopShareCents: 6670 })
  })
  it("caps fixed commission at the line net", () => {
    expect(
      calculateCommission(500, {
        kind: "fixed",
        fixedCents: 900,
        source: "override",
        policyVersion: 1,
      }),
    ).toEqual({ netBaseCents: 500, commissionCents: 500, barbershopShareCents: 0 })
  })
  it("supports explicit no commission", () => {
    expect(calculateCommission(500, { kind: "none", source: "none" })).toEqual({
      netBaseCents: 500,
      commissionCents: 0,
      barbershopShareCents: 500,
    })
  })
  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects unsafe bases", (value) =>
    expect(() => calculateCommission(value, { kind: "none", source: "none" })).toThrow(
      "invalid_net_base",
    ))
})
