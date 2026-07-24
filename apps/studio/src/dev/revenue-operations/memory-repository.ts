import type {
  Checkout,
  CheckoutAdjustmentInput,
  CheckoutLine,
  CheckoutLinePriceInput,
  CommissionRule,
  CompletePaymentInput,
  PaidSale,
  PaymentTender,
  ReplaceTendersInput,
  RevenueDashboardProjection,
  RevenueOperationsRepository,
} from "@/modules/revenue-operations/contracts"
import { RevenueOperationsError } from "@/modules/revenue-operations/contracts"
import {
  allocateNetValues,
  calculateCommission,
  normalizeReason,
  tenderSummary,
} from "@/modules/revenue-operations/money"
import type { ServiceDeskRepository, ServicePaymentHandoff } from "@/modules/service-desk/contracts"

type Clock = { now: () => Date }

export class RevenueOperationsMemoryRepository implements RevenueOperationsRepository {
  readonly #checkouts = new Map<string, Checkout>()
  readonly #paidSales = new Map<string, PaidSale>()
  readonly #serviceDesk: ServiceDeskRepository
  readonly #clock: Clock
  #generation = 0
  #failedNext = new Set<string>()
  readonly #seedingPaid = new Set<string>()

  constructor(serviceDesk: ServiceDeskRepository, clock: Clock = { now: () => new Date() }) {
    this.#serviceDesk = serviceDesk
    this.#clock = clock
  }

  async getCheckout(sessionId: string) {
    const generation = this.#generation
    const scenario = scenarioFromSession(sessionId)
    if (scenario === "checkout-persistent-error") {
      throw new RevenueOperationsError("Não foi possível carregar o pagamento.", "not-found")
    }
    if (scenario === "checkout-slow") await delay(900)
    this.#assertGeneration(generation)
    let checkout = this.#checkouts.get(sessionId)
    if (!checkout) {
      checkout = await this.#createCheckout(sessionId)
      this.#assertGeneration(generation)
      this.#checkouts.set(sessionId, checkout)
    }
    if (
      scenario === "checkout-paid" &&
      checkout.status !== "paid" &&
      !this.#seedingPaid.has(sessionId)
    ) {
      this.#seedingPaid.add(sessionId)
      try {
        await this.completePayment({ operationId: "seed-paid", sessionId })
        checkout = this.#checkouts.get(sessionId) as Checkout
      } finally {
        this.#seedingPaid.delete(sessionId)
      }
    }
    return structuredClone(checkout)
  }

