import { randomInt } from "node:crypto"

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"
const SLUG_SUFFIX_LENGTH = 5
const MAX_SLUG_LENGTH = 100

export function createBarbershopSlug(name: string, random = randomInt): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_SLUG_LENGTH - SLUG_SUFFIX_LENGTH - 1)
    .replace(/-$/g, "")
  const safeBase = base || "barbearia"
  const suffix = Array.from(
    { length: SLUG_SUFFIX_LENGTH },
    () => SLUG_ALPHABET[random(SLUG_ALPHABET.length)],
  ).join("")

  return `${safeBase}-${suffix}`
}
