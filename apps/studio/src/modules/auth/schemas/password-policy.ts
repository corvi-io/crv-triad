import { z } from "zod"

export const PASSWORD_MIN_CHARACTERS = 15
export const PASSWORD_MAX_CHARACTERS = 256

export const newPasswordSchema = z.string().superRefine((password, context) => {
  const characterCount = Array.from(password).length
  if (characterCount < PASSWORD_MIN_CHARACTERS) {
    context.addIssue({ code: "custom", message: "Use pelo menos 15 caracteres." })
  }
  if (characterCount > PASSWORD_MAX_CHARACTERS) {
    context.addIssue({ code: "custom", message: "Use no máximo 256 caracteres." })
  }
})

export function hasMinimumPasswordLength(password: string) {
  return Array.from(password).length >= PASSWORD_MIN_CHARACTERS
}
