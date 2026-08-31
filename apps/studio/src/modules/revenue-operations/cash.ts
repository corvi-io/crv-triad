import type {
  CashCount,
  DailyClosingSnapshot,
  OpenDaySummary,
  PaidSale,
  PaymentMethodSummary,
  ProfessionalRevenueSummary,
  TenderMethod,
} from "./contracts"
import { RevenueOperationsError } from "./contracts"
import { normalizeReason } from "./money"

export const CASH_REASON_MAX_LENGTH = 160
export const CLOSING_HISTORY_LIMIT = 24

const paymentMethodOrder: readonly TenderMethod[] = ["cash", "pix", "debit", "credit"]

export function operationalDate(instant: string) {
  const date = new Date(instant)
  if (Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function projectOpenDay({
  cancellationCount,
  date,
  noShowCount,
  paidSales,
  unitId,
  unitName,
}: {
  cancellationCount: number
  date: string
  noShowCount: number
  paidSales: readonly PaidSale[]
  unitId: OpenDaySummary["unitId"]
  unitName: string
}): OpenDaySummary {
  const matchingSales = paidSales.filter(
    (sale) => sale.unitId === unitId && operationalDate(sale.completedAt) === date,
  )
  const paymentTotals = new Map<TenderMethod, number>()
  const professionalTotals = new Map<string, ProfessionalRevenueSummary>()

  for (const sale of matchingSales) {
    for (const tender of sale.tenders) {
      paymentTotals.set(
        tender.method,
        (paymentTotals.get(tender.method) ?? 0) + tender.appliedCents,
      )
    }
    for (const commission of sale.commissions) {
      const current = professionalTotals.get(commission.professionalId)
      professionalTotals.set(commission.professionalId, {
        barbershopCents: (current?.barbershopCents ?? 0) + commission.barbershopCents,
        commissionCents: (current?.commissionCents ?? 0) + commission.commissionCents,
        professionalId: commission.professionalId,
        professionalName: commission.professionalName,
        revenueCents: (current?.revenueCents ?? 0) + commission.baseCents,
      })
    }
  }

  const receivedCents = matchingSales.reduce((sum, sale) => sum + sale.totalCents, 0)
  const paymentMethods: PaymentMethodSummary[] = paymentMethodOrder
    .map((method) => ({ method, totalCents: paymentTotals.get(method) ?? 0 }))
    .filter(({ totalCents }) => totalCents > 0)
  const professionals = [...professionalTotals.values()].sort(
    (left, right) =>
      right.revenueCents - left.revenueCents ||
      left.professionalName.localeCompare(right.professionalName, "pt-BR") ||
      left.professionalId.localeCompare(right.professionalId),
  )
  const commissionCents = professionals.reduce((sum, item) => sum + item.commissionCents, 0)
  const barbershopCents = professionals.reduce((sum, item) => sum + item.barbershopCents, 0)
  const paymentTotal = paymentMethods.reduce((sum, item) => sum + item.totalCents, 0)

  if (paymentTotal !== receivedCents || commissionCents + barbershopCents !== receivedCents) {
    throw new RevenueOperationsError(
      "Os totais financeiros do dia não puderam ser reconciliados.",
      "invalid-cash-count",
    )
  }

  return {
    barbershopCents,
    cancellationCount,
    commissionCents,
    date,
    discountCents: matchingSales.reduce((sum, sale) => sum + sale.discountCents, 0),
    expectedCashCents: paymentTotals.get("cash") ?? 0,
    noShowCount,
    paidSaleCount: matchingSales.length,
    paymentMethods,
    professionals,
    receivedCents,
    status: "open",
    surchargeCents: matchingSales.reduce((sum, sale) => sum + sale.surchargeCents, 0),
    unitId,
    unitName,
  }
}

export function projectCashCount(
  expectedCashCents: number,
  countedCashCents: number,
  reason?: string,
): CashCount {
  if (
    !Number.isSafeInteger(countedCashCents) ||
    countedCashCents < 0 ||
    countedCashCents > 99_999_999_999
  ) {
    throw new RevenueOperationsError("Informe um valor contado válido.", "invalid-cash-count")
  }
  const differenceCents = countedCashCents - expectedCashCents
  const normalizedReason = normalizeReason(reason, differenceCents !== 0)
  if ((normalizedReason?.length ?? 0) > CASH_REASON_MAX_LENGTH) {
    throw new RevenueOperationsError(
      `O motivo deve ter no máximo ${CASH_REASON_MAX_LENGTH} caracteres.`,
      "invalid-cash-count",
    )
  }
  return { countedCashCents, differenceCents, reason: normalizedReason }
}

export function createClosingSnapshot({
  cashCount,
  closedAt,
  id,
  responsiblePersonName,
  summary,
}: {
  cashCount: CashCount
  closedAt: string
  id: string
  responsiblePersonName: string
  summary: OpenDaySummary
}): DailyClosingSnapshot {
  const normalizedName = responsiblePersonName.trim().slice(0, 120)
  if (!normalizedName) {
    throw new RevenueOperationsError(
      "A pessoa responsável pelo fechamento não está disponível.",
      "invalid-cash-count",
    )
  }
  return structuredClone({
    ...summary,
    ...cashCount,
    closedAt,
    id,
    responsiblePersonName: normalizedName,
    status: "closed",
  })
}
