import { MoreHorizontalIcon } from "lucide-react"

import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { Button } from "@/modules/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/dropdown-menu"
import { cn } from "@/modules/shared/lib/utils"
import type { AgendaColumnId } from "./agenda"
import { AgendaAvatar } from "./agenda-avatar"
import type { Appointment, Professional, ScheduleDay, Service } from "./contracts"
import { appointmentStatusPresentation, isTerminalAppointmentStatus } from "./status"

export function AgendaBoard({
  day,
  onAppointment,
  onSlot,
  onTransitionRequest,
}: {
  day: ScheduleDay
  onAppointment: (appointment: Appointment) => void
  onSlot: (slot: { professionalId: string; start: string }) => void
  onTransitionRequest: (appointment: Appointment, column?: AgendaColumnId) => void
}) {
  const slots = makeSlots(day.startTime, day.endTime)
  const services = new Map(day.services.map((service) => [service.id, service]))

  return (
    <section
      aria-label={`Quadro da agenda de ${day.date}`}
      className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-card"
      data-testid="agenda-board"
    >
      <div className="h-full max-h-[calc(100vh-13rem)] overflow-auto">
        <table
          className="w-full table-fixed border-collapse text-sm"
          style={{ minWidth: `${80 + day.professionals.length * 196}px` }}
        >
          <caption className="sr-only">
            Horários em linhas e barbeiros em colunas, em intervalos de quinze minutos.
          </caption>
          <colgroup>
            <col className="w-20" />
            {day.professionals.map((professional) => (
              <col className="w-[12.25rem]" key={professional.id} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-card">
            <tr>
              <th className="sticky left-0 z-30 min-w-20 border-r border-b bg-card px-3 py-4 text-left text-xs font-medium text-muted-foreground">
                Horário
              </th>
              {day.professionals.map((professional) => (
                <ProfessionalHeading
                  appointmentCount={
                    day.appointments.filter(
                      ({ professionalId }) => professionalId === professional.id,
                    ).length
                  }
                  key={professional.id}
                  professional={professional}
                  unitName={day.unitName}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot}>
                <th
                  className="sticky left-0 z-10 h-8 border-r border-b bg-card px-3 text-left text-xs font-medium tabular-nums text-muted-foreground"
                  scope="row"
                >
                  {slot}
                </th>
                {day.professionals.map((professional) => (
                  <ScheduleCell
                    day={day}
                    key={professional.id}
                    professional={professional}
                    service={services}
                    slot={slot}
                    onAppointment={onAppointment}
                    onSlot={onSlot}
                    onTransitionRequest={onTransitionRequest}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ProfessionalHeading({
  appointmentCount,
  professional,
  unitName,
}: {
  appointmentCount: number
  professional: Professional
  unitName: string
}) {
  return (
    <th className="border-r border-b bg-card px-3 py-2 text-left" scope="col">
      <div className="flex items-center gap-2">
        <AgendaAvatar name={professional.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{professional.name}</p>
          <p className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
            Unidade {unitName}
            <span className="text-feedback-success-foreground" aria-hidden="true">
              ●
            </span>
            <span aria-hidden="true" className="tabular-nums">
              {appointmentCount}
            </span>
            <span className="sr-only">{appointmentCount} agendamentos</span>
          </p>
        </div>
      </div>
    </th>
  )
}

function ScheduleCell({
  day,
  onAppointment,
  onSlot,
  onTransitionRequest,
  professional,
  service,
  slot,
}: {
  day: ScheduleDay
  onAppointment: (appointment: Appointment) => void
  onSlot: (slot: { professionalId: string; start: string }) => void
  onTransitionRequest: (appointment: Appointment, column?: AgendaColumnId) => void
  professional: Professional
  service: ReadonlyMap<string, Service>
  slot: string
}) {
  const appointment = day.appointments.find(
    (item) => item.professionalId === professional.id && item.start === slot,
  )
  const occupancy = day.occupancies.find(
    (item) => item.professionalId === professional.id && item.start === slot,
  )
  const period = day.periods.find(
    (item) => item.professionalId === professional.id && item.start === slot,
  )
  const slotMinutes = toMinutes(slot)
  const coveredByAppointment = day.appointments.some(
    (item) =>
      item.professionalId === professional.id &&
      slotMinutes > toMinutes(item.start) &&
      slotMinutes < toMinutes(item.start) + item.durationMinutes,
  )
  const coveredByOccupancy = day.occupancies.some(
    (item) =>
      item.professionalId === professional.id &&
      slotMinutes > toMinutes(item.start) &&
      slotMinutes < toMinutes(item.start) + item.durationMinutes,
  )
  const coveredByPeriod = day.periods.some(
    (item) =>
      item.professionalId === professional.id &&
      slotMinutes > toMinutes(item.start) &&
      slotMinutes < toMinutes(item.end),
  )
  if (coveredByAppointment || coveredByOccupancy || coveredByPeriod) return null

  if (appointment) {
    const presentation = appointmentStatusPresentation[appointment.status]
    const end = fromMinutes(toMinutes(appointment.start) + appointment.durationMinutes)
    return (
      <td
        className="h-8 border-r border-b p-1 align-top"
        rowSpan={Math.ceil(appointment.durationMinutes / 15)}
      >
        <div
          className={cn(
            "group relative flex h-full min-h-16 items-start gap-2 rounded-md border-2 p-2",
            presentation.className,
          )}
          data-appointment-id={appointment.id}
          data-appointment-status={appointment.status}
        >
          <AgendaAvatar className="mt-0.5" name={appointment.customerName} size="sm" />
          <button
            className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
            type="button"
            onClick={() => onAppointment(appointment)}
          >
            <span className="flex items-start justify-between gap-1">
              <span className="truncate font-semibold">{appointment.customerName}</span>
              <span className="shrink-0 text-[0.68rem] tabular-nums">
                {appointment.start} – {end}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-current/75">
              {service.get(appointment.serviceId)?.name ?? "Serviço sintético"}
            </span>
            <span className="mt-1 flex">
              <StatusBadge tone={toneForStatus(appointment.status)}>
                {presentation.label}
              </StatusBadge>
            </span>
          </button>
          <AppointmentActions
            appointment={appointment}
            onOpen={() => onAppointment(appointment)}
            onTransition={() => onTransitionRequest(appointment)}
          />
        </div>
      </td>
    )
  }

  if (occupancy) {
    return (
      <td
        className="h-8 border-r border-b p-1 align-top"
        rowSpan={Math.ceil(occupancy.durationMinutes / 15)}
      >
        <div className="flex h-full min-h-12 items-center rounded-md border border-dashed bg-muted p-2 text-xs text-muted-foreground">
          Ocupado · {occupancy.start}–
          {fromMinutes(toMinutes(occupancy.start) + occupancy.durationMinutes)}
        </div>
      </td>
    )
  }

  if (period) {
    return (
      <td
        className="h-8 border-r border-b p-1 align-top"
        rowSpan={Math.ceil((toMinutes(period.end) - toMinutes(period.start)) / 15)}
      >
        <div className="flex h-full min-h-12 items-center rounded-md border border-dashed bg-muted p-2 text-xs text-muted-foreground">
          {period.label} · {period.start}–{period.end}
        </div>
      </td>
    )
  }

  return (
    <td className="h-8 border-r border-b p-0.5">
      <button
        aria-label={`Novo agendamento às ${slot} com ${professional.name}`}
        className="size-full min-h-7 rounded-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        type="button"
        onClick={() => onSlot({ professionalId: professional.id, start: slot })}
      >
        <span className="sr-only">Horário disponível</span>
      </button>
    </td>
  )
}

function AppointmentActions({
  appointment,
  onOpen,
  onTransition,
}: {
  appointment: Appointment
  onOpen: () => void
  onTransition: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Ações de ${appointment.customerName}`}
            className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100"
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <MoreHorizontalIcon aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Ações do agendamento</DropdownMenuLabel>
          <DropdownMenuItem onClick={onOpen}>Ver detalhes</DropdownMenuItem>
          {!isTerminalAppointmentStatus(appointment.status) ? (
            <DropdownMenuItem onClick={onTransition}>Alterar status</DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function toneForStatus(status: Appointment["status"]) {
  if (status === "canceled" || status === "no-show") return "danger" as const
  if (status === "completed" || status === "confirmed") return "success" as const
  if (status === "waiting") return "warning" as const
  if (status === "in-progress" || status === "arrived") return "info" as const
  return "neutral" as const
}

export function makeSlots(start: string, end: string) {
  const values = []
  for (let value = toMinutes(start); value < toMinutes(end); value += 15) {
    values.push(fromMinutes(value))
  }
  return values
}

export function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}

export function fromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`
}
