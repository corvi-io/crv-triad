import type { SchedulingUnitId } from "@/modules/scheduling/contracts"

export type MoneyCents = number
export type BasisPoints = number

export type CheckoutLine = {
  id: string
  serviceId: string
  serviceName: string
  professionalId: string
  professionalName: string
  basePriceCents: MoneyCents
  priceCents: MoneyCents
  netCents: MoneyCents
  priceOverrideReason?: string
}

export type CheckoutAdjustment = {
  discountCents: MoneyCents
  discountReason?: string
  surchargeCents: MoneyCents
  surchargeReason?: string
}

export const tenderMethods = ["pix", "cash", "debit", "credit"] as const
export type TenderMethod = (typeof tenderMethods)[number]

export type PaymentTender = {
  id: string
  method: TenderMethod
  appliedCents: MoneyCents
  receivedCents?: MoneyCents
}

export type CommissionRule =
  | {
      id: string
      kind: "percentage"
      rateBasisPoints: BasisPoints
      source: "service-professional" | "professional-default"
    }
  | {
      fixedCents: MoneyCents
      id: string
      kind: "fixed"
      source: "service-professional"
    }
  | {
      id: string
      kind: "none"
      source: "service-professional" | "fallback"
    }

export type ItemCommissionSnapshot = {
  barbershopCents: MoneyCents
  baseCents: MoneyCents
  commissionCents: MoneyCents
  lineId: string
  professionalId: string
  professionalName: string
  rule: CommissionRule
}

export type CheckoutStatus = "open" | "paid" | "registered"

export type ReceiptSummary = {
  id: string
  localDate: string
  registeredAt: string
  replacesReceiptId?: string
  status: "active" | "reversed"
  totalCents: MoneyCents
}

export type Checkout = {
  adjustmentAuthorized: boolean
  adjustments: CheckoutAdjustment
  availableTenderMethods: readonly TenderMethod[]
  appointmentId?: string
  customerName: string
  finishedAt: string
  id: string
  lines: readonly CheckoutLine[]
  source: "scheduled" | "walk-in"
  status: CheckoutStatus
  tenders: readonly PaymentTender[]
  totalCents: MoneyCents
  unitId: SchedulingUnitId
  unitName: string
  version?: number
  receipts?: readonly ReceiptSummary[]
}

export type PaidSale = {
  appointmentId?: string
  commissions: readonly ItemCommissionSnapshot[]
  completedAt: string
  discountCents: MoneyCents
  id: string
  lines: readonly CheckoutLine[]
  source: "scheduled" | "walk-in"
  surchargeCents: MoneyCents
  tenders: readonly PaymentTender[]
  totalCents: MoneyCents
  unitId: SchedulingUnitId
}

export type OperationalDayQuery = {
  date: string
  scenarioId?: string
  unitId: SchedulingUnitId
}

export type PaymentMethodSummary = {
  method: TenderMethod
  totalCents: MoneyCents
}

export type ProfessionalRevenueSummary = {
  barbershopCents: MoneyCents
  commissionCents: MoneyCents
  professionalId: string
  professionalName: string
  revenueCents: MoneyCents
}

export type OpenDaySummary = {
  barbershopCents: MoneyCents
  cancellationCount: number
  commissionCents: MoneyCents
  date: string
  discountCents: MoneyCents
  expectedCashCents: MoneyCents
  noShowCount: number
  paidSaleCount: number
  paymentMethods: readonly PaymentMethodSummary[]
  professionals: readonly ProfessionalRevenueSummary[]
  receivedCents: MoneyCents
  status: "open"
  surchargeCents: MoneyCents
  unitId: SchedulingUnitId
  unitName: string
  id?: string
  version?: number
  openingCashCents?: MoneyCents
  supplyCents?: MoneyCents
  withdrawalCents?: MoneyCents
  receiptReversalCents?: MoneyCents
  reversedReceiptCents?: MoneyCents
  pendingCheckoutCount?: number
  noChargeCount?: number
  reversalCount?: number
}

export type CashCount = {
  countedCashCents: MoneyCents
  differenceCents: MoneyCents
  reason?: string
}

export type DailyClosingSnapshot = Omit<OpenDaySummary, "status"> &
  CashCount & {
    closedAt: string
    id: string
    responsiblePersonName: string
    status: "closed"
  }

