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

export type CheckoutStatus = "open" | "paid"

export type Checkout = {
  adjustmentAuthorized: boolean
  adjustments: CheckoutAdjustment
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
  responsiblePersonName: string
  scenarioId?: string
  unitId: SchedulingUnitId
}

export type ClosingHistoryQuery = {
  limit: number
  scenarioId?: string
  unitId: SchedulingUnitId
}

export type ClosingDetailQuery = {
  id: string
  unitId: SchedulingUnitId
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
      | "stale",
  ) {
    super(message)
    this.code = code
    this.name = "RevenueOperationsError"
  }
}
