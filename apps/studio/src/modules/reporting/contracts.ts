import type { BasisPoints, MoneyCents, TenderMethod } from "@/modules/revenue-operations/contracts"
import type { AppointmentStatus } from "@/modules/scheduling/contracts"

export type ReportingScenarioId =
  | "production"
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
  unitId?: string
}

export type ReportingQuery = {
  filters: ReportFilters
  scenarioId: ReportingScenarioId
}

export type GeneratedReport = {
  activeAttempt: number
  completedAt?: string | null
  createdAt: string
  emailDeliveryStatus?: "failed" | "pending" | "sending" | "sent"
  format: "csv" | "pdf"
  id: string
  idempotencyKey?: string
  reportType?: ReportDefinitionId
  safeFailureCode?: string | null
  status: "expired" | "failed" | "queued" | "ready" | "running"
}

export type ReportDefinitionId =
  | "sales_revenue"
  | "professional_performance"
  | "commissions"
  | "new_returning_customers"
  | "cancellations_no_shows"
  | "cash_payments"

export type ReportFilterId = "dateRange" | "unit" | "professional" | "service" | "paymentMethod"

export type ReportCatalogItem = {
  description: string
  formats: readonly ("csv" | "pdf")[]
  id: ReportDefinitionId
  supportedFilters: readonly ReportFilterId[]
  title: string
  version: number
}

export type ReportCatalog = {
  items: readonly ReportCatalogItem[]
  requester: { maskedEmail: string; verified: true }
  schemaVersion: 1
}

export type CreateReportExportInput = {
  filters: ReportFilters
  format: "csv" | "pdf"
  idempotencyKey: string
  reportType: ReportDefinitionId
}

export type ReportFacet = {
  id: string
  label: string
}

export type ReportingFacets = {
  paymentMethods: readonly { id: TenderMethod; label: string }[]
  professionals: readonly ReportFacet[]
  services: readonly ReportFacet[]
  units: readonly ReportFacet[]
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
  createExport?(input: CreateReportExportInput): Promise<GeneratedReport>
  downloadExport?(id: string): Promise<string>
  getExport?(id: string): Promise<GeneratedReport | null>
  getExportCatalog?(): Promise<ReportCatalog>
  listExports?(): Promise<readonly GeneratedReport[]>
  getReport(query: ReportingQuery): Promise<ReportingResult>
  retryExport?(id: string): Promise<GeneratedReport | null>
  retryExportDelivery?(id: string): Promise<GeneratedReport | null>
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
