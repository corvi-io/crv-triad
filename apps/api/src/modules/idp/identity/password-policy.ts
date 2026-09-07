import { dictionary } from "@zxcvbn-ts/language-common"

export const PASSWORD_MIN_CHARACTERS = 8
export const PASSWORD_MAX_CHARACTERS = 256

const uppercasePattern = /\p{Lu}/u
const lowercasePattern = /\p{Ll}/u
const digitPattern = /\p{Nd}/u
const specialCharacterPattern = /[\p{P}\p{S}]/u

const COMMON_PASSWORD_LIMIT = 10_000
const contextSpecificValues = [
  "crv triad password",
  "crvtriadpassword",
  "senha crv triad",
  "senhacrvtriad",
  "Senha CRV Triad 1!",
]

const blockedWholePasswords = new Set(
  [...dictionary["passwords-common"].slice(0, COMMON_PASSWORD_LIMIT), ...contextSpecificValues].map(
    normalizeForComparison,
  ),
)

export type PasswordPolicyResult =
  | { accepted: true }
  | {
      accepted: false
      reason:
        | "blocked"
        | "missing_digit"
        | "missing_lowercase"
        | "missing_special_character"
        | "missing_uppercase"
        | "too_long"
        | "too_short"
    }

export function evaluatePassword(password: string): PasswordPolicyResult {
  const characterCount = Array.from(password).length
  if (characterCount < PASSWORD_MIN_CHARACTERS) return { accepted: false, reason: "too_short" }
  if (characterCount > PASSWORD_MAX_CHARACTERS) return { accepted: false, reason: "too_long" }
  if (!uppercasePattern.test(password)) return { accepted: false, reason: "missing_uppercase" }
  if (!lowercasePattern.test(password)) return { accepted: false, reason: "missing_lowercase" }
  if (!digitPattern.test(password)) return { accepted: false, reason: "missing_digit" }
  if (!specialCharacterPattern.test(password)) {
    return { accepted: false, reason: "missing_special_character" }
  }
  if (blockedWholePasswords.has(normalizeForComparison(password))) {
    return { accepted: false, reason: "blocked" }
  }

  return { accepted: true }
}

function normalizeForComparison(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("und")
}
