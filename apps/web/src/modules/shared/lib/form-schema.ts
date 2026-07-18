import { z } from "zod"

export const requiredText = z.string().trim().min(1, "Campo obrigatório.")
export const optionalText = z.string()
export const requiredEmail = z.email("Informe um e-mail válido.")
const completeDecimalPattern = /^\d+(?:\.\d+)?$/
const completeDecimalMessage = "Informe um número decimal completo."

export const requiredCompleteDecimal = requiredText.regex(
  completeDecimalPattern,
  completeDecimalMessage,
)
export const optionalCompleteDecimal = optionalText.refine(
  (value) => value.length === 0 || completeDecimalPattern.test(value),
  completeDecimalMessage,
)
export const optionalEmail = z
  .string()
  .refine(
    (value) => value.length === 0 || z.email().safeParse(value).success,
    "Informe um e-mail válido.",
  )

export function exactDigits(length: number, message: string) {
  return z.string().regex(new RegExp(`^\\d{${length}}$`), message)
}

export const optionalDateOnly = z
  .string()
  .refine((value) => value.length === 0 || isValidDateOnly(value), "Informe uma data válida.")

export const requiredDateOnly = z.string().refine(isValidDateOnly, "Informe uma data válida.")

export function isValidDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function compareDecimalStrings(left: string, right: string) {
  const [leftInteger = "0", leftFraction = ""] = left.split(".")
  const [rightInteger = "0", rightFraction = ""] = right.split(".")
  const normalizedLeftInteger = leftInteger.replace(/^0+(?=\d)/, "")
  const normalizedRightInteger = rightInteger.replace(/^0+(?=\d)/, "")

  if (normalizedLeftInteger.length !== normalizedRightInteger.length) {
    return normalizedLeftInteger.length < normalizedRightInteger.length ? -1 : 1
  }
  if (normalizedLeftInteger !== normalizedRightInteger) {
    return normalizedLeftInteger < normalizedRightInteger ? -1 : 1
  }

  const fractionLength = Math.max(leftFraction.length, rightFraction.length)
  const normalizedLeftFraction = leftFraction.padEnd(fractionLength, "0")
  const normalizedRightFraction = rightFraction.padEnd(fractionLength, "0")
  if (normalizedLeftFraction === normalizedRightFraction) return 0
  return normalizedLeftFraction < normalizedRightFraction ? -1 : 1
}
