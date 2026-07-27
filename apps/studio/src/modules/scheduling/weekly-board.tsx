import { format, isToday, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarPlusIcon, GripVerticalIcon } from "lucide-react"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { Button } from "@/modules/shared/components/ui/button"
import { toneForStatus } from "./agenda-board"
import type { Appointment, ScheduleRange } from "./contracts"
import { appointmentStatusPresentation, isTerminalAppointmentStatus } from "./status"
import { deriveWeeklyLayouts, sevenDayDates, type WeeklyDropDestination } from "./weekly-agenda"

export function WeeklyBoard({
  appointments,
  onAppointment,
  onCreate,
  onDropAppointment,
  range,
}: {
  appointments: readonly Appointment[]
  onAppointment: (appointment: Appointment) => void
  onCreate: (destination: WeeklyDropDestination) => void
  onDropAppointment: (appointment: Appointment, destination: WeeklyDropDestination) => void
  range: ScheduleRange
}) {
  const dates = sevenDayDates(range.date)
  const layouts = deriveWeeklyLayouts(appointments)
  const professionalById = new Map(range.professionals.map((item) => [item.id, item.name]))
  const serviceById = new Map(range.services.map((item) => [item.id, item.name]))
  const hourSlots = Array.from(
    { length: Number(range.endTime.slice(0, 2)) - Number(range.startTime.slice(0, 2)) },
    (_, index) => `${String(Number(range.startTime.slice(0, 2)) + index).padStart(2, "0")}:00`,
  )

  return (
    <section
      aria-label={`Agenda semanal de ${formatDate(dates[0])} a ${formatDate(dates[6])}`}
      className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card"
    >
      <div className="grid min-w-[70rem] grid-cols-7">
        {dates.map((date) => (
          <section
            className="min-w-40 border-r last:border-r-0"
            key={date}
            aria-labelledby={`week-${date}`}
          >
            <header className="sticky top-0 z-10 border-b bg-card p-3">
              <h2 id={`week-${date}`} className="font-heading font-medium">
                {format(parseISO(date), "EEE, dd/MM", { locale: ptBR })}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isToday(parseISO(date)) ? "Hoje · " : ""}
                {layouts.get(date)?.length ?? 0} agendamento(s)
              </p>
            </header>
            <div className="grid">
              {hourSlots.map((start) => {
                const hour = Number(start.slice(0, 2))
                const hourAppointments = (layouts.get(date) ?? []).filter(
                  ({ appointment }) => Number(appointment.start.slice(0, 2)) === hour,
                )
                const hourPeriods = range.periods.filter(
                  (period) => period.date === date && Number(period.start.slice(0, 2)) === hour,
                )
                return (
                  <fieldset
                    className="min-h-28 border-b p-1.5"
                    key={`${date}-${start}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const appointment = appointments.find(
                        ({ id }) => id === event.dataTransfer.getData("text/appointment-id"),
                      )
                      if (appointment)
                        onDropAppointment(appointment, {
                          date,
                          professionalId: appointment.professionalId,
                          start,
                        })
                    }}
                  >
                    <legend className="sr-only">{`${formatDate(date)} às ${start}`}</legend>
                    {hourPeriods.length === 0 ? (
                      <Button
                        aria-label={`Criar agendamento em ${formatDate(date)} às ${start}`}
                        className="mb-1 h-7 w-full justify-start px-1.5 text-xs"
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          onCreate({
                            date,
                            professionalId: range.professionals[0]?.id ?? "",
                            start,
                          })
                        }
                      >
                        <CalendarPlusIcon data-icon="inline-start" />
                        {start} · livre
                      </Button>
                    ) : null}
                    {hourPeriods.map((period) => (
                      <div
                        className="mb-1 rounded-md border border-dashed bg-muted p-2 text-xs"
                        key={period.id}
                        role="note"
                      >
                        <strong>{period.label}</strong>
                        <span className="block text-muted-foreground">
                          {period.start}–{period.end} ·{" "}
                          {professionalById.get(period.professionalId) ?? "Profissional"}
                        </span>
                      </div>
                    ))}
                    <div className="grid gap-1">
                      {hourAppointments.map(({ appointment, overlapCount }) => {
                        const status = appointmentStatusPresentation[appointment.status]
                        return (
                          <article
                            className="rounded-md border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring"
                            data-appointment-id={appointment.id}
                            draggable={!isTerminalAppointmentStatus(appointment.status)}
                            key={appointment.id}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move"
                              event.dataTransfer.setData("text/appointment-id", appointment.id)
                            }}
                          >
                            <button
                              type="button"
                              className="grid w-full cursor-pointer gap-1 text-left"
                              aria-label={`${appointment.start}, ${appointment.customerName}, ${serviceById.get(appointment.serviceId)}, ${professionalById.get(appointment.professionalId)}, ${status.label}${overlapCount > 1 ? `, sobreposição com ${overlapCount} agendamentos` : ""}`}
                              onClick={() => onAppointment(appointment)}
                            >
                              <span className="flex items-center gap-1 text-xs tabular-nums">
                                {!isTerminalAppointmentStatus(appointment.status) ? (
                                  <GripVerticalIcon aria-label="Arrastável" className="size-3" />
                                ) : null}
                                {appointment.start}
                              </span>
                              <strong className="truncate text-xs">
                                {appointment.customerName}
                              </strong>
                              <span className="truncate text-xs text-muted-foreground">
                                {professionalById.get(appointment.professionalId)} ·{" "}
                                {serviceById.get(appointment.serviceId)}
                              </span>
                              <StatusBadge
                                className={status.badgeClassName}
                                tone={toneForStatus(appointment.status)}
                              >
                                {status.label}
                              </StatusBadge>
                              {overlapCount > 1 ? (
                                <span className="text-xs font-medium">
                                  Sobreposição: {overlapCount}
                                </span>
                              ) : null}
                            </button>
                          </article>
                        )
                      })}
                    </div>
                  </fieldset>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}

function formatDate(value: string) {
  return format(parseISO(value), "dd/MM/yyyy")
}
