import { differenceInCalendarDays, format } from "date-fns"

import type { WorkspaceOverviewModel } from "@/modules/shared/components/workspace-overview/model"

import type { Appointment, AppointmentStatus, ScheduleDay, SchedulePeriod } from "./contracts"
import { appointmentStatuses } from "./contracts"
import { appointmentStatusPresentation, isTerminalAppointmentStatus } from "./status"

type DashboardProjectionInput = {
  bounds: { endDate: string; startDate: string }
  day: ScheduleDay
  filters: WorkspaceOverviewModel["filters"]
  now: Date
  updatedAt: number
}

type MutableProfessional = {
  appointmentCount: number
  bookedMinutes: number
  paidValueCents: number
}

type MutableService = {
  count: number
  paidValueCents: number
  scheduledValueCents: number
}

const capacityBands = [
  { end: 12 * 60, id: "morning", label: "Manhã", range: "08h–12h", start: 8 * 60 },
  { end: 18 * 60, id: "afternoon", label: "Tarde", range: "12h–18h", start: 12 * 60 },
  { end: 22 * 60, id: "evening", label: "Noite", range: "18h–22h", start: 18 * 60 },
] as const

export function deriveDashboard({
  bounds,
  day,
  filters,
  now,
  updatedAt,
}: DashboardProjectionInput): WorkspaceOverviewModel {
  const professionalNames = new Map(day.professionals.map(({ id, name }) => [id, name]))
  const serviceNames = new Map(day.services.map(({ id, name }) => [id, name]))
  const selectedProfessionalId = professionalNames.has(filters.professionalId ?? "")
    ? filters.professionalId
    : undefined
  const selectedProfessionals = selectedProfessionalId
    ? day.professionals.filter(({ id }) => id === selectedProfessionalId)
    : day.professionals
  const selectedProfessionalIds = new Set(selectedProfessionals.map(({ id }) => id))
  const appointments = day.appointments.filter(
    ({ date, professionalId }) =>
      date >= bounds.startDate &&
      date <= bounds.endDate &&
      selectedProfessionalIds.has(professionalId),
  )
  const professionalTotals = new Map<string, MutableProfessional>(
    selectedProfessionals.map(({ id }) => [
      id,
      { appointmentCount: 0, bookedMinutes: 0, paidValueCents: 0 },
    ]),
  )
  const serviceTotals = new Map<string, MutableService>()
  const statusCounts = Object.fromEntries(
    appointmentStatuses.map((status) => [status, 0]),
  ) as Record<AppointmentStatus, number>
  const clientCounts = new Map<string, number>()
  const completedClientIds = new Set<string>()
  let bookedMinutes = 0
  let canceledCount = 0
  let completedCount = 0
  let noShowCount = 0
  let paidCompletedCount = 0
  let paidValueCents = 0
  let pendingCompletedValueCents = 0
  let potentialLossCents = 0
  let scheduledValueCents = 0

  for (const appointment of appointments) {
    statusCounts[appointment.status] += 1
    clientCounts.set(appointment.clientId, (clientCounts.get(appointment.clientId) ?? 0) + 1)
    const professional = professionalTotals.get(appointment.professionalId)
    const service = serviceTotals.get(appointment.serviceId) ?? {
      count: 0,
      paidValueCents: 0,
      scheduledValueCents: 0,
    }
    service.count += 1
    service.scheduledValueCents += appointment.priceCents
    serviceTotals.set(appointment.serviceId, service)

    if (appointment.status === "canceled" || appointment.status === "no-show") {
      potentialLossCents += appointment.priceCents
      if (appointment.status === "canceled") canceledCount += 1
      else noShowCount += 1
    } else {
      bookedMinutes += appointment.durationMinutes
      scheduledValueCents += appointment.priceCents
      if (professional) {
        professional.appointmentCount += 1
        professional.bookedMinutes += appointment.durationMinutes
      }
    }

    if (appointment.status === "completed") {
      completedCount += 1
      completedClientIds.add(appointment.clientId)
      if (appointment.paymentStatus === "paid") {
        paidCompletedCount += 1
        paidValueCents += appointment.priceCents
        service.paidValueCents += appointment.priceCents
        if (professional) professional.paidValueCents += appointment.priceCents
      } else {
        pendingCompletedValueCents += appointment.priceCents
      }
    }
  }

  const dayCount = Math.max(
    1,
    differenceInCalendarDays(parseDate(bounds.endDate), parseDate(bounds.startDate)) + 1,
  )
  const availableByProfessional = new Map(
    selectedProfessionals.map(({ id }) => [id, availableMinutesForProfessional(day, id, dayCount)]),
  )
  const availableMinutes = Array.from(availableByProfessional.values()).reduce(
    (total, value) => total + value,
    0,
  )
  const occupancyPercent = percent(bookedMinutes, availableMinutes)
  const upcoming = appointments
    .filter(
      (appointment) =>
        !isTerminalAppointmentStatus(appointment.status) && appointmentTime(appointment) >= now,
    )
    .toSorted(compareAppointments)
    .slice(0, 6)
    .map((appointment) => ({
      customerName: appointment.customerName,
      date: appointment.date,
      id: appointment.id,
      professionalName: professionalNames.get(appointment.professionalId) ?? "Não informado",
      serviceName: serviceNames.get(appointment.serviceId) ?? "Não informado",
      start: appointment.start,
      status: appointmentStatusPresentation[appointment.status].label,
      statusClassName: appointmentStatusPresentation[appointment.status].badgeClassName,
    }))

  return {
    attention: deriveAttention(appointments, professionalNames, now),
    cancellations: {
      canceledCount,
      noShowCount,
      potentialValue: currency(potentialLossCents),
      rate: `${percent(canceledCount + noShowCount, appointments.length)}%`,
    },
    capacity: {
      availableMinutes,
      bands: capacityBands.map((band) => {
        const bandAvailable = selectedProfessionals.reduce(
          (total, professional) =>
            total + availableBandMinutes(day, professional.id, dayCount, band.start, band.end),
          0,
        )
        const bandBooked = appointments.reduce(
          (total, appointment) =>
            appointment.status === "canceled" || appointment.status === "no-show"
              ? total
              : total + appointmentOverlap(appointment, band.start, band.end),
          0,
        )
        return {
          availableMinutes: bandAvailable,
          bookedMinutes: bandBooked,
          id: band.id,
          label: band.label,
          occupancyPercent: percent(bandBooked, bandAvailable),
          range: band.range,
        }
      }),
      bookedMinutes,
      freeMinutes: Math.max(0, availableMinutes - bookedMinutes),
    },
    clients: {
      completedUniqueCount: completedClientIds.size,
      newClientCount: undefined,
      repeatedInPeriodCount: Array.from(clientCounts.values()).filter((count) => count > 1).length,
    },
    filters: { ...filters, professionalId: selectedProfessionalId },
    finance: {
      discounts: undefined,
      paidValue: currency(paidValueCents),
      paymentMethods: undefined,
      pendingCompletedValue: currency(pendingCompletedValueCents),
      scheduledValue: currency(scheduledValueCents),
    },
    flow: appointmentStatuses.map((status) => ({
      count: statusCounts[status],
      id: status,
      label: appointmentStatusPresentation[status].label,
      status,
      statusClassName: appointmentStatusPresentation[status].badgeClassName,
    })),
    metrics: [
      {
        description: "Todos os agendamentos no período selecionado.",
        id: "appointments",
        label: "Agendamentos",
        value: String(appointments.length),
      },
      {
        description: `${percent(completedCount, appointments.length)}% dos agendamentos do período.`,
        id: "completed",
        label: "Concluídos",
        value: String(completedCount),
      },
      {
        description: "Valor de agendamentos finalizados marcados como pagos na fonte atual.",
        id: "paid-value",
        label: "Valor em estado pago",
        value: currency(paidValueCents),
      },
      {
        description: "Média dos agendamentos finalizados marcados como pagos.",
        id: "paid-average",
        label: "Média em estado pago",
        value:
          paidCompletedCount > 0
            ? currency(Math.round(paidValueCents / paidCompletedCount))
            : "Indisponível",
      },
      {
        description: `${minutesLabel(bookedMinutes)} reservados de ${minutesLabel(availableMinutes)} disponíveis.`,
        id: "occupancy",
        label: "Ocupação",
        value: `${occupancyPercent}%`,
      },
    ],
    professionalOptions: day.professionals.map(({ id, name }) => ({ id, label: name })),
    professionals: selectedProfessionals.map(({ id, name }) => {
      const totals = professionalTotals.get(id) ?? {
        appointmentCount: 0,
        bookedMinutes: 0,
        paidValueCents: 0,
      }
      const professionalAvailableMinutes = availableByProfessional.get(id) ?? 0
      return {
        appointmentCount: totals.appointmentCount,
        availableMinutes: professionalAvailableMinutes,
        bookedMinutes: totals.bookedMinutes,
        id,
        name,
        occupancyPercent: percent(totals.bookedMinutes, professionalAvailableMinutes),
        paidValue: currency(totals.paidValueCents),
        state: professionalState(id, appointments, day.periods, day, now),
      }
    }),
    services: Array.from(serviceTotals.entries())
      .map(([id, totals]) => ({
        count: totals.count,
        id,
        name: serviceNames.get(id) ?? "Serviço não informado",
        paidValue: currency(totals.paidValueCents),
        scheduledValue: currency(totals.scheduledValueCents),
      }))
      .toSorted((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 5),
    unitOptions: [
      { id: "centro", label: "Centro" },
      { id: "artesao", label: "Artesão" },
    ],
    updatedLabel: `Atualizado às ${format(new Date(updatedAt || now.getTime()), "HH:mm")}`,
    upcoming,
  }
}

function deriveAttention(
  appointments: readonly Appointment[],
  professionalNames: ReadonlyMap<string, string>,
  now: Date,
): WorkspaceOverviewModel["attention"] {
  const items: WorkspaceOverviewModel["attention"][number][] = []
  const sorted = appointments.toSorted(compareAppointments)
  for (const appointment of sorted) {
    const scheduledAt = appointmentTime(appointment)
    const endsAt = new Date(scheduledAt.getTime() + appointment.durationMinutes * 60_000)
    if (appointment.status === "waiting") {
      const waitMinutes = Math.max(0, Math.floor((now.getTime() - scheduledAt.getTime()) / 60_000))
      items.push({
        appointmentId: appointment.id,
        description: `${appointment.start} com ${professionalNames.get(appointment.professionalId) ?? "profissional não informado"}.`,
        id: `waiting-${appointment.id}`,
        title:
          waitMinutes > 0
            ? `${appointment.customerName} aguarda há ${waitMinutes} min`
            : `${appointment.customerName} está em espera`,
        tone: "warning",
      })
    } else if (appointment.status === "completed" && appointment.paymentStatus === "pending") {
      items.push({
        appointmentId: appointment.id,
        description: `${currency(appointment.priceCents)} em decisão visual de pagamento.`,
        id: `payment-${appointment.id}`,
        title: `Pagamento de ${appointment.customerName} está pendente`,
        tone: "warning",
      })
    } else if (appointment.status === "in-progress" && endsAt < now) {
      items.push({
        appointmentId: appointment.id,
        description: `Previsão de término às ${timeAfter(appointment.start, appointment.durationMinutes)}.`,
        id: `running-${appointment.id}`,
        title: `Atendimento de ${appointment.customerName} passou do horário previsto`,
        tone: "danger",
      })
    } else if (
      appointment.status === "scheduled" &&
      scheduledAt >= now &&
      scheduledAt.getTime() - now.getTime() <= 60 * 60_000
    ) {
      items.push({
        appointmentId: appointment.id,
        description: `${appointment.start} com ${professionalNames.get(appointment.professionalId) ?? "profissional não informado"}.`,
        id: `scheduled-${appointment.id}`,
        title: `${appointment.customerName} ainda não confirmou`,
        tone: "info",
      })
    }
  }

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    if (
      previous.date === current.date &&
      previous.professionalId === current.professionalId &&
      previous.status !== "canceled" &&
      previous.status !== "no-show" &&
      current.status !== "canceled" &&
      current.status !== "no-show" &&
      appointmentTime(previous).getTime() + previous.durationMinutes * 60_000 >
        appointmentTime(current).getTime()
    ) {
      items.push({
        appointmentId: current.id,
        description: `${professionalNames.get(current.professionalId) ?? "Profissional"} tem horários sobrepostos.`,
        id: `conflict-${previous.id}-${current.id}`,
        title: `Conflito de horário às ${current.start}`,
        tone: "danger",
      })
    }
  }
  return items.slice(0, 5)
}

