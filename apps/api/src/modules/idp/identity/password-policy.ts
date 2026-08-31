import { dictionary } from "@zxcvbn-ts/language-common"

export const PASSWORD_MIN_CHARACTERS = 15
export const PASSWORD_MAX_CHARACTERS = 256

const COMMON_PASSWORD_LIMIT = 10_000
const contextSpecificValues = [
  "crv triad password",
  "crvtriadpassword",
  "senha crv triad",
  "senhacrvtriad",
]

const blockedWholePasswords = new Set(
  [...dictionary["passwords-common"].slice(0, COMMON_PASSWORD_LIMIT), ...contextSpecificValues].map(
    normalizeForComparison,
  ),
)

export type PasswordPolicyResult =
  | { accepted: true }
  | { accepted: false; reason: "blocked" | "too_long" | "too_short" }

export function evaluatePassword(password: string): PasswordPolicyResult {
  const characterCount = Array.from(password).length
  if (characterCount < PASSWORD_MIN_CHARACTERS) return { accepted: false, reason: "too_short" }
  if (characterCount > PASSWORD_MAX_CHARACTERS) return { accepted: false, reason: "too_long" }
  if (blockedWholePasswords.has(normalizeForComparison(password))) {
    return { accepted: false, reason: "blocked" }
  }

  return { accepted: true }
}

function normalizeForComparison(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("und")
}
