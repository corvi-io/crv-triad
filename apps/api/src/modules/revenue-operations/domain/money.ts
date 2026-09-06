import { RevenueOperationsError } from "./errors.js"

export const MAX_MONEY_CENTS = 99_999_999_999
export const REASON_MAX_LENGTH = 160

export function cents(value: unknown, field = "amountCents", options: { positive?: boolean } = {}) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < (options.positive ? 1 : 0) ||
    value > MAX_MONEY_CENTS
  )
    throw new RevenueOperationsError("invalid_money", field)
  return value
}

export function reason(value: unknown, field = "reason") {
  if (typeof value !== "string") throw new RevenueOperationsError("invalid_reason", field)
  const normalized = value.trim()
  if (normalized.length < 3 || normalized.length > REASON_MAX_LENGTH)
    throw new RevenueOperationsError("invalid_reason", field)
  return normalized
}

export function checkedSum(values: readonly number[], field = "amountCents") {
  const total = values.reduce((sum, value) => sum + BigInt(cents(value, field)), 0n)
  if (total > BigInt(MAX_MONEY_CENTS)) throw new RevenueOperationsError("invalid_money", field)
  return Number(total)
}

export function checkedSignedSum(values: readonly number[], field = "amountCents") {
  const total = values.reduce((sum, value) => {
    if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_MONEY_CENTS)
      throw new RevenueOperationsError("invalid_money", field)
    return sum + BigInt(value)
  }, 0n)
  if (total < -BigInt(MAX_MONEY_CENTS) || total > BigInt(MAX_MONEY_CENTS))
    throw new RevenueOperationsError("invalid_money", field)
  return Number(total)
}

export function allocateNet(
  lines: readonly { id: string; priceCents: number }[],
  discountCents: number,
  surchargeCents: number,
) {
  const subtotal = checkedSum(
    lines.map((line) => cents(line.priceCents, "priceCents")),
    "subtotalCents",
  )
  const discount = cents(discountCents, "discountCents")
  const surcharge = cents(surchargeCents, "surchargeCents")
  const totalBig = BigInt(subtotal) - BigInt(discount) + BigInt(surcharge)
  if (totalBig < 0n || totalBig > BigInt(MAX_MONEY_CENTS))
    throw new RevenueOperationsError("invalid_money", "discountCents")
  const total = Number(totalBig)
  if (lines.length === 0 && total !== 0)
    throw new RevenueOperationsError("invalid_money", "surchargeCents")
  if (subtotal === 0)
    return {
      subtotal,
      total,
      lines: lines.map((line, index) => ({ id: line.id, netCents: index === 0 ? total : 0 })),
    }
  const allocated = lines.map((line) => ({
    id: line.id,
    netCents: Number((BigInt(line.priceCents) * totalBig) / BigInt(subtotal)),
  }))
  let remainder = total - allocated.reduce((sum, line) => sum + line.netCents, 0)
  return {
    subtotal,
    total,
    lines: allocated.map((line) =>
      remainder-- > 0 ? { ...line, netCents: line.netCents + 1 } : line,
    ),
  }
}

export const tenderMethods = ["pix", "cash", "debit", "credit"] as const
export type TenderMethod = (typeof tenderMethods)[number]
export type TenderInput = { method: TenderMethod; appliedCents: number; receivedCents?: number }

export function validateTenderDraft(tenders: readonly TenderInput[]) {
  if (tenders.length === 0 || tenders.length > 4)
    throw new RevenueOperationsError("invalid_tenders", "tenders")
  const seen = new Set<TenderMethod>()
  let change = 0n
  const applied = tenders.map((tender, index) => {
    if (!tenderMethods.includes(tender.method) || seen.has(tender.method))
      throw new RevenueOperationsError("invalid_tenders", `tenders.${index}.method`)
    seen.add(tender.method)
    const value = cents(tender.appliedCents, `tenders.${index}.appliedCents`, { positive: true })
    if (tender.method === "cash") {
      const received = cents(tender.receivedCents, `tenders.${index}.receivedCents`)
      if (received < value)
        throw new RevenueOperationsError("invalid_tenders", `tenders.${index}.receivedCents`)
      change += BigInt(received - value)
    } else if (tender.receivedCents !== undefined) {
      throw new RevenueOperationsError("invalid_tenders", `tenders.${index}.receivedCents`)
    }
    return value
  })
  const appliedCents = checkedSum(applied, "tenders")
  if (change > BigInt(MAX_MONEY_CENTS))
    throw new RevenueOperationsError("invalid_money", "changeCents")
  return { appliedCents, changeCents: Number(change) }
}

export function reconcileTenders(tenders: readonly TenderInput[], totalCents: number) {
  const total = cents(totalCents, "totalCents")
  if (total === 0 && tenders.length === 0) return { appliedCents: 0, changeCents: 0 }
  const result = validateTenderDraft(tenders)
  if (result.appliedCents !== total) throw new RevenueOperationsError("invalid_tenders", "tenders")
  return result
}