  async updateLinePrice(input: CheckoutLinePriceInput) {
    const checkout = await this.#openCheckout(input.sessionId)
    if (!checkout.adjustmentAuthorized) {
      throw new RevenueOperationsError(
        "Este cenário não autoriza alterar o preço do serviço.",
        "invalid-adjustment",
      )
    }
    const reason = normalizeReason(input.reason, true)
    if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0) {
      throw new RevenueOperationsError("Informe um preço válido.", "invalid-adjustment")
    }
    if (!checkout.lines.some(({ id }) => id === input.lineId)) {
      throw new RevenueOperationsError("Serviço não encontrado.", "not-found")
    }
    return this.#commitCheckout(input.sessionId, {
      ...checkout,
      lines: checkout.lines.map((line) =>
        line.id === input.lineId
          ? { ...line, priceCents: input.priceCents, priceOverrideReason: reason }
          : line,
      ),
      tenders: [],
    })
  }

  async updateAdjustments(input: CheckoutAdjustmentInput) {
    const checkout = await this.#openCheckout(input.sessionId)
    const discountReason = normalizeReason(input.discountReason, input.discountCents > 0)
    const surchargeReason = normalizeReason(input.surchargeReason, input.surchargeCents > 0)
    return this.#commitCheckout(input.sessionId, {
      ...checkout,
      adjustments: {
        discountCents: input.discountCents,
        discountReason,
        surchargeCents: input.surchargeCents,
        surchargeReason,
      },
      tenders: [],
    })
  }

  async replaceTenders(input: ReplaceTendersInput) {
    const checkout = await this.#openCheckout(input.sessionId)
    tenderSummary(input.tenders, checkout.totalCents)
    return this.#commitCheckout(input.sessionId, { ...checkout, tenders: [...input.tenders] })
  }

  async previewCommissions(sessionId: string) {
    const checkout = await this.getCheckout(sessionId)
    return checkout.lines.map((line) => calculateCommission(line, commissionRule(line, sessionId)))
  }

  async completePayment(input: CompletePaymentInput) {
    const existing = this.#paidSales.get(input.sessionId)
    if (existing) return structuredClone(existing)
    const generation = this.#generation
    const checkout = await this.#openCheckout(input.sessionId)
    const summary = tenderSummary(checkout.tenders, checkout.totalCents)
    if (!summary.reconciled) {
      throw new RevenueOperationsError(
        "Os pagamentos devem cobrir o total exatamente.",
        "invalid-tender",
      )
    }
    const scenario = scenarioFromSession(input.sessionId)
    if (scenario === "checkout-decline") {
      throw new RevenueOperationsError(
        "Pagamento recusado nesta demonstração. Revise a forma de pagamento.",
        "declined",
      )
    }
    if (scenario === "checkout-next-failure" && !this.#failedNext.has(input.sessionId)) {
      this.#failedNext.add(input.sessionId)
      throw new RevenueOperationsError(
        "Não foi possível concluir. Nenhuma alteração foi aplicada.",
        "declined",
      )
    }
    if (scenario === "checkout-slow") await delay(900)
    this.#assertGeneration(generation)
    const commissions = checkout.lines.map((line) =>
      calculateCommission(line, commissionRule(line, input.sessionId)),
    )
    const completedAt = this.#clock.now().toISOString()
    const sale: PaidSale = {
      appointmentId: checkout.appointmentId,
      commissions,
      completedAt,
      discountCents: checkout.adjustments.discountCents,
      id: `paid-sale-${checkout.id}`,
      lines: checkout.lines.map((line) => ({ ...line })),
      source: checkout.source,
      surchargeCents: checkout.adjustments.surchargeCents,
      tenders: checkout.tenders.map((tender) => ({ ...tender })),
      totalCents: checkout.totalCents,
      unitId: checkout.unitId,
    }
    await this.#serviceDesk.completePayment({
      completedAt,
      operationId: input.operationId,
      sessionId: input.sessionId,
    })
    this.#assertGeneration(generation)
    this.#paidSales.set(input.sessionId, structuredClone(sale))
    this.#checkouts.set(input.sessionId, { ...checkout, status: "paid" })
    return structuredClone(sale)
  }

  async getPaidSale(sessionId: string) {
    return structuredClone(this.#paidSales.get(sessionId))
  }

  async getDashboardProjection(): Promise<readonly RevenueDashboardProjection[]> {
    return [...this.#paidSales.values()].map((sale) => ({
      appointmentId: sale.appointmentId,
      completedAt: sale.completedAt,
      discountCents: sale.discountCents,
      lineValues: sale.lines.map((line) => ({
        professionalId: line.professionalId,
        serviceId: line.serviceId,
        valueCents: line.netCents,
      })),
      payments: sale.tenders.map(({ appliedCents, method }) => ({
        method,
        valueCents: appliedCents,
      })),
      totalCents: sale.totalCents,
      unitId: sale.unitId,
    }))
  }

  async reset() {
    this.#generation += 1
    this.#checkouts.clear()
    this.#paidSales.clear()
    this.#failedNext.clear()
    this.#seedingPaid.clear()
    await this.#serviceDesk.reset()
  }

  async #createCheckout(sessionId: string): Promise<Checkout> {
    let handoff: ServicePaymentHandoff
    try {
      handoff = await this.#serviceDesk.getPaymentHandoff(sessionId)
    } catch {
      throw new RevenueOperationsError(
        "O atendimento não está disponível para pagamento.",
        "not-ready",
      )
    }
    const scenario = scenarioFromSession(sessionId)
    const adjustments = {
      discountCents: scenario === "checkout-discount" ? 700 : 0,
      discountReason: scenario === "checkout-discount" ? "Cortesia autorizada" : undefined,
      surchargeCents: scenario === "checkout-surcharge" ? 500 : 0,
      surchargeReason: scenario === "checkout-surcharge" ? "Ajuste operacional" : undefined,
    }
    const rawLines: CheckoutLine[] = handoff.items.map((item, index) => ({
      ...item,
      basePriceCents: item.priceCents,
      netCents: item.priceCents,
      priceCents:
        scenario === "checkout-price-override" && index === 0
          ? item.priceCents + 500
          : item.priceCents,
      priceOverrideReason:
        scenario === "checkout-price-override" && index === 0
          ? "Valor autorizado antes do pagamento"
          : undefined,
    }))
    const lines = projectLines(rawLines, adjustments.discountCents, adjustments.surchargeCents)
    const totalCents = lines.reduce((sum, line) => sum + line.netCents, 0)
    return {
      adjustmentAuthorized: scenario !== "checkout-unauthorized",
      adjustments,
      appointmentId: handoff.appointmentId,
      customerName: handoff.customerName,
      finishedAt: handoff.finishedAt,
      id: handoff.sessionId,
      lines,
      source: handoff.source,
      status: "open",
      tenders: scenarioTenders(scenario, totalCents),
      totalCents,
      unitId: handoff.unitId,
      unitName: handoff.unitName,
    }
  }

  async #openCheckout(sessionId: string) {
    const checkout = await this.getCheckout(sessionId)
    if (checkout.status === "paid") {
      throw new RevenueOperationsError("Este pagamento já foi concluído.", "already-paid")
    }
    return checkout
  }

  #commitCheckout(sessionId: string, checkout: Checkout) {
    const lines = projectLines(
      checkout.lines,
      checkout.adjustments.discountCents,
      checkout.adjustments.surchargeCents,
    )
    const next = {
      ...checkout,
      lines,
      totalCents: lines.reduce((sum, line) => sum + line.netCents, 0),
    }
    tenderSummary(next.tenders, next.totalCents)
    this.#checkouts.set(sessionId, structuredClone(next))
    return structuredClone(next)
  }

  #assertGeneration(generation: number) {
    if (generation !== this.#generation) {
      throw new RevenueOperationsError(
        "O cenário mudou durante a operação. Revise os dados e tente novamente.",
        "stale",
      )
    }
  }
}

