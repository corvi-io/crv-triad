import { describe, expect, it } from "vitest"
import { isMemorySourceEnabled } from "../../vite-source-boundary"

describe("Vite memory source boundary", () => {
  it.each([
    ["local", true],
    ["dev", true],
    ["hml", false],
    ["prd", false],
  ] as const)("resolves memory for the %s target as %s", (target, expected) => {
    expect(isMemorySourceEnabled("memory", target)).toBe(expected)
  })

  it("fails closed when the source is missing or disabled", () => {
    expect(isMemorySourceEnabled(undefined, "dev")).toBe(false)
    expect(isMemorySourceEnabled("disabled", "dev")).toBe(false)
  })
})
