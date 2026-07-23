import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"

import type {
  DashboardFilters,
  DashboardPeriod,
} from "@/modules/shared/components/workspace-overview/model"

import { type SchedulingUnitId, schedulingUnitIds } from "./contracts"

export const dashboardPeriods = [
  "today",
  "yesterday",
  "this-week",
  "this-month",
  "custom",
] as const satisfies readonly DashboardPeriod[]

export type DashboardSearch = DashboardFilters & {
  date: string
  scenario: string
}

export function validateDashboardSearch(
  search: Record<string, unknown>,
  fallbackDate: string,
  allowedScenarioIds?: readonly string[],
): DashboardSearch {
  const date = validDate(search.date) ?? fallbackDate
  const period =
    typeof search.period === "string" && dashboardPeriods.includes(search.period as DashboardPeriod)
      ? (search.period as DashboardPeriod)
      : "today"
  const rawCustomStart = validDate(search.customStart)
  const rawCustomEnd = validDate(search.customEnd)
  const customBounds = boundCustomRange(rawCustomStart, rawCustomEnd, date)
  const scenario =
    typeof search.scenario === "string" &&
    safeId(search.scenario) &&
    (!allowedScenarioIds || allowedScenarioIds.includes(search.scenario))
      ? search.scenario
      : "normal"

  return {
    customEnd: period === "custom" ? customBounds.endDate : undefined,
    customStart: period === "custom" ? customBounds.startDate : undefined,
    date,
    period,
    professionalId:
      typeof search.professionalId === "string" && safeId(search.professionalId)
        ? search.professionalId
        : undefined,
    scenario,
    unitId:
      typeof search.unitId === "string" &&
      schedulingUnitIds.includes(search.unitId as SchedulingUnitId)
        ? (search.unitId as SchedulingUnitId)
        : "centro",
  }
}

export function dashboardBounds(search: DashboardSearch) {
  const anchor = parseISO(search.date)
  if (search.period === "yesterday") {
    const yesterday = format(addDays(anchor, -1), "yyyy-MM-dd")
    return { endDate: yesterday, startDate: yesterday }
  }
  if (search.period === "this-week") {
    return {
      endDate: format(endOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      startDate: format(startOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    }
  }
  if (search.period === "this-month") {
    return {
      endDate: format(endOfMonth(anchor), "yyyy-MM-dd"),
      startDate: format(startOfMonth(anchor), "yyyy-MM-dd"),
    }
  }
  if (search.period === "custom") {
    return boundCustomRange(search.customStart, search.customEnd, search.date)
  }
  return { endDate: search.date, startDate: search.date }
}

function boundCustomRange(start: string | undefined, end: string | undefined, fallback: string) {
  const startDate = start ?? fallback
  if (!end || end < startDate) return { endDate: startDate, startDate }
  const maximumEnd = format(addDays(parseISO(startDate), 30), "yyyy-MM-dd")
  return { endDate: end > maximumEnd ? maximumEnd : end, startDate }
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : undefined
}

function safeId(value: string) {
  return /^[a-z0-9-]{1,100}$/.test(value)
}
