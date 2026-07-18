export type InputMaskName =
  | "brCnpj"
  | "brCpf"
  | "brDocument"
  | "brPostalCode"
  | "brPhone"
  | "brRg"
  | "brRegistration"
  | "brVehiclePlate"
  | "brDate"
  | "brYearModel"
  | "brMoney"
  | "brDecimal"

export type InputMaskMetadata = {
  inputMode: "decimal" | "numeric" | "tel" | "text"
  maxLength: number
  type: "tel" | "text"
}

export const BR_MONEY_MAX_CANONICAL_DIGITS = 18
export const BR_MONEY_MAX_DISPLAY_LENGTH = getBrazilianMoneyDisplayLength(
  BR_MONEY_MAX_CANONICAL_DIGITS,
)

export const INPUT_MASK_METADATA: Record<InputMaskName, InputMaskMetadata> = {
  brCnpj: {
    inputMode: "numeric",
    maxLength: 18,
    type: "text",
  },
  brCpf: {
    inputMode: "numeric",
    maxLength: 14,
    type: "text",
  },
  brDocument: {
    inputMode: "numeric",
    maxLength: 18,
    type: "text",
  },
  brPostalCode: {
    inputMode: "numeric",
    maxLength: 9,
    type: "text",
  },
  brPhone: {
    inputMode: "tel",
    maxLength: 17,
    type: "tel",
  },
  brRg: {
    inputMode: "text",
    maxLength: 12,
    type: "text",
  },
  brRegistration: {
    inputMode: "text",
    maxLength: 32,
    type: "text",
  },
  brVehiclePlate: {
    inputMode: "text",
    maxLength: 8,
    type: "text",
  },
  brDate: {
    inputMode: "numeric",
    maxLength: 10,
    type: "text",
  },
  brYearModel: {
    inputMode: "numeric",
    maxLength: 9,
    type: "text",
  },
  brMoney: {
    inputMode: "decimal",
    maxLength: BR_MONEY_MAX_DISPLAY_LENGTH,
    type: "text",
  },
  brDecimal: {
    inputMode: "decimal",
    maxLength: 20,
    type: "text",
  },
}

export function applyInputMask(mask: InputMaskName, value: string): string {
  if (mask === "brCnpj") {
    return formatBrazilianCnpj(value)
  }

  if (mask === "brPostalCode") {
    return formatBrazilianPostalCode(value)
  }

  if (mask === "brPhone") {
    return formatBrazilianPhone(value)
  }

  if (mask === "brCpf") return formatBrazilianCpf(value)
  if (mask === "brDocument") return formatBrazilianDocument(value)
  if (mask === "brRg") return normalizeBrazilianRg(value)
  if (mask === "brRegistration") return formatBrazilianRegistration(value)
  if (mask === "brVehiclePlate") return formatBrazilianVehiclePlate(value)
  if (mask === "brDate") return formatBrazilianDate(value)
  if (mask === "brYearModel") return formatBrazilianYearModel(value)
  if (mask === "brMoney") return formatBrazilianMoney(value)
  if (mask === "brDecimal") return formatBrazilianDecimal(value)

  return value
}

export function normalizeInputMask(mask: InputMaskName, value: string): string {
  if (mask === "brMoney") return normalizeBrazilianMoney(value)
  if (mask === "brDecimal") return normalizeBrazilianDecimal(value)
  if (mask === "brRg") return normalizeBrazilianRg(value)
  if (mask === "brRegistration") return normalizeBrazilianRegistration(value)
  if (mask === "brVehiclePlate") return normalizeBrazilianVehiclePlate(value)
  return onlyDigits(value).slice(0, INPUT_MASK_CANONICAL_LENGTHS[mask])
}

const INPUT_MASK_CANONICAL_LENGTHS: Record<
  Exclude<InputMaskName, "brMoney" | "brDecimal" | "brRg" | "brRegistration" | "brVehiclePlate">,
  number
> &
  Partial<Record<InputMaskName, number>> = {
  brCnpj: 14,
  brCpf: 11,
  brDocument: 14,
  brPostalCode: 8,
  brPhone: 13,
  brDate: 8,
  brYearModel: 8,
}

export function formatBrazilianCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatBrazilianDocument(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  return digits.length <= 11 ? formatBrazilianCpf(digits) : formatBrazilianCnpj(digits)
}

export function formatBrazilianCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  const partOne = digits.slice(0, 2)
  const partTwo = digits.slice(2, 5)
  const partThree = digits.slice(5, 8)
  const branch = digits.slice(8, 12)
  const verifier = digits.slice(12, 14)

  if (digits.length <= 2) {
    return partOne
  }
  if (digits.length <= 5) {
    return `${partOne}.${partTwo}`
  }
  if (digits.length <= 8) {
    return `${partOne}.${partTwo}.${partThree}`
  }
  if (digits.length <= 12) {
    return `${partOne}.${partTwo}.${partThree}/${branch}`
  }
  return `${partOne}.${partTwo}.${partThree}/${branch}-${verifier}`
}

