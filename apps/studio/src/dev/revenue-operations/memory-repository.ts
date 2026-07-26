import {
  CLOSING_HISTORY_LIMIT,
  createClosingSnapshot,
  projectCashCount,
  projectOpenDay,
} from "@/modules/revenue-operations/cash"
import type {
  Checkout,
  CheckoutAdjustmentInput,
  CheckoutLine,
  CheckoutLinePriceInput,
  CloseDayInput,
  ClosingDetailQuery,
  ClosingHistoryQuery,
  CommissionRule,
  CompletePaymentInput,
  DailyClosingSnapshot,
  OpenDaySummary,
  OperationalDayQuery,
  PaidSale,
  PaymentTender,
  PrototypeCheckoutPolicy,
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
import type { SchedulingRepository } from "@/modules/scheduling/contracts"
import type { ServiceDeskRepository, ServicePaymentHandoff } from "@/modules/service-desk/contracts"

type Clock = { now: () => Date }

export class RevenueOperationsMemoryRepository implements RevenueOperationsRepository {
  readonly #checkouts = new Map<string, Checkout>()
  readonly #paidSales = new Map<string, PaidSale>()
  readonly #closings = new Map<string, DailyClosingSnapshot>()
  readonly #closingOperations = new Map<string, Promise<DailyClosingSnapshot>>()
  readonly #serviceDesk: ServiceDeskRepository
  readonly #scheduling: SchedulingRepository
  readonly #clock: Clock
  readonly #checkoutPolicy: PrototypeCheckoutPolicy
  #generation = 0
  #failedNext = new Set<string>()
  readonly #seedingPaid = new Set<string>()
  readonly #cashSeedClosingKeys = new Set<string>()
  readonly #cashSeedSessionIds = new Set<string>()
  #cashScenarioKey?: string
  #cashScenarioInitialization?: Promise<void>

  constructor(
    serviceDesk: ServiceDeskRepository,
    schedulingOrClock: SchedulingRepository | Clock = emptySchedulingRepository,
    clock: Clock = { now: () => new Date() },
    checkoutPolicy: PrototypeCheckoutPolicy = defaultCheckoutPolicy,
  ) {
    this.#serviceDesk = serviceDesk
    this.#scheduling =
      "getRange" in schedulingOrClock ? schedulingOrClock : emptySchedulingRepository
    this.#clock = "now" in schedulingOrClock ? schedulingOrClock : clock
    this.#checkoutPolicy = checkoutPolicy
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
    if (input.tenders.some(({ method }) => !checkout.availableTenderMethods.includes(method))) {
      throw new RevenueOperationsError(
        "A forma de pagamento não está disponível nesta barbearia.",
        "invalid-tender",
      )
    }
    tenderSummary(input.tenders, checkout.totalCents)
    return this.#commitCheckout(input.sessionId, { ...checkout, tenders: [...input.tenders] })
  }

  async previewCommissions(sessionId: string) {
    const checkout = await this.getCheckout(sessionId)
    return Promise.all(
      checkout.lines.map(async (line) =>
        calculateCommission(line, await this.#commissionRule(line, sessionId)),
      ),
    )
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
    const commissions = await Promise.all(
      checkout.lines.map(async (line) =>
        calculateCommission(line, await this.#commissionRule(line, input.sessionId)),
      ),
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

  async #commissionRule(line: CheckoutLine, sessionId: string): Promise<CommissionRule> {
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
      rateBasisPoints:
        (await this.#checkoutPolicy.getCommissionRateBasisPoints(
          line.professionalId,
          line.serviceId,
        )) ?? 4_000,
      source: "professional-default",
    }
  }

  async listPaidSales() {
    return structuredClone([...this.#paidSales.values()])
  }

  async getOpenDaySummary(query: OperationalDayQuery) {
    await this.#ensureCashScenario(query)
    const generation = this.#generation
    if (query.scenarioId === "cash-persistent-error") {
      throw new RevenueOperationsError("Não foi possível carregar o caixa.", "not-found")
    }
    if (query.scenarioId === "cash-slow") await delay(900)
    this.#assertGeneration(generation)
    const closing = this.#closings.get(closingKey(query.unitId, query.date))
    if (closing) return structuredClone(closing)
    return this.#projectOpenDay(query)
  }

  async closeDay(input: CloseDayInput) {
    await this.#ensureCashScenario(input)
    const key = closingKey(input.unitId, input.date)
    const existing = this.#closings.get(key)
    if (existing) return structuredClone(existing)
    const pending = this.#closingOperations.get(key)
    if (pending) return structuredClone(await pending)
    const operation = this.#performClose(input, key)
    this.#closingOperations.set(key, operation)
    try {
      return structuredClone(await operation)
    } finally {
      if (this.#closingOperations.get(key) === operation) {
        this.#closingOperations.delete(key)
      }
    }
  }

  async #performClose(input: CloseDayInput, key: string) {
    const generation = this.#generation
    const summary = await this.#projectOpenDay(input)
    const cashCount = projectCashCount(
      summary.expectedCashCents,
      input.countedCashCents,
      input.reason,
    )
    if (input.scenarioId === "cash-next-failure" && !this.#failedNext.has(`cash:${key}`)) {
      this.#failedNext.add(`cash:${key}`)
      throw new RevenueOperationsError(
        "Não foi possível fechar o dia. Nenhuma alteração foi aplicada.",
        "invalid-cash-count",
      )
    }
    if (input.scenarioId === "cash-slow") await delay(900)
    this.#assertGeneration(generation)
    const snapshot = createClosingSnapshot({
      cashCount,
      closedAt: this.#clock.now().toISOString(),
      id: `closing-${input.unitId}-${input.date}`,
      responsiblePersonName: input.responsiblePersonName,
      summary,
    })
    this.#closings.set(key, structuredClone(snapshot))
    return snapshot
  }

  async listDailyClosings(query: ClosingHistoryQuery) {
    await this.#ensureCashScenario(query)
    return structuredClone(
      [...this.#closings.values()]
        .filter(({ unitId }) => unitId === query.unitId)
        .sort(
          (left, right) =>
            right.date.localeCompare(left.date) || right.closedAt.localeCompare(left.closedAt),
        )
        .slice(0, Math.min(query.limit, CLOSING_HISTORY_LIMIT)),
    )
  }

  async getDailyClosing(query: ClosingDetailQuery) {
    await this.#ensureCashScenario(query)
    return structuredClone(
      [...this.#closings.values()].find(
        (closing) => closing.id === query.id && closing.unitId === query.unitId,
      ),
    )
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
    this.#closings.clear()
    this.#closingOperations.clear()
    this.#failedNext.clear()
    this.#seedingPaid.clear()
    this.#cashSeedClosingKeys.clear()
    this.#cashSeedSessionIds.clear()
    this.#cashScenarioKey = undefined
    this.#cashScenarioInitialization = undefined
    await this.#serviceDesk.reset()
  }

  async #ensureCashScenario(query: OperationalDayQuery) {
    const scenarioId = query.scenarioId ?? "cash-typical"
    const scenarioKey = `${scenarioId}:${query.unitId}:${query.date}`
    if (this.#cashScenarioKey === scenarioKey) {
      await this.#cashScenarioInitialization
      return
    }
    this.#cashScenarioKey = scenarioKey
    const initialization = this.#initializeCashScenario(query, scenarioId)
    this.#cashScenarioInitialization = initialization
    try {
      await initialization
    } finally {
      if (this.#cashScenarioInitialization === initialization) {
        this.#cashScenarioInitialization = undefined
      }
    }
  }

  async #initializeCashScenario(query: OperationalDayQuery, scenarioId: string) {
    this.#generation += 1
    const generation = this.#generation
    const retainedCheckouts = [...this.#checkouts].filter(
      ([sessionId]) => !this.#cashSeedSessionIds.has(sessionId),
    )
    const retainedPaidSales = [...this.#paidSales].filter(
      ([sessionId]) => !this.#cashSeedSessionIds.has(sessionId),
    )
    const retainedClosings = [...this.#closings].filter(
      ([key]) => !this.#cashSeedClosingKeys.has(key),
    )
    this.#checkouts.clear()
    this.#paidSales.clear()
    for (const [sessionId, checkout] of retainedCheckouts) {
      this.#checkouts.set(sessionId, checkout)
    }
    for (const [sessionId, paidSale] of retainedPaidSales) {
      this.#paidSales.set(sessionId, paidSale)
    }
    this.#cashSeedSessionIds.clear()
    this.#closings.clear()
    for (const [key, closing] of retainedClosings) {
      this.#closings.set(key, closing)
    }
    this.#cashSeedClosingKeys.clear()
    this.#closingOperations.clear()
    this.#failedNext.clear()
    this.#seedingPaid.clear()
    await this.#guardGeneration(this.#serviceDesk.reset(), generation)
    await this.#guardGeneration(this.#scheduling.reset(), generation)

    for (const checkoutScenario of cashCheckoutScenarios(scenarioId)) {
      const sessionId = `session-walk-in-${checkoutScenario}`
      if (this.#paidSales.has(sessionId)) continue
      this.#assertGeneration(generation)
      this.#cashSeedSessionIds.add(sessionId)
      await this.#guardGeneration(this.getCheckout(sessionId), generation)
      await this.#guardGeneration(
        this.completePayment({ operationId: `cash-seed-${checkoutScenario}`, sessionId }),
        generation,
      )
    }

    this.#assertGeneration(generation)
    const summary = await this.#guardGeneration(this.#projectOpenDay(query), generation)
    if (scenarioId === "cash-already-closed") {
      const snapshot = createClosingSnapshot({
        cashCount: projectCashCount(summary.expectedCashCents, summary.expectedCashCents),
        closedAt: this.#clock.now().toISOString(),
        id: `closing-${query.unitId}-${query.date}`,
        responsiblePersonName: "Marina Souza",
        summary,
      })
      this.#assertGeneration(generation)
      const key = closingKey(query.unitId, query.date)
      this.#cashSeedClosingKeys.add(key)
      this.#closings.set(key, snapshot)
    }
    if (scenarioId !== "cash-dense-history" && scenarioId !== "cash-already-closed") return
    const count = scenarioId === "cash-dense-history" ? CLOSING_HISTORY_LIMIT : 5
    for (let index = 1; index <= count; index += 1) {
      const date = shiftDate(query.date, -index)
      const historicalSummary = { ...summary, date }
      const countedCashCents =
        summary.expectedCashCents + (index % 3 === 0 ? 125 : index % 4 === 0 ? -75 : 0)
      const cashCount = projectCashCount(
        summary.expectedCashCents,
        countedCashCents,
        countedCashCents === summary.expectedCashCents ? undefined : "Conferência do fechamento",
      )
      this.#assertGeneration(generation)
      const key = closingKey(query.unitId, date)
      this.#cashSeedClosingKeys.add(key)
      this.#closings.set(
        key,
        createClosingSnapshot({
          cashCount,
          closedAt: `${date}T21:00:00.000Z`,
          id: `closing-${query.unitId}-${date}`,
          responsiblePersonName: index % 2 === 0 ? "Marina Souza" : "Rafael Lima",
          summary: historicalSummary,
        }),
      )
    }
  }

  async #projectOpenDay(query: OperationalDayQuery): Promise<OpenDaySummary> {
    const schedulingDay = await this.#scheduling.getRange({
      endDate: query.date,
      focusDate: query.date,
      scenarioId: "all-statuses",
      startDate: query.date,
      unitId: query.unitId,
    })
    return projectOpenDay({
      cancellationCount: schedulingDay.appointments.filter(({ status }) => status === "canceled")
        .length,
      date: query.date,
      noShowCount: schedulingDay.appointments.filter(({ status }) => status === "no-show").length,
      paidSales: [...this.#paidSales.values()],
      unitId: query.unitId,
      unitName: schedulingDay.unitName,
    })
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
    const availableTenderMethods = await this.#checkoutPolicy.getActivePaymentMethodIds()
    return {
      adjustmentAuthorized: scenario !== "checkout-unauthorized",
      adjustments,
      availableTenderMethods,
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

  async #guardGeneration<T>(operation: Promise<T>, generation: number) {
    try {
      const value = await operation
      this.#assertGeneration(generation)
      return value
    } catch (error) {
      this.#assertGeneration(generation)
      throw error
    }
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

function cashCheckoutScenarios(scenarioId: string) {
  if (scenarioId === "cash-empty") return []
  if (scenarioId === "cash-exact") return ["checkout-cash"]
  if (scenarioId === "cash-adjustments") return ["checkout-discount", "checkout-surcharge"]
  if (scenarioId === "cash-professionals") {
    return ["checkout-multi-professional", "checkout-fixed-commission"]
  }
  return ["checkout-pix", "checkout-cash", "checkout-mixed"]
}

function closingKey(unitId: string, date: string) {
  return `${unitId}:${date}`
}

function localDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const defaultCheckoutPolicy: PrototypeCheckoutPolicy = {
  async getActivePaymentMethodIds() {
    return ["pix", "cash", "debit", "credit"]
  },
  async getCommissionRateBasisPoints() {
    return undefined
  },
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return localDate(value)
}

const emptySchedulingRepository: SchedulingRepository = {
  async cancel() {
    throw new Error("Scheduling is unavailable.")
  },
  async create() {
    throw new Error("Scheduling is unavailable.")
  },
  async getRange(query) {
    return {
      appointments: [],
      date: query.focusDate ?? query.startDate,
      endTime: "18:00",
      occupancies: [],
      periods: [],
      professionals: [],
      services: [],
      startTime: "08:00",
      unitName: query.unitId === "centro" ? "Centro" : "Artesão",
    }
  },
  async reset() {},
  scenarios() {
    return []
  },
  async selectScenario() {},
  async transition() {
    throw new Error("Scheduling is unavailable.")
  },
  async update() {
    throw new Error("Scheduling is unavailable.")
  },
}
