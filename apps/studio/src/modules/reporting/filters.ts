import type { TenderMethod } from "@/modules/revenue-operations/contracts"
import { tenderMethods } from "@/modules/revenue-operations/contracts"
import { formatDateOnly, parseDateOnly } from "@/modules/shared/components/forms/date-picker"
import type { ReportFilters, ReportingScenarioId } from "./contracts"

export const MAX_REPORT_DAYS = 366

export type ReportSearch = {
  from: string
  paymentMethod?: TenderMethod
  professional?: string
  scenario: ReportingScenarioId
  service?: string
  to: string
}

const safeFacetId = /^[a-z0-9][a-z0-9-]{0,63}$/

export function currentMonth(dateOnly: string): Pick<ReportFilters, "from" | "to"> {
  const date = parseDateOnly(dateOnly)
  if (!date) throw new Error("Invalid source clock date.")
  return {
    from: formatDateOnly(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: formatDateOnly(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  }
}

export function normalizeReportSearch(
  search: Record<string, unknown>,
  sourceDate: string,
  scenarioIds: readonly ReportingScenarioId[] = ["typical"],
): ReportSearch {
  const defaults = currentMonth(sourceDate)
  const from = typeof search.from === "string" ? search.from : defaults.from
  const to = typeof search.to === "string" ? search.to : defaults.to
  const normalizedPeriod = normalizePeriod(from, to, defaults)

  return {
    ...normalizedPeriod,
    paymentMethod:
      typeof search.paymentMethod === "string" &&
      tenderMethods.includes(search.paymentMethod as TenderMethod)
        ? (search.paymentMethod as TenderMethod)
        : undefined,
    professional: normalizeFacet(search.professional),
    scenario:
      typeof search.scenario === "string" &&
      scenarioIds.includes(search.scenario as ReportingScenarioId)
        ? (search.scenario as ReportingScenarioId)
        : "typical",
    service: normalizeFacet(search.service),
  }
}

export function filtersFromSearch(search: ReportSearch): ReportFilters {
  return {
    from: search.from,
    paymentMethod: search.paymentMethod,
    professionalId: search.professional,
    serviceId: search.service,
    to: search.to,
  }
}

export function inclusiveDays(from: string, to: string): number {
  const start = parseDateOnly(from)
  const end = parseDateOnly(to)
  if (!start || !end) return 0
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

export function periodPreset(
  filters: Pick<ReportFilters, "from" | "to">,
  sourceDate: string,
): "today" | "last-7-days" | "current-month" | "custom" {
  if (filters.from === sourceDate && filters.to === sourceDate) return "today"
  const source = parseDateOnly(sourceDate)
  if (source) {
    const sevenDaysAgo = new Date(source)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    if (filters.from === formatDateOnly(sevenDaysAgo) && filters.to === sourceDate) {
      return "last-7-days"
    }
  }
  const month = currentMonth(sourceDate)
  if (filters.from === month.from && filters.to === month.to) return "current-month"
  return "custom"
}

export function periodForPreset(
  preset: "today" | "last-7-days" | "current-month",
  sourceDate: string,
) {
  if (preset === "today") return { from: sourceDate, to: sourceDate }
  if (preset === "current-month") return currentMonth(sourceDate)
  const source = parseDateOnly(sourceDate)
  if (!source) return currentMonth(sourceDate)
  const from = new Date(source)
  from.setDate(from.getDate() - 6)
  return { from: formatDateOnly(from), to: sourceDate }
}

function normalizePeriod(from: string, to: string, fallback: Pick<ReportFilters, "from" | "to">) {
  if (!parseDateOnly(from) || !parseDateOnly(to)) return fallback
  const days = inclusiveDays(from, to)
  if (days < 1 || days > MAX_REPORT_DAYS) return fallback
  return { from, to }
}

function normalizeFacet(value: unknown) {
  return typeof value === "string" && safeFacetId.test(value) ? value : undefined
}
