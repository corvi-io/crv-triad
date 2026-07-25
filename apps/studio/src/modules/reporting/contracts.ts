import type { BasisPoints, MoneyCents, TenderMethod } from "@/modules/revenue-operations/contracts"
import type { AppointmentStatus } from "@/modules/scheduling/contracts"

export type ReportingScenarioId =
  | "typical"
  | "empty"
  | "edge"
  | "partial"
  | "zero-paid-sales"
  | "unknown-customers"
  | "ties"
  | "long-labels"
  | "slow"
  | "next-failure"
  | "persistent-error"

export type ReportFilters = {
  from: string
  paymentMethod?: TenderMethod
  professionalId?: string
  serviceId?: string
  to: string
}

export type ReportingQuery = {
  filters: ReportFilters
  scenarioId: ReportingScenarioId
}

export type ReportFacet = {
  id: string
  label: string
}

export type ReportingFacets = {
  paymentMethods: readonly { id: TenderMethod; label: string }[]
  professionals: readonly ReportFacet[]
  services: readonly ReportFacet[]
}

export type ReportingFactSnapshot = {
  appointmentStatus: AppointmentStatus
  commissionCents: MoneyCents
  commissionRateBasisPoints: BasisPoints
  customerAnalysisKey?: string
  date: string
  id: string
  paymentAllocations: readonly {
    commissionCents: MoneyCents
    method: TenderMethod
    serviceNetCents: MoneyCents
  }[]
  professionalId: string
  professionalName: string
  saleId?: string
  serviceId: string
  serviceName: string
  serviceNetCents: MoneyCents
}

export type RankedMoneyItem = {
  id: string
  label: string
  quantity: number
  valueCents: MoneyCents
}

export type ReportingResult = {
  appliedFilters: ReportFilters
  averageTicket: {
    paidSaleCount: number
    ticketCents: MoneyCents | null
    totalRevenueCents: MoneyCents
  }
  cancellations: {
    cancellationCount: number
    cancellationRateBasisPoints: BasisPoints
    denominator: number
    noShowCount: number
    noShowRateBasisPoints: BasisPoints
  }
  commissions: {
    items: readonly RankedMoneyItem[]
    totalCommissionCents: MoneyCents
    totalServiceRevenueCents: MoneyCents
  }
  customers: {
    identifiableCount: number
    newCount: number
    newRateBasisPoints: BasisPoints
    returningCount: number
    returningRateBasisPoints: BasisPoints
    unknownCount: number
    unavailableReason?: string
  }
  facets: ReportingFacets
  professionalAttendance: {
    items: readonly RankedMoneyItem[]
    unitLabel: string
  }
  revenue: {
    series: readonly { date: string; valueCents: MoneyCents }[]
    totalCents: MoneyCents
  }
  sourceDate: string
  summary: {
    paidSaleCount: number
    performedServiceCount: number
    totalCommissionCents: MoneyCents
    totalRevenueCents: MoneyCents
  }
  topServices: {
    items: readonly RankedMoneyItem[]
  }
}

export type ReportingRepository = {
  getReport(query: ReportingQuery): Promise<ReportingResult>
  reset(): Promise<void>
  retry(): void
  today(): string
}

export class ReportingOperationInvalidatedError extends Error {
  constructor() {
    super("A consulta foi descartada porque o cenário ativo mudou.")
    this.name = "ReportingOperationInvalidatedError"
  }
}