export type CloseDayInput = {
  countedCashCents: MoneyCents
  date: string
  operationId: string
  reason?: string
  scenarioId?: string
  unitId: SchedulingUnitId
}

export type ClosingHistoryQuery = OperationalDayQuery & {
  limit: number
}

export type ClosingDetailQuery = OperationalDayQuery & {
  id: string
}

export type RevenueDashboardProjection = {
  appointmentId?: string
  completedAt: string
  discountCents: MoneyCents
  lineValues: readonly { professionalId: string; serviceId: string; valueCents: MoneyCents }[]
  payments: readonly { method: TenderMethod; valueCents: MoneyCents }[]
  totalCents: MoneyCents
  unitId: SchedulingUnitId
}

export type CheckoutAdjustmentInput = CheckoutAdjustment & {
  operationId: string
  sessionId: string
}

export type CheckoutLinePriceInput = {
  lineId: string
  operationId: string
  priceCents: MoneyCents
  reason: string
  sessionId: string
}

export type ReplaceTendersInput = {
  operationId: string
  sessionId: string
  tenders: readonly PaymentTender[]
}

export type CompletePaymentInput = {
  operationId: string
  sessionId: string
}

export type CancelReceiptInput = {
  checkoutId: string
  operationId: string
  reason: string
  receiptId: string
}

export type PrototypeCheckoutPolicy = {
  getActivePaymentMethodIds(): Promise<readonly TenderMethod[]>
  getCommissionRateBasisPoints(
    professionalId: string,
    serviceId: string,
  ): Promise<number | undefined>
}

export type RevenueOperationsRepository = {
  closeDay(input: CloseDayInput): Promise<DailyClosingSnapshot>
  completePayment(input: CompletePaymentInput): Promise<PaidSale>
  getDailyClosing(query: ClosingDetailQuery): Promise<DailyClosingSnapshot | undefined>
  getCheckout(sessionId: string): Promise<Checkout>
  getDashboardProjection(): Promise<readonly RevenueDashboardProjection[]>
  getOpenDaySummary(query: OperationalDayQuery): Promise<OpenDaySummary | DailyClosingSnapshot>
  getPaidSale(sessionId: string): Promise<PaidSale | undefined>
  listDailyClosings(query: ClosingHistoryQuery): Promise<readonly DailyClosingSnapshot[]>
  listPaidSales(): Promise<readonly PaidSale[]>
  previewCommissions(sessionId: string): Promise<readonly ItemCommissionSnapshot[]>
  replaceTenders(input: ReplaceTendersInput): Promise<Checkout>
  reset(): Promise<void>
  updateAdjustments(input: CheckoutAdjustmentInput): Promise<Checkout>
  updateLinePrice(input: CheckoutLinePriceInput): Promise<Checkout>
  cancelReceipt?(input: CancelReceiptInput): Promise<Checkout>
  openCheckout?(sessionId: string, operationId: string): Promise<Checkout>
  openCashDay?(
    unitId: string,
    openingCashCents: number,
    operationId: string,
  ): Promise<OpenDaySummary>
  addCashMovement?(input: {
    cashDayId: string
    kind: "supply" | "withdrawal"
    amountCents: number
    reason: string
    operationId: string
  }): Promise<OpenDaySummary>
  reverseCashMovement?(input: {
    cashDayId: string
    movementId: string
    operationId: string
    reason: string
  }): Promise<OpenDaySummary>
  reopenDay?(cashDayId: string, operationId: string, reason: string): Promise<OpenDaySummary>
  units?(): Promise<readonly { id: string; name: string; timezone: string | null }[]>
}

export class RevenueOperationsError extends Error {
  readonly code:
    | "already-paid"
    | "already-closed"
    | "declined"
    | "invalid-cash-count"
    | "invalid-adjustment"
    | "invalid-tender"
    | "not-found"
    | "not-ready"
    | "stale"
    | "cash-day-required"
    | "cash-day-closed"
    | "forbidden"
    | "network-error"
    | "idempotency-conflict"

  constructor(
    message: string,
    code:
      | "already-paid"
      | "already-closed"
      | "declined"
      | "invalid-cash-count"
      | "invalid-adjustment"
      | "invalid-tender"
      | "not-found"
      | "not-ready"
      | "stale"
      | "cash-day-required"
      | "cash-day-closed"
      | "forbidden"
      | "network-error"
      | "idempotency-conflict",
  ) {
    super(message)
    this.code = code
    this.name = "RevenueOperationsError"
  }
}
