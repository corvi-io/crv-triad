import { schedulingRequest } from "@/modules/scheduling/http-repository"
import { FormSubmissionError } from "@/modules/shared/forms/form-submission-error"
import type {
  CancelReceiptInput,
  Checkout,
  CheckoutAdjustmentInput,
  CheckoutLinePriceInput,
  CloseDayInput,
  ClosingDetailQuery,
  ClosingHistoryQuery,
  CompletePaymentInput,
  DailyClosingSnapshot,
  OpenDaySummary,
  OperationalDayQuery,
  PaidSale,
  PaymentTender,
  ReplaceTendersInput,
  RevenueDashboardProjection,
  RevenueOperationsRepository,
  TenderMethod,
} from "./contracts"
import { RevenueOperationsError } from "./contracts"

type ApiMethod = {
  enabled: boolean
  method: TenderMethod
  version: number
}
type ApiLine = {
  id: string
  priceCents: number
  netCents: number
  snapshot: {
    handoffPriceCents: number
    professionalId: string
    professionalName: string
    serviceId: string
    serviceName: string
  }
}
type ApiTender = {
  id: string
  method: TenderMethod
  appliedCents: number
  receivedCents: number | null
}
type ApiAdjustment = {
  kind: "line-price" | "discount" | "surcharge"
  lineId: string | null
  reason: string
  createdAt: string
}
type ApiReceipt = {
  id: string
  localDate: string
  registeredAt: string
  replacesReceiptId: string | null
  status: "active" | "reversed"
  subtotalCents: number
  discountCents: number
  surchargeCents: number
  totalCents: number
  lines?: readonly {
    id: string
    grossCents: number
    netCents: number
    snapshot: ApiLine["snapshot"]
  }[]
  tenders?: readonly ApiTender[]
}
type ApiCheckout = {
  id: string
  appointmentId: string | null
  customerDisplayName: string
  discountCents: number
  finishedAt: string
  lines: readonly ApiLine[]
  methods: readonly ApiMethod[]
  receipts: readonly ApiReceipt[]
  status: "open" | "registered"
  surchargeCents: number
  tenders: readonly ApiTender[]
  total: number
  unitId: string
  unitName: string
  version: number
  adjustments: readonly ApiAdjustment[]
}
type ApiCashDay = {
  id: string
  localDate: string
  status: "open" | "closed"
  unitId: string
  version: number
  openedByName: string
  closings: readonly ApiClosing[]
  summary: {
    openingCashCents: number
    expectedCashCents: number
    supplyCents: number
    withdrawalCents: number
    cashReceiptReversalCents: number
    grossReceiptCents: number
    reversedReceiptCents: number
    netReceiptCents: number
    discountCents: number
    surchargeCents: number
    noChargeCount: number
    pendingCheckoutCount: number
    reversalCount: number
    receiptCount: number
    paymentMethods: readonly {
      method: TenderMethod
      grossCents: number
      reversedCents: number
      netCents: number
    }[]
  }
}
type ApiClosing = {
  id: string
  actorDisplayName: string
  createdAt: string
  kind: "close" | "reopen"
  reason: string | null
  revision: number
  snapshot: null | (ApiCashDay["summary"] & { countedCashCents: number; differenceCents: number })
}
type UnitOption = { id: string; name: string; timezone: string | null }
type AccessSummary = {
  capabilities: readonly { allowed: boolean; capability: string }[]
}

const errorCopy: Record<string, { code: RevenueOperationsError["code"]; message: string }> = {
  already_registered: { code: "already-paid", message: "Este pagamento já foi registrado." },
  cash_day_closed: { code: "cash-day-closed", message: "O caixa operacional está fechado." },
  cash_day_required: {
    code: "cash-day-required",
    message: "Abra o caixa de hoje antes de registrar o pagamento.",
  },
  capability_forbidden: {
    code: "forbidden",
    message: "Seu acesso não permite esta ação.",
  },
  idempotency_conflict: {
    code: "idempotency-conflict",
    message: "Esta tentativa não corresponde mais aos dados originais.",
  },
  invalid_money: { code: "invalid-adjustment", message: "Informe um valor válido." },
  invalid_reason: { code: "invalid-adjustment", message: "Revise o motivo informado." },
  invalid_tenders: { code: "invalid-tender", message: "Revise as formas de pagamento." },
  module_not_included: { code: "forbidden", message: "Este recurso não está incluído no plano." },
  not_found: { code: "not-found", message: "Este registro não está mais disponível." },
  payment_method_disabled: {
    code: "invalid-tender",
    message: "Uma forma de pagamento foi desabilitada. Revise o pagamento.",
  },
  version_conflict: {
    code: "stale",
    message: "Este registro mudou. Seus dados foram mantidos para revisão.",
  },
}

