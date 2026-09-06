import { describe, expect, it } from "vitest"
import { isMemorySourceEnabled, serviceDeskSourceKind } from "../../vite-source-boundary"

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

  it.each([
    ["memory", "local", "memory"],
    ["memory", "dev", "memory"],
    ["memory", "hml", "disabled"],
    ["memory", "prd", "disabled"],
    ["disabled", "prd", "disabled"],
    ["http", "prd", "http"],
    [undefined, "prd", "http"],
  ] as const)("resolves Service Desk source %s/%s as %s", (source, target, expected) => {
    expect(serviceDeskSourceKind(source, target)).toBe(expected)
  })
})
