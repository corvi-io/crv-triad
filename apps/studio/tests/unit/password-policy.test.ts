import { describe, expect, it } from "vitest"

import {
  hasDigit,
  hasLowercaseLetter,
  hasMinimumPasswordLength,
  hasSpecialCharacter,
  hasUppercaseLetter,
  newPasswordSchema,
} from "@/modules/auth/schemas/password-policy"

describe("password policy", () => {
  it("accepts a password that meets every requirement", () => {
    expect(newPasswordSchema.safeParse("Senha1!a").success).toBe(true)
  })

  it("rejects passwords when any required character class is missing", () => {
    expect(newPasswordSchema.safeParse("senha1!a").success).toBe(false)
    expect(newPasswordSchema.safeParse("SENHA1!A").success).toBe(false)
    expect(newPasswordSchema.safeParse("Senha!!a").success).toBe(false)
    expect(newPasswordSchema.safeParse("Senha11a").success).toBe(false)
  })

  it("reports each guidance predicate independently", () => {
    expect(hasMinimumPasswordLength("Senha1!a")).toBe(true)
    expect(hasUppercaseLetter("Senha1!a")).toBe(true)
    expect(hasLowercaseLetter("Senha1!a")).toBe(true)
    expect(hasDigit("Senha1!a")).toBe(true)
    expect(hasSpecialCharacter("Senha1!a")).toBe(true)
    expect(hasSpecialCharacter("Senha1 a")).toBe(false)
  })
})
