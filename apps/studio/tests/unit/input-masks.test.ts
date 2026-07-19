import { describe, expect, it } from "vitest"

import {
  BR_MONEY_MAX_CANONICAL_DIGITS,
  BR_MONEY_MAX_DISPLAY_LENGTH,
  formatBrazilianCnpj,
  formatBrazilianCpf,
  formatBrazilianDate,
  formatBrazilianDecimal,
  formatBrazilianDocument,
  formatBrazilianMoney,
  formatBrazilianPhone,
  formatBrazilianPostalCode,
  formatBrazilianRegistration,
  formatBrazilianVehiclePlate,
  formatBrazilianYearModel,
  INPUT_MASK_METADATA,
  normalizeBrazilianDecimal,
  normalizeBrazilianMoney,
  normalizeBrazilianRegistration,
  normalizeBrazilianRg,
  normalizeBrazilianVehiclePlate,
  normalizeInputMask,
} from "@/modules/shared/lib/input-masks"

describe("input masks", () => {
  it("normalizes permissive Brazilian registrations without losing leading zeros", () => {
    expect(formatBrazilianRegistration("01.2-a/3")).toBe("01.2-A/3")
    expect(normalizeBrazilianRegistration("01.2-a/3")).toBe("012A3")
    expect(normalizeBrazilianRegistration(`${"0".repeat(31)}A9`)).toHaveLength(32)
  })
  it("formats national Brazilian phones without treating area code 55 as a country code", () => {
    expect(formatBrazilianPhone("81999990000")).toBe("(81) 99999-0000")
    expect(formatBrazilianPhone("55999990000")).toBe("(55) 99999-0000")
  })

  it("formats an unambiguous international Brazilian phone with +55", () => {
    expect(formatBrazilianPhone("+5581999990000")).toBe("+55 81 99999-0000")
    expect(formatBrazilianPhone("5581999990000")).toBe("+55 81 99999-0000")
    expect(normalizeInputMask("brPhone", "+55 81 99999-0000")).toBe("5581999990000")
  })

  it("keeps partial Brazilian phone input readable while typing", () => {
    expect(formatBrazilianPhone("8")).toBe("(8")
    expect(formatBrazilianPhone("81")).toBe("(81")
    expect(formatBrazilianPhone("819")).toBe("(81) 9")
  })

  it("formats CPF, CNPJ, adaptive documents, and CEP from pasted values", () => {
    expect(formatBrazilianCpf("12345678901")).toBe("123.456.789-01")
    expect(formatBrazilianCnpj("12.345.678/0001-90")).toBe("12.345.678/0001-90")
    expect(formatBrazilianDocument("12345678901")).toBe("123.456.789-01")
    expect(formatBrazilianDocument("12345678000190")).toBe("12.345.678/0001-90")
    expect(formatBrazilianPostalCode("50000000")).toBe("50000-000")
  })

  it("keeps RG flexible and normalizes legacy and Mercosur plates", () => {
    expect(normalizeBrazilianRg("12.345.678-x")).toBe("12345678X")
    expect(normalizeBrazilianVehiclePlate("abc-1234")).toBe("ABC1234")
    expect(formatBrazilianVehiclePlate("ABC1234")).toBe("ABC-1234")
    expect(formatBrazilianVehiclePlate("BRA1A23")).toBe("BRA1A23")
  })

  it("formats date and year/model input without validating business rules", () => {
    expect(formatBrazilianDate("14072026")).toBe("14/07/2026")
    expect(formatBrazilianDate("14/07")).toBe("14/07")
    expect(formatBrazilianYearModel("20252026")).toBe("2025/2026")
  })

  it("keeps money and decimal canonical values separate from display values", () => {
    expect(normalizeBrazilianMoney("R$ 1.234,56")).toBe("1234.56")
    expect(formatBrazilianMoney("1234.56")).toBe("R$ 1.234,56")
    expect(normalizeBrazilianMoney("999.999.999.999.999,99")).toBe("999999999999999.99")
    expect(formatBrazilianMoney("999999999999999.99")).toBe("R$ 999.999.999.999.999,99")
    expect(normalizeBrazilianDecimal("12,3459")).toBe("12.345")
    expect(formatBrazilianDecimal("12.345")).toBe("12,345")
    expect(normalizeBrazilianDecimal("12,")).toBe("12.")
    expect(formatBrazilianDecimal("12.")).toBe("12,")
  })

  it("derives enough BRL display capacity from the canonical digit limit", () => {
    const canonicalDigits = "9".repeat(BR_MONEY_MAX_CANONICAL_DIGITS)
    const canonical = normalizeBrazilianMoney(canonicalDigits)
    const display = formatBrazilianMoney(canonical)

    expect(display).toHaveLength(BR_MONEY_MAX_DISPLAY_LENGTH)
    expect(INPUT_MASK_METADATA.brMoney.maxLength).toBe(display.length)
    expect(normalizeBrazilianMoney(display)).toBe(canonical)
  })

  it("caps overlong values at their canonical limits", () => {
    expect(formatBrazilianCpf("123456789012345")).toBe("123.456.789-01")
    expect(formatBrazilianCnpj("12345678000190123")).toBe("12.345.678/0001-90")
    expect(formatBrazilianVehiclePlate("ABC1D2345")).toBe("ABC1D23")
  })
})