async function request<T>(path: string, options?: { body?: unknown; method?: string }) {
  try {
    return await schedulingRequest<T>(path, options)
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      const mapped = errorCopy[error.code]
      if (mapped) throw new RevenueOperationsError(mapped.message, mapped.code)
      if (error.code === "network_error")
        throw new RevenueOperationsError(error.message, "network-error")
    }
    throw error
  }
}

export class RevenueOperationsHttpRepository implements RevenueOperationsRepository {
  readonly #checkoutVersions = new Map<string, number>()
  readonly #dayVersions = new Map<string, number>()
  #units?: readonly UnitOption[]
  #canAdjust?: boolean

  async units() {
    this.#units ??= await request<readonly UnitOption[]>("/api/scheduling/units")
    return this.#units
  }

  async #unit(requested: string) {
    const units = await this.units()
    const normalized = requested.trim().toLocaleLowerCase("pt-BR")
    const selected = units.find(
      (unit) => unit.id === requested || unit.name.trim().toLocaleLowerCase("pt-BR") === normalized,
    )
    if (!selected) throw new RevenueOperationsError("Unidade não encontrada.", "not-found")
    return selected
  }

  async #adjustmentAccess() {
    if (this.#canAdjust !== undefined) return this.#canAdjust
    const access = await request<AccessSummary>("/api/access/summary")
    this.#canAdjust =
      access.capabilities.find(({ capability }) => capability === "revenue.adjust")?.allowed ??
      false
    return this.#canAdjust
  }

  async openCheckout(sessionId: string, operationId: string) {
    const checkout = await request<ApiCheckout>("/api/revenue-operations/checkouts", {
      method: "POST",
      body: { visitId: sessionId, idempotencyKey: operationId },
    })
    return this.#checkout(checkout)
  }

  async getCheckout(sessionId: string) {
    const checkout = await request<ApiCheckout | null>(
      `/api/revenue-operations/checkouts/by-visit/${encodeURIComponent(sessionId)}`,
    )
    if (!checkout) throw new RevenueOperationsError("Abra a comanda para continuar.", "not-ready")
    return this.#checkout(checkout)
  }

  async #checkout(checkout: ApiCheckout): Promise<Checkout> {
    this.#checkoutVersions.set(checkout.id, checkout.version)
    const canAdjust = await this.#adjustmentAccess()
    const latestReason = (kind: ApiAdjustment["kind"], lineId?: string) =>
      checkout.adjustments.find(
        (entry) => entry.kind === kind && (!lineId || entry.lineId === lineId),
      )?.reason
    return {
      id: checkout.id,
      version: checkout.version,
      appointmentId: checkout.appointmentId ?? undefined,
      customerName: checkout.customerDisplayName,
      unitId: checkout.unitId,
      unitName: checkout.unitName,
      source: checkout.appointmentId ? "scheduled" : "walk-in",
      finishedAt: checkout.finishedAt,
      status: checkout.status,
      adjustmentAuthorized: canAdjust,
      adjustments: {
        discountCents: checkout.discountCents,
        discountReason: latestReason("discount"),
        surchargeCents: checkout.surchargeCents,
        surchargeReason: latestReason("surcharge"),
      },
      availableTenderMethods: checkout.methods
        .filter(({ enabled }) => enabled)
        .map(({ method }) => method),
      lines: checkout.lines.map((line) => ({
        id: line.id,
        serviceId: line.snapshot.serviceId,
        serviceName: line.snapshot.serviceName,
        professionalId: line.snapshot.professionalId,
        professionalName: line.snapshot.professionalName,
        basePriceCents: line.snapshot.handoffPriceCents,
        priceCents: line.priceCents,
        netCents: line.netCents,
        priceOverrideReason: latestReason("line-price", line.id),
      })),
      tenders: checkout.tenders.map(mapTender),
      totalCents: checkout.total,
      receipts: checkout.receipts.map((receipt) => ({
        id: receipt.id,
        localDate: receipt.localDate,
        registeredAt: receipt.registeredAt,
        replacesReceiptId: receipt.replacesReceiptId ?? undefined,
        status: receipt.status,
        totalCents: receipt.totalCents,
      })),
    }
  }

  async updateLinePrice(input: CheckoutLinePriceInput) {
    const result = await request<ApiCheckout>(
      `/api/revenue-operations/checkouts/${encodeURIComponent(input.sessionId)}/lines/${encodeURIComponent(input.lineId)}`,
      {
        method: "PATCH",
        body: {
          expectedVersion: this.#version(input.sessionId),
          priceCents: input.priceCents,
          reason: input.reason,
          idempotencyKey: input.operationId,
        },
      },
    )
    return this.#checkout(result)
  }

  async updateAdjustments(input: CheckoutAdjustmentInput) {
    const result = await request<ApiCheckout>(
      `/api/revenue-operations/checkouts/${encodeURIComponent(input.sessionId)}/adjustments`,
      {
        method: "PUT",
        body: {
          expectedVersion: this.#version(input.sessionId),
          discountCents: input.discountCents,
          discountReason: input.discountReason,
          surchargeCents: input.surchargeCents,
          surchargeReason: input.surchargeReason,
          idempotencyKey: input.operationId,
        },
      },
    )
    return this.#checkout(result)
  }

  async replaceTenders(input: ReplaceTendersInput) {
    const result = await request<ApiCheckout>(
      `/api/revenue-operations/checkouts/${encodeURIComponent(input.sessionId)}/tenders`,
      {
        method: "PUT",
        body: {
          expectedVersion: this.#version(input.sessionId),
          tenders: input.tenders.map(({ method, appliedCents, receivedCents }) => ({
            method,
            appliedCents,
            ...(receivedCents === undefined ? {} : { receivedCents }),
          })),
          idempotencyKey: input.operationId,
        },
      },
    )
    return this.#checkout(result)
  }

  #version(checkoutId: string) {
    const version = this.#checkoutVersions.get(checkoutId)
    if (!version) throw new RevenueOperationsError("Recarregue a comanda.", "stale")
    return version
  }

  async completePayment(input: CompletePaymentInput) {
    const context = await request<{
      cashDay: null | { id: string; status: "open" | "closed"; version: number }
      checkoutVersion: number
    }>(
      `/api/revenue-operations/checkouts/${encodeURIComponent(input.sessionId)}/registration-context`,
    )
    if (!context.cashDay)
      throw new RevenueOperationsError(
        "Abra o caixa de hoje antes de registrar o pagamento.",
        "cash-day-required",
      )
    if (context.cashDay.status !== "open")
      throw new RevenueOperationsError("O caixa de hoje está fechado.", "cash-day-closed")
    const receipt = await request<ApiReceipt>(
      `/api/revenue-operations/checkouts/${encodeURIComponent(input.sessionId)}/register`,
      {
        method: "POST",
        body: {
          expectedCheckoutVersion: context.checkoutVersion,
          expectedDayVersion: context.cashDay.version,
          idempotencyKey: input.operationId,
        },
      },
    )
    return mapPaidSale(receipt, await this.getCheckoutById(input.sessionId))
  }

  async cancelReceipt(input: CancelReceiptInput) {
    const context = await request<{
      cashDay: null | { id: string; status: "open" | "closed"; version: number }
      checkoutVersion: number
    }>(
      `/api/revenue-operations/checkouts/${encodeURIComponent(input.checkoutId)}/registration-context`,
    )
    if (!context.cashDay)
      throw new RevenueOperationsError(
        "Abra o caixa de hoje antes de cancelar o registro.",
        "cash-day-required",
      )
    if (context.cashDay.status !== "open")
      throw new RevenueOperationsError("O caixa de hoje está fechado.", "cash-day-closed")
    await request<ApiReceipt>(
      `/api/revenue-operations/receipts/${encodeURIComponent(input.receiptId)}/cancel`,
      {
        method: "POST",
        body: {
          expectedCheckoutVersion: context.checkoutVersion,
          expectedDayVersion: context.cashDay.version,
          reason: input.reason,
          confirmOutsideTriad: true,
          idempotencyKey: input.operationId,
        },
      },
    )
    return this.getCheckoutById(input.checkoutId)
  }

  async getCheckoutById(checkoutId: string) {
    return this.#checkout(
      await request<ApiCheckout>(
        `/api/revenue-operations/checkouts/${encodeURIComponent(checkoutId)}`,
      ),
    )
  }

  async getPaidSale(sessionId: string) {
    const checkout = await this.getCheckout(sessionId)
    const latest = checkout.receipts?.find(({ status }) => status === "active")
    if (!latest) return undefined
    const receipt = await request<ApiReceipt>(
      `/api/revenue-operations/receipts/${encodeURIComponent(latest.id)}`,
    )
    return mapPaidSale(receipt, checkout)
  }

  async getOpenDaySummary(query: OperationalDayQuery) {
    const selected = await this.#unit(query.unitId)
    const params = new URLSearchParams({ unitId: selected.id, date: query.date })
    const result = await request<{ day: ApiCashDay | null }>(
      `/api/revenue-operations/cash-days?${params}`,
    )
    return result.day ? this.#cashDay(result.day, selected) : emptyCashDay(query.date, selected)
  }

  async openCashDay(unitId: string, openingCashCents: number, operationId: string) {
    const selected = await this.#unit(unitId)
    const day = await request<ApiCashDay>("/api/revenue-operations/cash-days", {
      method: "POST",
      body: { unitId: selected.id, openingCashCents, idempotencyKey: operationId },
    })
    return this.#openCashDay(day, selected)
  }

  async addCashMovement(input: {
    cashDayId: string
    kind: "supply" | "withdrawal"
    amountCents: number
    reason: string
    operationId: string
  }) {
    const day = await request<ApiCashDay>(
      `/api/revenue-operations/cash-days/${encodeURIComponent(input.cashDayId)}/movements`,
      {
        method: "POST",
        body: {
          kind: input.kind,
          amountCents: input.amountCents,
          reason: input.reason,
          expectedVersion: this.#dayVersion(input.cashDayId),
          idempotencyKey: input.operationId,
        },
      },
    )
    return this.#openCashDay(day, await this.#unit(day.unitId))
  }

  async reverseCashMovement(input: {
    cashDayId: string
    movementId: string
    operationId: string
    reason: string
  }) {
    const day = await request<ApiCashDay>(
      `/api/revenue-operations/cash-days/${encodeURIComponent(input.cashDayId)}/movements/${encodeURIComponent(input.movementId)}/reverse`,
      {
        method: "POST",
        body: {
          expectedVersion: this.#dayVersion(input.cashDayId),
          reason: input.reason,
          idempotencyKey: input.operationId,
        },
      },
    )
    return this.#openCashDay(day, await this.#unit(day.unitId))
  }

  async closeDay(input: CloseDayInput) {
    const current = await this.getOpenDaySummary(input)
    if (!current?.id || current.version === undefined)
      throw new RevenueOperationsError("O caixa não está aberto.", "not-ready")
    const day = await request<ApiCashDay>(
      `/api/revenue-operations/cash-days/${encodeURIComponent(current.id)}/close`,
      {
        method: "POST",
        body: {
          expectedVersion: current.version,
          countedCashCents: input.countedCashCents,
          reason: input.reason,
          idempotencyKey: input.operationId,
        },
      },
    )
    const closing = [...day.closings].reverse().find(({ kind }) => kind === "close")
    if (!closing) throw new RevenueOperationsError("Fechamento não encontrado.", "not-found")
    return this.#closing(day, closing, await this.#unit(day.unitId))
  }

  async reopenDay(cashDayId: string, operationId: string, reason: string) {
    const day = await request<ApiCashDay>(
      `/api/revenue-operations/cash-days/${encodeURIComponent(cashDayId)}/reopen`,
      {
        method: "POST",
        body: { expectedVersion: this.#dayVersion(cashDayId), reason, idempotencyKey: operationId },
      },
    )
    return this.#openCashDay(day, await this.#unit(day.unitId))
  }

  async listDailyClosings(query: ClosingHistoryQuery) {
    const selected = await this.#unit(query.unitId)
    const params = new URLSearchParams({
      unitId: selected.id,
      from: query.date,
      to: query.date,
      page: "1",
      pageSize: query.limit <= 10 ? "10" : query.limit <= 20 ? "20" : "50",
    })
    const result = await request<{ items: readonly { id: string }[] }>(
      `/api/revenue-operations/cash-days?${params}`,
    )
    const closings: DailyClosingSnapshot[] = []
    for (const item of result.items) {
      const day = await request<ApiCashDay>(
        `/api/revenue-operations/cash-days/${encodeURIComponent(item.id)}`,
      )
      for (const closing of day.closings)
        if (closing.kind === "close") closings.push(this.#closing(day, closing, selected))
    }
    return closings.slice(0, query.limit)
  }

  async getDailyClosing(query: ClosingDetailQuery) {
    const closings = await this.listDailyClosings({ ...query, limit: 50 })
    return closings.find(({ id }) => id === query.id)
  }

  #cashDay(day: ApiCashDay, selected: UnitOption): OpenDaySummary | DailyClosingSnapshot {
    this.#dayVersions.set(day.id, day.version)
    if (day.status === "closed") {
      const closing = [...day.closings].reverse().find(({ kind }) => kind === "close")
      if (closing) return this.#closing(day, closing, selected)
    }
    return {
      id: day.id,
      version: day.version,
      date: day.localDate,
      unitId: day.unitId,
      unitName: selected.name,
      status: "open",
      receivedCents: day.summary.netReceiptCents,
      paidSaleCount: day.summary.receiptCount - day.summary.reversalCount,
      expectedCashCents: day.summary.expectedCashCents,
      openingCashCents: day.summary.openingCashCents,
      supplyCents: day.summary.supplyCents,
      withdrawalCents: day.summary.withdrawalCents,
      receiptReversalCents: day.summary.cashReceiptReversalCents,
      reversedReceiptCents: day.summary.reversedReceiptCents,
      pendingCheckoutCount: day.summary.pendingCheckoutCount,
      noChargeCount: day.summary.noChargeCount,
      reversalCount: day.summary.reversalCount,
      discountCents: day.summary.discountCents,
      surchargeCents: day.summary.surchargeCents,
      paymentMethods: day.summary.paymentMethods.map(({ method, netCents }) => ({
        method,
        totalCents: netCents,
      })),
      cancellationCount: day.summary.reversalCount,
      noShowCount: 0,
      commissionCents: 0,
      barbershopCents: 0,
      professionals: [],
    }
  }

  #openCashDay(day: ApiCashDay, selected: UnitOption) {
    const summary = this.#cashDay(day, selected)
    if (summary.status !== "open")
      throw new RevenueOperationsError("O caixa operacional está fechado.", "cash-day-closed")
    return summary
  }

  #closing(day: ApiCashDay, closing: ApiClosing, selected: UnitOption): DailyClosingSnapshot {
    if (!closing.snapshot)
      throw new RevenueOperationsError("Fechamento não encontrado.", "not-found")
    const summary = this.#cashDay({ ...day, status: "open", summary: closing.snapshot }, selected)
    if (summary.status !== "open")
      throw new RevenueOperationsError("Fechamento inválido.", "not-found")
    return {
      ...summary,
      id: closing.id,
      status: "closed",
      countedCashCents: closing.snapshot.countedCashCents,
      differenceCents: closing.snapshot.differenceCents,
      reason: closing.reason ?? undefined,
      closedAt: closing.createdAt,
      responsiblePersonName: closing.actorDisplayName,
    }
  }

  #dayVersion(dayId: string) {
    const version = this.#dayVersions.get(dayId)
    if (!version) throw new RevenueOperationsError("Recarregue o caixa.", "stale")
    return version
  }

  async getDashboardProjection(): Promise<readonly RevenueDashboardProjection[]> {
    return []
  }
  async listPaidSales(): Promise<readonly PaidSale[]> {
    return []
  }
  async previewCommissions() {
    return []
  }
  async reset() {}
}

function mapTender(tender: ApiTender): PaymentTender {
  return {
    id: tender.id,
    method: tender.method,
    appliedCents: tender.appliedCents,
    receivedCents: tender.receivedCents ?? undefined,
  }
}

function mapPaidSale(receipt: ApiReceipt, checkout: Checkout): PaidSale {
  return {
    id: receipt.id,
    appointmentId: checkout.appointmentId,
    completedAt: receipt.registeredAt,
    source: checkout.source,
    unitId: checkout.unitId,
    discountCents: receipt.discountCents,
    surchargeCents: receipt.surchargeCents,
    totalCents: receipt.totalCents,
    commissions: [],
    lines: checkout.lines,
    tenders: (receipt.tenders ?? []).map(mapTender),
  }
}

function emptyCashDay(date: string, unit: UnitOption): OpenDaySummary {
  return {
    date,
    unitId: unit.id,
    unitName: unit.name,
    status: "open",
    receivedCents: 0,
    paidSaleCount: 0,
    expectedCashCents: 0,
    discountCents: 0,
    surchargeCents: 0,
    paymentMethods: [],
    cancellationCount: 0,
    noShowCount: 0,
    commissionCents: 0,
    barbershopCents: 0,
    professionals: [],
  }
}
