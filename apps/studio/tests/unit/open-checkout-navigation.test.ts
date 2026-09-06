import { describe, expect, it, vi } from "vitest"
import { openCheckoutBeforeNavigation } from "@/modules/revenue-operations/open-checkout-navigation"

describe("queue checkout navigation", () => {
  it("creates the checkout before navigating", async () => {
    const order: string[] = []
    const openCheckout = vi.fn(async () => {
      order.push("open")
      return {} as never
    })
    const navigate = vi.fn(async () => {
      order.push("navigate")
    })

    await openCheckoutBeforeNavigation({ openCheckout }, "visit-a", navigate)

    expect(openCheckout).toHaveBeenCalledWith("visit-a", expect.any(String))
    expect(order).toEqual(["open", "navigate"])
  })

  it("keeps the development fallback navigable when checkout creation is unavailable", async () => {
    const navigate = vi.fn(async () => undefined)
    await openCheckoutBeforeNavigation(undefined, "visit-a", navigate)
    expect(navigate).toHaveBeenCalledOnce()
  })
})
