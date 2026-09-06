import { getApiUrl } from "@/modules/auth/services/auth-client"
import type {
  GeneratedReport,
  ReportCatalog,
  ReportingQuery,
  ReportingRepository,
  ReportingResult,
} from "./contracts"

const paymentMethods = [
  { id: "pix" as const, label: "Pix" },
  { id: "cash" as const, label: "Dinheiro" },
  { id: "debit" as const, label: "Débito" },
  { id: "credit" as const, label: "Crédito" },
]

export class ReportingHttpRepository implements ReportingRepository {
  async getReport(query: ReportingQuery): Promise<ReportingResult> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query.filters)) if (value) params.set(key, value)
    const result = await request<ApiSummary>(`/api/reports/summary?${params}`)
    const summary = result.summary
    return {
      appliedFilters: query.filters,
      averageTicket: {
        paidSaleCount: summary.receiptCount,
        ticketCents: summary.receiptCount
          ? Math.round(summary.netRevenueCents / summary.receiptCount)
          : null,
        totalRevenueCents: summary.netRevenueCents,
      },
      cancellations: {
        cancellationCount: 0,
        cancellationRateBasisPoints: 0,
        denominator: summary.receiptCount,
        noShowCount: 0,
        noShowRateBasisPoints: 0,
      },
      commissions: {
        items: [],
        totalCommissionCents: summary.commissionCents,
        totalServiceRevenueCents: summary.netRevenueCents,
      },
      customers: {
        identifiableCount: 0,
        newCount: 0,
        newRateBasisPoints: 0,
        returningCount: 0,
        returningRateBasisPoints: 0,
        unknownCount: 0,
        unavailableReason:
          result.coverage.customers === "partial"
            ? "Histórico de clientes parcialmente disponível neste período."
            : undefined,
      },
      facets: { paymentMethods, professionals: [], services: [], units: [] },
      professionalAttendance: { items: [], unitLabel: "serviços realizados" },
      revenue: { series: [], totalCents: summary.netRevenueCents },
      sourceDate: new Date().toISOString().slice(0, 10),
      summary: {
        paidSaleCount: summary.receiptCount,
        performedServiceCount: summary.performedItems,
        totalCommissionCents: summary.commissionCents,
        totalRevenueCents: summary.netRevenueCents,
      },
      topServices: { items: [] },
    }
  }
  listExports() {
    return request<readonly GeneratedReport[]>("/api/reports/generated")
  }
  getExport(id: string) {
    return request<GeneratedReport | null>(`/api/reports/generated/${encodeURIComponent(id)}`)
  }
  getExportCatalog() {
    return request<ReportCatalog>("/api/reports/catalog")
  }
  createExport(input: Parameters<NonNullable<ReportingRepository["createExport"]>>[0]) {
    return request<GeneratedReport>("/api/reports/generated", {
      method: "POST",
      body: {
        ...input,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    })
  }
  retryExport(id: string) {
    return request<GeneratedReport | null>(
      `/api/reports/generated/${encodeURIComponent(id)}/retry`,
      { method: "POST" },
    )
  }
  async downloadExport(id: string) {
    return (
      await request<{ url: string }>(`/api/reports/generated/${encodeURIComponent(id)}/download`)
    ).url
  }
  async reset() {}
  retry() {}
  today() {
    return new Date().toISOString().slice(0, 10)
  }
}

type ApiSummary = {
  coverage: { customers: "complete" | "partial" }
  summary: {
    barbershopShareCents: number
    commissionCents: number
    grossCents: number
    netRevenueCents: number
    performedItems: number
    receiptCount: number
    reversalCount: number
  }
}
async function request<T>(path: string, options: { body?: unknown; method?: string } = {}) {
  const response = await fetch(getApiUrl(path), {
    credentials: "include",
    method: options.method ?? "GET",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: options.body === undefined ? undefined : { "content-type": "application/json" },
  })
  if (response.ok) return response.json() as Promise<T>
  const error = (await response.json().catch(() => ({}))) as { code?: string }
  if (response.status === 403)
    throw new Error("Você não tem permissão para acessar estes relatórios.")
  if (response.status === 503)
    throw new Error("A geração de relatórios está indisponível neste ambiente.")
  throw new Error(
    error.code === "invalid_request"
      ? "Revise os filtros informados."
      : "Não foi possível concluir a operação.",
  )
}