function availableMinutesForProfessional(
  day: ScheduleDay,
  professionalId: string,
  dayCount: number,
) {
  return availableBandMinutes(
    day,
    professionalId,
    dayCount,
    toMinutes(day.startTime),
    toMinutes(day.endTime),
  )
}

function availableBandMinutes(
  day: ScheduleDay,
  professionalId: string,
  dayCount: number,
  bandStart: number,
  bandEnd: number,
) {
  const workStart = Math.max(toMinutes(day.startTime), bandStart)
  const workEnd = Math.min(toMinutes(day.endTime), bandEnd)
  if (workEnd <= workStart) return 0
  const unavailable = day.periods
    .filter(({ kind, professionalId: owner }) => kind !== "walk-in" && owner === professionalId)
    .reduce(
      (total, period) =>
        total + overlapMinutes(toMinutes(period.start), toMinutes(period.end), workStart, workEnd),
      0,
    )
  return Math.max(0, workEnd - workStart - unavailable) * dayCount
}

function professionalState(
  professionalId: string,
  appointments: readonly Appointment[],
  periods: readonly SchedulePeriod[],
  day: ScheduleDay,
  now: Date,
) {
  const currentDate = format(now, "yyyy-MM-dd")
  const currentMinute = now.getHours() * 60 + now.getMinutes()
  if (currentMinute < toMinutes(day.startTime) || currentMinute >= toMinutes(day.endTime)) {
    return "Fora do expediente"
  }
  if (
    periods.some(
      (period) =>
        period.professionalId === professionalId &&
        period.kind === "break" &&
        currentMinute >= toMinutes(period.start) &&
        currentMinute < toMinutes(period.end),
    )
  )
    return "Em intervalo"
  const current = appointments.find(
    (appointment) =>
      appointment.professionalId === professionalId &&
      appointment.date === currentDate &&
      appointment.status === "in-progress",
  )
  if (current) return "Em atendimento"
  const next = appointments
    .filter(
      (appointment) =>
        appointment.professionalId === professionalId &&
        !isTerminalAppointmentStatus(appointment.status) &&
        appointmentTime(appointment) >= now,
    )
    .toSorted(compareAppointments)[0]
  return next ? `Próximo às ${next.start}` : "Disponível"
}

function appointmentOverlap(appointment: Appointment, bandStart: number, bandEnd: number) {
  const start = toMinutes(appointment.start)
  return overlapMinutes(start, start + appointment.durationMinutes, bandStart, bandEnd)
}

function overlapMinutes(start: number, end: number, boundaryStart: number, boundaryEnd: number) {
  return Math.max(0, Math.min(end, boundaryEnd) - Math.max(start, boundaryStart))
}

function compareAppointments(left: Appointment, right: Appointment) {
  return (
    left.date.localeCompare(right.date) ||
    left.start.localeCompare(right.start) ||
    left.id.localeCompare(right.id)
  )
}

function appointmentTime(appointment: Appointment) {
  return new Date(`${appointment.date}T${appointment.start}:00`)
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`)
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value / 100)
}

function minutesLabel(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`
}

function timeAfter(start: string, durationMinutes: number) {
  const total = toMinutes(start) + durationMinutes
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}
