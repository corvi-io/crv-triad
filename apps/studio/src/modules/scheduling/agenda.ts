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
  AgendaView,
  Appointment,
  AppointmentStatus,
  Professional,
  SchedulingUnitId,
  Service,
} from "./contracts"
import { agendaViews, appointmentStatuses, schedulingUnitIds } from "./contracts"

export const agendaPeriodIds = [
  "today",
  "tomorrow",
  "this-week",
  "next-seven-days",
  "this-month",
  "custom",
] as const

export type AgendaPeriodId = (typeof agendaPeriodIds)[number]

export type ScheduleSearch = {
  appointment?: string
  client?: string
  customEnd?: string
  customStart?: string
  date: string
  period: AgendaPeriodId
  professional?: string
  scenario: string
  service?: string
  status?: string
  unit: SchedulingUnitId
  view: AgendaView
}

export type AgendaColumnId =
  | "confirmed"
  | "arrived"
  | "waiting"
  | "in-progress"
  | "completed"
  | "canceled-no-show"

export const agendaColumns: readonly {
  id: AgendaColumnId
  label: string
  statuses: readonly AppointmentStatus[]
}[] = [
  { id: "confirmed", label: "Confirmados", statuses: ["confirmed"] },
  { id: "arrived", label: "Check-in", statuses: ["arrived"] },
  { id: "waiting", label: "Em espera", statuses: ["waiting"] },
  { id: "in-progress", label: "Em atendimento", statuses: ["in-progress"] },
  { id: "completed", label: "Finalizados", statuses: ["completed"] },
  {
    id: "canceled-no-show",
    label: "Cancelados / No-show",
    statuses: ["canceled", "no-show"],
  },
]

export type AgendaFilters = {
  clientIds: readonly string[]
  endDate: string
  professionalIds: readonly string[]
  searchText: string
  serviceIds: readonly string[]
  startDate: string
  statusIds: readonly AppointmentStatus[]
  unitId: SchedulingUnitId
}

export type AgendaResult = {
  appointments: readonly Appointment[]
  boardAppointments: readonly Appointment[]
  counts: Record<AgendaColumnId, number>
  scheduledOutsideBoard: number
  total: number
  totalValueCents: number
}

export function columnForStatus(status: AppointmentStatus): AgendaColumnId | undefined {
  return agendaColumns.find((column) => column.statuses.includes(status))?.id
}

export function primaryStatusForColumn(columnId: AgendaColumnId): AppointmentStatus {
  return agendaColumns.find((column) => column.id === columnId)?.statuses[0] ?? "confirmed"
}

export function periodBounds(
  anchorDate: string,
  period: AgendaPeriodId,
  customStart?: string,
  customEnd?: string,
) {
  const anchor = parseISO(anchorDate)
  if (period === "tomorrow") {
    const tomorrow = format(addDays(anchor, 1), "yyyy-MM-dd")
    return { startDate: tomorrow, endDate: tomorrow }
  }
  if (period === "this-week") {
    return {
      startDate: format(startOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      endDate: format(endOfWeek(anchor, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    }
  }
  if (period === "next-seven-days") {
    return { startDate: anchorDate, endDate: format(addDays(anchor, 6), "yyyy-MM-dd") }
  }
  if (period === "this-month") {
    return {
      startDate: format(startOfMonth(anchor), "yyyy-MM-dd"),
      endDate: format(endOfMonth(anchor), "yyyy-MM-dd"),
    }
  }
  if (period === "custom" && customStart && customEnd && customStart <= customEnd) {
    return { startDate: customStart, endDate: customEnd }
  }
  return { startDate: anchorDate, endDate: anchorDate }
}

export function deriveAgendaResult(
  appointments: readonly Appointment[],
  professionals: readonly Professional[],
  services: readonly Service[],
  filters: AgendaFilters,
): AgendaResult {
  const professionalNames = new Map(professionals.map((item) => [item.id, item.name]))
  const serviceNames = new Map(services.map((item) => [item.id, item.name]))
  const normalizedSearch = normalize(filters.searchText)
  const appointmentsResult = appointments.filter((appointment) => {
    if (appointment.unitId !== filters.unitId) return false
    if (appointment.date < filters.startDate || appointment.date > filters.endDate) return false
    if (
      filters.professionalIds.length > 0 &&
      !filters.professionalIds.includes(appointment.professionalId)
    )
      return false
    if (filters.clientIds.length > 0 && !filters.clientIds.includes(appointment.clientId))
      return false
    if (filters.serviceIds.length > 0 && !filters.serviceIds.includes(appointment.serviceId))
      return false
    if (filters.statusIds.length > 0 && !filters.statusIds.includes(appointment.status))
      return false
    if (!normalizedSearch) return true
    return normalize(
      [
        appointment.id,
        appointment.customerName,
        professionalNames.get(appointment.professionalId),
        serviceNames.get(appointment.serviceId),
      ]
        .filter(Boolean)
        .join(" "),
    ).includes(normalizedSearch)
  })
  const counts = Object.fromEntries(agendaColumns.map(({ id }) => [id, 0])) as Record<
    AgendaColumnId,
    number
  >
  const boardAppointments = appointmentsResult.filter((appointment) => {
    const column = columnForStatus(appointment.status)
    if (!column) return false
    counts[column] += 1
    return true
  })
  return {
    appointments: appointmentsResult,
    boardAppointments,
    counts,
    scheduledOutsideBoard: appointmentsResult.filter(({ status }) => status === "scheduled").length,
    total: appointmentsResult.length,
    totalValueCents: appointmentsResult.reduce((total, item) => total + item.priceCents, 0),
  }
}

function validOpaqueId(value: unknown) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,95}$/i.test(value) ? value : undefined
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
}

export function parseIdList(value?: string) {
  return value?.split(",").filter(Boolean) ?? []
}

export function serializeIdList(values: readonly string[]) {
  return values.length > 0 ? [...values].sort().join(",") : undefined
}

export function validateScheduleSearch(
  search: Record<string, unknown>,
  fallbackDate: string,
): ScheduleSearch {
  const date = validDate(search.date) ?? fallbackDate
  return {
    appointment: validOpaqueId(search.appointment),
    client: validIdList(search.client),
    customEnd: validDate(search.customEnd),
    customStart: validDate(search.customStart),
    date,
    period:
      typeof search.period === "string" && agendaPeriodIds.includes(search.period as AgendaPeriodId)
        ? (search.period as AgendaPeriodId)
        : "today",
    professional: validIdList(search.professional),
    scenario: typeof search.scenario === "string" ? search.scenario : "normal",
    service: validIdList(search.service),
    status: validStatusList(search.status),
    unit:
      typeof search.unit === "string" && schedulingUnitIds.includes(search.unit as SchedulingUnitId)
        ? (search.unit as SchedulingUnitId)
        : "centro",
    view:
      typeof search.view === "string" && agendaViews.includes(search.view as AgendaView)
        ? (search.view as AgendaView)
        : "board",
  }
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : undefined
}

function validIdList(value: unknown) {
  return typeof value === "string" && /^[a-z0-9,-]{1,500}$/.test(value) ? value : undefined
}

function validStatusList(value: unknown) {
  if (typeof value !== "string") return undefined
  const values = value.split(",")
  return values.length > 0 &&
    values.every((item) => appointmentStatuses.includes(item as AppointmentStatus))
    ? values.sort().join(",")
    : undefined
}