export function formatBrazilianPostalCode(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length <= 5) {
    return digits
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatBrazilianPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 13)

  if (!digits) {
    return ""
  }

  const hasExplicitInternationalPrefix = value.trimStart().startsWith("+")
  const hasCompleteInternationalLength = digits.length > 11

  if (
    digits.startsWith("55") &&
    (hasExplicitInternationalPrefix || hasCompleteInternationalLength)
  ) {
    return formatInternationalBrazilianPhone(digits)
  }

  return formatNationalBrazilianPhone(digits)
}

export function normalizeBrazilianRg(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12)
}

export function normalizeBrazilianRegistration(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 32)
}

export function formatBrazilianRegistration(value: string): string {
  let alphanumericCount = 0
  let formatted = ""

  for (const character of value.toUpperCase()) {
    if (/[A-Z0-9]/.test(character)) {
      if (alphanumericCount >= 32) break
      alphanumericCount += 1
      formatted += character
    } else if (/[./-]/.test(character) && formatted.length > 0) {
      formatted += character
    }

    if (formatted.length >= 32) break
  }

  return formatted
}

export function normalizeBrazilianVehiclePlate(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 7)
}

export function formatBrazilianVehiclePlate(value: string): string {
  const normalized = normalizeBrazilianVehiclePlate(value)
  return /^[A-Z]{3}\d{4}$/.test(normalized)
    ? `${normalized.slice(0, 3)}-${normalized.slice(3)}`
    : normalized
}

export function formatBrazilianDate(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function formatBrazilianYearModel(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  return digits.length <= 4 ? digits : `${digits.slice(0, 4)}/${digits.slice(4)}`
}

export function normalizeBrazilianMoney(value: string): string {
  const digits = onlyDigits(value).slice(0, BR_MONEY_MAX_CANONICAL_DIGITS)
  if (!digits) return ""
  const integer = stripLeadingZeros(digits.slice(0, -2) || "0")
  return `${integer}.${digits.slice(-2).padStart(2, "0")}`
}

export function formatBrazilianMoney(value: string): string {
  const canonical = /^\d+(?:\.\d{0,2})?$/.test(value) ? value : normalizeBrazilianMoney(value)
  if (!canonical) return ""
  const [integer = "0", fraction = "00"] = canonical.split(".")
  const groupedInteger = stripLeadingZeros(integer).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `R$ ${groupedInteger},${fraction.padEnd(2, "0").slice(0, 2)}`
}

export function normalizeBrazilianDecimal(value: string): string {
  const localized = value.replace(/[^\d,.]/g, "")
  if (!localized) return ""

  const lastComma = localized.lastIndexOf(",")
  const lastDot = localized.lastIndexOf(".")
  const separatorIndex = Math.max(lastComma, lastDot)

  if (separatorIndex < 0) return stripLeadingZeros(onlyDigits(localized).slice(0, 16))

  const integer = stripLeadingZeros(onlyDigits(localized.slice(0, separatorIndex)).slice(0, 16))
  const fraction = onlyDigits(localized.slice(separatorIndex + 1)).slice(0, 3)
  return `${integer}.${fraction}`
}

export function formatBrazilianDecimal(value: string): string {
  return normalizeBrazilianDecimal(value).replace(".", ",")
}

function formatInternationalBrazilianPhone(digits: string): string {
  const countryCode = digits.slice(0, 2)
  const areaCode = digits.slice(2, 4)
  const subscriber = digits.slice(4)

  if (digits.length <= 2) {
    return `+${countryCode}`
  }

  if (digits.length <= 4) {
    return `+${countryCode} ${areaCode}`
  }

  return `+${countryCode} ${areaCode} ${formatSubscriberNumber(subscriber)}`
}

function formatNationalBrazilianPhone(digits: string): string {
  const areaCode = digits.slice(0, 2)
  const subscriber = digits.slice(2)

  if (digits.length <= 2) {
    return `(${areaCode}`
  }

  return `(${areaCode}) ${formatSubscriberNumber(subscriber)}`
}

function formatSubscriberNumber(value: string): string {
  const firstGroupSize = value.length > 8 ? 5 : 4
  const firstGroup = value.slice(0, firstGroupSize)
  const secondGroup = value.slice(firstGroupSize, 9)

  if (!secondGroup) {
    return firstGroup
  }

  return `${firstGroup}-${secondGroup}`
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

function stripLeadingZeros(value: string): string {
  return value.replace(/^0+(?=\d)/, "") || "0"
}

function getBrazilianMoneyDisplayLength(canonicalDigits: number): number {
  const integerDigits = Math.max(1, canonicalDigits - 2)
  const groupSeparators = Math.floor((integerDigits - 1) / 3)
  return "R$ ".length + integerDigits + groupSeparators + ",00".length
}
