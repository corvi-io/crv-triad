import type {
  CheckoutLine,
  CommissionRule,
  ItemCommissionSnapshot,
  PaymentTender,
} from "./contracts"
import { RevenueOperationsError } from "./contracts"

export const REASON_MAX_LENGTH = 160

export function assertCents(value: number, label = "Valor") {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RevenueOperationsError(
      `${label} deve ser um valor monetário válido.`,
      "invalid-adjustment",
    )
  }
  return value
}

export function allocateNetValues(
  lines: readonly Pick<CheckoutLine, "id" | "priceCents">[],
  discountCents: number,
  surchargeCents: number,
) {
  for (const { priceCents } of lines) {
    assertCents(priceCents, "Valor do serviço")
  }
  assertCents(discountCents, "Desconto")
  assertCents(surchargeCents, "Acréscimo")
  const subtotal = lines.reduce((sum, line) => sum + line.priceCents, 0)
  if (discountCents > subtotal + surchargeCents) {
    throw new RevenueOperationsError(
      "O desconto não pode deixar o total negativo.",
      "invalid-adjustment",
    )
  }
  const total = subtotal - discountCents + surchargeCents
  if (subtotal === 0) return lines.map(({ id }) => ({ id, netCents: 0 }))
  const floors = lines.map((line) => ({
    id: line.id,
    netCents: Math.floor((line.priceCents * total) / subtotal),
  }))
  let remainder = total - floors.reduce((sum, line) => sum + line.netCents, 0)
  return floors.map((line) => {
    if (remainder <= 0) return line
    remainder -= 1
    return { ...line, netCents: line.netCents + 1 }
  })
}

export function calculateCommission(
  line: Pick<CheckoutLine, "id" | "netCents" | "professionalId" | "professionalName">,
  rule: CommissionRule,
): ItemCommissionSnapshot {
  const baseCents = assertCents(line.netCents, "Base de comissão")
  const commissionCents =
    rule.kind === "percentage"
      ? Math.floor((baseCents * rule.rateBasisPoints) / 10_000)
      : rule.kind === "fixed"
        ? Math.min(baseCents, rule.fixedCents)
        : 0
  return {
    barbershopCents: baseCents - commissionCents,
    baseCents,
    commissionCents,
    lineId: line.id,
    professionalId: line.professionalId,
    professionalName: line.professionalName,
    rule,
  }
}

export function tenderSummary(tenders: readonly PaymentTender[], totalCents: number) {
  assertCents(totalCents, "Total")
  const ids = new Set<string>()
  let appliedCents = 0
  let changeCents = 0
  for (const tender of tenders) {
    if (ids.has(tender.id)) {
      throw new RevenueOperationsError(
        "Cada pagamento deve ter um identificador único.",
        "invalid-tender",
      )
    }
    ids.add(tender.id)
    if (!Number.isSafeInteger(tender.appliedCents) || tender.appliedCents <= 0) {
      throw new RevenueOperationsError("Informe um valor maior que zero.", "invalid-tender")
    }
    if (tender.method === "cash") {
      if (
        !Number.isSafeInteger(tender.receivedCents) ||
        (tender.receivedCents ?? 0) < tender.appliedCents
      ) {
        throw new RevenueOperationsError(
          "O valor recebido em dinheiro deve cobrir o valor aplicado.",
          "invalid-tender",
        )
      }
      changeCents += (tender.receivedCents ?? 0) - tender.appliedCents
    } else if (tender.receivedCents !== undefined) {
      throw new RevenueOperationsError(
        "Valor recebido só se aplica a pagamentos em dinheiro.",
        "invalid-tender",
      )
    }
    appliedCents += tender.appliedCents
    if (appliedCents > totalCents) {
      throw new RevenueOperationsError("Os pagamentos ultrapassam o total.", "invalid-tender")
    }
  }
  return {
    appliedCents,
    changeCents,
    remainingCents: Math.max(0, totalCents - appliedCents),
    reconciled: appliedCents === totalCents,
  }
}

export function normalizeReason(reason: string | undefined, required: boolean) {
  const value = reason?.trim() ?? ""
  if (required && value.length < 3) {
    throw new RevenueOperationsError(
      "Informe um motivo com pelo menos 3 caracteres.",
      "invalid-adjustment",
    )
  }
  if (value.length > REASON_MAX_LENGTH) {
    throw new RevenueOperationsError(
      `Use no máximo ${REASON_MAX_LENGTH} caracteres no motivo.`,
      "invalid-adjustment",
    )
  }
  return value || undefined
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100)
}
