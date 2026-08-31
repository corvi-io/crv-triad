import { describe, expect, it } from "vitest"

import { evaluatePassword } from "../../../src/modules/idp/identity/password-policy.js"

describe("password policy", () => {
  it("accepts long Unicode passphrases with spaces and no composition rule", () => {
    expect(evaluatePassword("frase longa com café e espaço")).toEqual({ accepted: true })
  })

  it("enforces 15 through 256 Unicode code points", () => {
    expect(evaluatePassword("a".repeat(14))).toEqual({ accepted: false, reason: "too_short" })
    expect(evaluatePassword("🙂".repeat(15))).toEqual({ accepted: true })
    expect(evaluatePassword("🙂".repeat(256))).toEqual({ accepted: true })
    expect(evaluatePassword("🙂".repeat(257))).toEqual({ accepted: false, reason: "too_long" })
  })

  it("rejects reviewed whole-value blocklist matches without substring rules", () => {
    expect(evaluatePassword("crv triad password")).toEqual({ accepted: false, reason: "blocked" })
    expect(evaluatePassword("frase segura com crv triad password no meio")).toEqual({
      accepted: true,
    })
  })
})
