import { describe, expect, it } from "vitest"

import { evaluatePassword } from "../../../src/modules/idp/identity/password-policy.js"

describe("password policy", () => {
  it("accepts passwords that meet length and composition requirements", () => {
    expect(evaluatePassword("Senha1!a")).toEqual({ accepted: true })
    expect(evaluatePassword("Árvore9#x")).toEqual({ accepted: true })
  })

  it("enforces 8 through 256 Unicode code points", () => {
    expect(evaluatePassword("Aa1!aaa")).toEqual({ accepted: false, reason: "too_short" })
    expect(evaluatePassword(`Aa1!${"a".repeat(252)}`)).toEqual({ accepted: true })
    expect(evaluatePassword(`Aa1!${"a".repeat(253)}`)).toEqual({
      accepted: false,
      reason: "too_long",
    })
  })

  it.each([
    ["senha1!a", "missing_uppercase"],
    ["SENHA1!A", "missing_lowercase"],
    ["Senha!!a", "missing_digit"],
    ["Senha11a", "missing_special_character"],
    ["Senha1 a", "missing_special_character"],
  ] as const)("rejects a missing character class", (password, reason) => {
    expect(evaluatePassword(password)).toEqual({ accepted: false, reason })
  })

  it("rejects reviewed whole-value blocklist matches without substring rules", () => {
    expect(evaluatePassword("Senha CRV Triad 1!")).toEqual({ accepted: false, reason: "blocked" })
    expect(evaluatePassword("Frase segura 1! com password no meio")).toEqual({
      accepted: true,
    })
  })
})
