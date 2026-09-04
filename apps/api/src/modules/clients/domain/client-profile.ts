import { z } from "zod"

import { ClientValidationError } from "./errors.js"

const trimmedString = (maximum: number) => z.string().trim().max(maximum)
const optionalEmail = z
  .string()
  .trim()
  .pipe(z.union([z.literal(""), z.email().max(254)]))

const clientInputSchema = z
  .object({
    email: optionalEmail.default(""),
    name: z.string().trim().min(1).max(160),
    phone: trimmedString(40).default(""),
    preferenceNote: trimmedString(1_000).default(""),
    servicePreferences: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  })
  .superRefine((input, context) => {
    if (!normalizePhone(input.phone) && !input.email) {
      context.addIssue({
        code: "custom",
        message: "phone_or_email_required",
        path: ["phone"],
      })
    }
  })

export type ClientProfileInput = z.input<typeof clientInputSchema>

export type ValidClientProfile = Readonly<{
  email: string | null
  name: string
  normalizedEmail: string | null
  normalizedPhone: string | null
  phone: string | null
  preferenceNote: string
  servicePreferences: readonly string[]
  tags: readonly string[]
}>

export function normalizePhone(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const digits = trimmed.replace(/\D/g, "")
  if (!digits || digits.length > 15) return null
  return trimmed.startsWith("+") ? `+${digits}` : digits
}

export function normalizeEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase()
  return normalized || null
}

export function validateClientProfile(input: unknown): ValidClientProfile {
  const result = clientInputSchema.safeParse(input)
  if (!result.success) {
    throw new ClientValidationError(result.error.flatten().fieldErrors)
  }

  const normalizedPhone = normalizePhone(result.data.phone)
  if (result.data.phone && !normalizedPhone) {
    throw new ClientValidationError({ phone: ["invalid_phone"] })
  }

  return {
    email: normalizeEmail(result.data.email),
    name: result.data.name,
    normalizedEmail: normalizeEmail(result.data.email),
    normalizedPhone,
    phone: result.data.phone || null,
    preferenceNote: result.data.preferenceNote,
    servicePreferences: uniqueValues(result.data.servicePreferences),
    tags: uniqueValues(result.data.tags),
  }
}

function uniqueValues(values: readonly string[]) {
  return [...new Set(values)]
}