function projectLines(
  lines: readonly CheckoutLine[],
  discountCents: number,
  surchargeCents: number,
) {
  const allocations = new Map(
    allocateNetValues(lines, discountCents, surchargeCents).map(({ id, netCents }) => [
      id,
      netCents,
    ]),
  )
  return lines.map((line) => ({ ...line, netCents: allocations.get(line.id) ?? 0 }))
}

function commissionRule(line: CheckoutLine, sessionId: string): CommissionRule {
  const scenario = scenarioFromSession(sessionId)
  if (scenario === "checkout-no-commission") {
    return { id: "rule-no-commission", kind: "none", source: "service-professional" }
  }
  if (scenario === "checkout-surcharge") {
    return {
      id: "rule-service-professional-percentage",
      kind: "percentage",
      rateBasisPoints: 4_500,
      source: "service-professional",
    }
  }
  if (scenario === "checkout-fixed-commission" || line.serviceId === "service-fade") {
    return {
      fixedCents: 1200,
      id: "rule-service-professional-fixed",
      kind: "fixed",
      source: "service-professional",
    }
  }
  return {
    id: "rule-professional-default",
    kind: "percentage",
    rateBasisPoints: 4_000,
    source: "professional-default",
  }
}

function scenarioTenders(scenario: string, totalCents: number): PaymentTender[] {
  if (scenario === "checkout-cash") {
    return [
      {
        appliedCents: totalCents,
        id: "tender-cash",
        method: "cash",
        receivedCents: totalCents + 1000,
      },
    ]
  }
  if (scenario === "checkout-debit") {
    return [{ appliedCents: totalCents, id: "tender-debit", method: "debit" }]
  }
  if (scenario === "checkout-credit") {
    return [{ appliedCents: totalCents, id: "tender-credit", method: "credit" }]
  }
  if (scenario === "checkout-mixed") {
    const first = Math.floor(totalCents / 2)
    return [
      { appliedCents: first, id: "tender-pix", method: "pix" },
      { appliedCents: totalCents - first, id: "tender-debit", method: "debit" },
    ]
  }
  return [{ appliedCents: totalCents, id: "tender-pix", method: "pix" }]
}

function scenarioFromSession(sessionId: string) {
  return sessionId.startsWith("session-walk-in-")
    ? sessionId.slice("session-walk-in-".length)
    : "checkout-pix"
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}
