import { z } from "zod"

export const PASSWORD_MIN_CHARACTERS = 8
export const PASSWORD_MAX_CHARACTERS = 256

const uppercasePattern = /\p{Lu}/u
const lowercasePattern = /\p{Ll}/u
const digitPattern = /\p{Nd}/u
const specialCharacterPattern = /[\p{P}\p{S}]/u

export const newPasswordSchema = z.string().superRefine((password, context) => {
  const characterCount = Array.from(password).length
  if (characterCount < PASSWORD_MIN_CHARACTERS) {
    context.addIssue({ code: "custom", message: "Use pelo menos 8 caracteres." })
  }
  if (characterCount > PASSWORD_MAX_CHARACTERS) {
    context.addIssue({ code: "custom", message: "Use no máximo 256 caracteres." })
  }
  if (!hasUppercaseLetter(password)) {
    context.addIssue({ code: "custom", message: "Inclua pelo menos uma letra maiúscula." })
  }
  if (!hasLowercaseLetter(password)) {
    context.addIssue({ code: "custom", message: "Inclua pelo menos uma letra minúscula." })
  }
  if (!hasDigit(password)) {
    context.addIssue({ code: "custom", message: "Inclua pelo menos um número." })
  }
  if (!hasSpecialCharacter(password)) {
    context.addIssue({ code: "custom", message: "Inclua pelo menos um caractere especial." })
  }
})

export function hasMinimumPasswordLength(password: string) {
  return Array.from(password).length >= PASSWORD_MIN_CHARACTERS
}

export function hasUppercaseLetter(password: string) {
  return uppercasePattern.test(password)
}

export function hasLowercaseLetter(password: string) {
  return lowercasePattern.test(password)
}

export function hasDigit(password: string) {
  return digitPattern.test(password)
}

export function hasSpecialCharacter(password: string) {
  return specialCharacterPattern.test(password)
}
