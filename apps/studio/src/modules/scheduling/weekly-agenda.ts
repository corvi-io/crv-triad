import { addDays, format, parseISO } from "date-fns"
import type { Appointment, ScheduleRange } from "./contracts"

export type WeeklyDropDestination = {
  date: string
  professionalId: string
  start: string
}

export type WeeklyOverlapGroup = {
  appointmentIds: readonly string[]
  date: string
  endMinutes: number
  id: string
  startMinutes: number
}

export type WeeklyAppointmentLayout = {
  appointment: Appointment
  overlapCount: number
  overlapIndex: number
}

export function sevenDayDates(startDate: string) {
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(parseISO(startDate), index), "yyyy-MM-dd"),
  )
}

export function deriveWeeklyLayouts(appointments: readonly Appointment[]) {
  const byDate = new Map<string, Appointment[]>()
  const ordered = [...appointments].sort((left, right) =>
    `${left.date}-${left.start}-${left.id}`.localeCompare(
      `${right.date}-${right.start}-${right.id}`,
    ),
  )
  for (const appointment of ordered) {
    byDate.set(appointment.date, [...(byDate.get(appointment.date) ?? []), appointment])
  }
  return new Map(
    [...byDate].map(([date, items]) => {
      const layouts: WeeklyAppointmentLayout[] = []
      for (const appointment of items) {
        const overlapping = items.filter((candidate) => overlaps(candidate, appointment))
        layouts.push({
          appointment,
          overlapCount: overlapping.length,
          overlapIndex: overlapping.findIndex(({ id }) => id === appointment.id),
        })
      }
      return [date, layouts] as const
    }),
  )
}

export function weeklyDropError(
  range: ScheduleRange,
  appointment: Appointment,
  destination: WeeklyDropDestination,
) {
  if (["completed", "canceled", "no-show"].includes(appointment.status))
    return "Agendamentos finalizados não podem ser remarcados."
  if (
    appointment.date === destination.date &&
    appointment.start === destination.start &&
    appointment.professionalId === destination.professionalId
  )
    return "O agendamento já está nesse dia e horário."
  if (destination.professionalId !== appointment.professionalId)
    return "Na semana, altere o profissional pelo drawer do agendamento."
  const visibleDates = sevenDayDates(range.date)
  if (
    destination.date < visibleDates[0] ||
    destination.date > visibleDates[6] ||
    !/^\d{2}:(00|15|30|45)$/.test(destination.start)
  )
    return "Destino inválido. O agendamento não foi alterado."
  const start = toMinutes(destination.start)
  const end = start + appointment.durationMinutes
  if (start < toMinutes(range.startTime) || end > toMinutes(range.endTime))
    return "O atendimento terminaria fora do horário de funcionamento."
  const unavailable = range.periods.some(
    (period) =>
      period.date === destination.date &&
      period.kind !== "walk-in" &&
      period.professionalId === destination.professionalId &&
      start < toMinutes(period.end) &&
      end > toMinutes(period.start),
  )
  if (unavailable) return "O profissional está indisponível nesse período. Escolha outro horário."
  const conflict = range.occupancies.some(
    (occupancy) =>
      occupancy.id !== appointment.id &&
      occupancy.date === destination.date &&
      occupancy.professionalId === destination.professionalId &&
      start < toMinutes(occupancy.start) + occupancy.durationMinutes &&
      end > toMinutes(occupancy.start),
  )
  if (conflict) return "Este horário não tem espaço suficiente. Escolha outro horário."
  return undefined
}

function overlaps(left: Appointment, right: Appointment) {
  if (left.date !== right.date) return false
  const leftStart = toMinutes(left.start)
  const rightStart = toMinutes(right.start)
  return (
    leftStart < rightStart + right.durationMinutes && rightStart < leftStart + left.durationMinutes
  )
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}
