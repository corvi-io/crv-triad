import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import {
  DatePicker,
  formatDateOnly,
  parseDateOnly,
} from "@/modules/shared/components/forms/date-picker"
import { SelectInput } from "@/modules/shared/components/forms/form-controls"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { AppointmentDrawer, type DrawerMode } from "./appointment-drawer"
import type { Appointment, AppointmentStatus, ScheduleDay, ScheduleDayQuery } from "./contracts"
import { appointmentStatuses } from "./contracts"
import { useScenarioActions, useScheduleDay } from "./queries"
import { appointmentStatusPresentation } from "./status"

export type ScheduleSearch = {
  date: string
  professional?: string
  scenario: string
  status?: AppointmentStatus
}

export function SchedulePage({
  onSearchChange,
  search,
}: {
  onSearchChange: (next: Partial<ScheduleSearch>) => void
  search: ScheduleSearch
}) {
  const query: ScheduleDayQuery = {
    date: search.date,
    professionalId: search.professional,
    scenarioId: search.scenario,
    status: search.status,
  }
  const dayQuery = useScheduleDay(query)
  const scenarios = useScenarioActions()
  const [drawer, setDrawer] = useState<{
    appointment?: Appointment
    mode: DrawerMode
    slot?: { professionalId: string; start: string }
  } | null>(null)

  async function selectScenario(id: string) {
    onSearchChange({ scenario: id })
    await scenarios.select(id)
    toast.success("Cenário carregado.")
  }

  async function resetScenario() {
    await scenarios.reset()
    toast.success("Cenário restaurado.")
  }

  return (
    <ModuleLayout
      head={
        <>
          <PageHeader
            title="Agenda"
            description="Protótipo visual diário com dados sintéticos e sem persistência."
            actions={
              <Button type="button" onClick={() => setDrawer({ mode: "create" })}>
                <PlusIcon data-icon="inline-start" />
                Novo agendamento
              </Button>
            }
          />
          <ScheduleControls
            day={dayQuery.data}
            search={search}
            scenarios={scenarios.scenarios}
            onSearchChange={onSearchChange}
            onScenarioChange={selectScenario}
            onReset={resetScenario}
          />
        </>
      }
      bodyViewportClassName="h-full space-y-3 pb-2"
    >
      {dayQuery.isPending ? (
        <ScheduleLoading />
      ) : dayQuery.isError ? (
        <ScheduleError onRetry={() => dayQuery.refetch()} />
      ) : dayQuery.data ? (
        <Schedule
          day={dayQuery.data}
          onAppointment={(appointment) => setDrawer({ appointment, mode: "view" })}
          onSlot={(slot) => setDrawer({ mode: "create", slot })}
        />
      ) : null}
      {dayQuery.data && drawer ? (
        <AppointmentDrawer
          appointment={drawer.appointment}
          initialSlot={drawer.slot}
          isOpen
          mode={drawer.mode}
          onModeChange={(mode) => setDrawer((current) => (current ? { ...current, mode } : null))}
          onOpenChange={(open) => !open && setDrawer(null)}
          professionals={dayQuery.data.professionals}
          selectedDate={search.date}
          services={dayQuery.data.services}
        />
      ) : null}
    </ModuleLayout>
  )
}

function ScheduleControls({
  day,
  onReset,
  onScenarioChange,
  onSearchChange,
  scenarios,
  search,
}: {
  day?: ScheduleDay
  onReset: () => void
  onScenarioChange: (id: string) => void
  onSearchChange: (next: Partial<ScheduleSearch>) => void
  scenarios: readonly { id: string; label: string }[]
  search: ScheduleSearch
}) {
  const date = parseDateOnly(search.date) ?? new Date()
  const moveDate = (amount: number) => {
    const next = new Date(date)
    next.setDate(next.getDate() + amount)
    onSearchChange({ date: formatDateOnly(next) })
  }
  return (
    <fieldset className="grid gap-2 rounded-lg border bg-card p-3 lg:grid-cols-[auto_minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(11rem,1fr)_auto] lg:items-end">
      <legend className="sr-only">Controles da agenda</legend>
      <div className="flex min-w-0 flex-wrap items-end gap-1">
        <Button
          aria-label="Dia anterior"
          type="button"
          variant="outline"
          size="icon"
          onClick={() => moveDate(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="min-w-36 flex-1">
          <label className="mb-1 block text-xs font-medium" htmlFor="schedule-date">
            Data
          </label>
          <DatePicker
            id="schedule-date"
            value={search.date}
            placeholder="Selecione"
            onValueChange={(date) => onSearchChange({ date })}
          />
        </div>
        <Button
          aria-label="Próximo dia"
          type="button"
          variant="outline"
          size="icon"
          onClick={() => moveDate(1)}
        >
          <ChevronRightIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onSearchChange({ date: formatDateOnly(new Date()) })}
        >
          Hoje
        </Button>
      </div>
      <Filter htmlFor="professional-filter" label="Profissional">
        <SelectInput
          id="professional-filter"
          value={search.professional ?? ""}
          placeholder="Todos os profissionais"
          options={[
            { label: "Todos os profissionais", value: "" },
            ...(day?.professionals ?? []).map(({ id, name }) => ({ label: name, value: id })),
          ]}
          onValueChange={(professional) =>
            onSearchChange({ professional: professional || undefined })
          }
        />
      </Filter>
      <Filter htmlFor="status-filter" label="Status">
        <SelectInput
          id="status-filter"
          value={search.status ?? ""}
          placeholder="Todos os status"
          options={[
            { label: "Todos os status", value: "" },
            ...appointmentStatuses.map((status) => ({
              label: appointmentStatusPresentation[status].label,
              value: status,
            })),
          ]}
          onValueChange={(status) =>
            onSearchChange({ status: (status || undefined) as AppointmentStatus | undefined })
          }
        />
      </Filter>
      <Filter htmlFor="scenario-filter" label="Cenário">
        <SelectInput
          id="scenario-filter"
          value={search.scenario}
          placeholder="Selecione o cenário"
          options={scenarios.map(({ id, label }) => ({ label, value: id }))}
          onValueChange={onScenarioChange}
        />
      </Filter>
      <Button type="button" variant="outline" onClick={onReset}>
        <RotateCcwIcon data-icon="inline-start" />
        Restaurar
      </Button>
      <p className="text-xs text-muted-foreground lg:col-span-5">
        <CalendarDaysIcon className="mr-1 inline size-3" aria-hidden="true" />
        Visualização diária · intervalos de 15 minutos · {day?.unitName ?? "uma unidade sintética"}
      </p>
    </fieldset>
  )
}

function Filter({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode
  htmlFor: string
  label: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Schedule({
  day,
  onAppointment,
  onSlot,
}: {
  day: ScheduleDay
  onAppointment: (appointment: Appointment) => void
  onSlot: (slot: { professionalId: string; start: string }) => void
}) {
  const slots = makeSlots(day.startTime, day.endTime)
  if (day.appointments.length === 0 && day.periods.length === 0)
    return (
      <EmptyState
        icon={CalendarDaysIcon}
        title="Agenda livre neste dia"
        description="Não há agendamentos, pausas ou bloqueios para os filtros selecionados."
      />
    )
  return (
    <section aria-label={`Agenda de ${day.date}`} className="min-h-0 rounded-lg border bg-card">
      <section
        className="hidden max-h-[62vh] overflow-auto lg:block"
        aria-label="Tabela rolável da agenda diária"
      >
        <table className="w-max min-w-full border-collapse text-sm">
          <caption className="sr-only">
            Profissionais em colunas e horários em linhas, em intervalos de 15 minutos.
          </caption>
          <thead className="sticky top-0 bg-card">
            <tr>
              <th className="sticky left-0 min-w-20 border-r border-b bg-card p-2 text-left">
                Horário
              </th>
              {day.professionals.map((professional) => (
                <th className="min-w-56 border-r border-b p-3 text-left" key={professional.id}>
                  {professional.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot}>
                <th
                  scope="row"
                  className="sticky left-0 border-r border-b bg-card p-2 text-left font-medium"
                >
                  {slot}
                </th>
                {day.professionals.map((professional) => (
                  <ScheduleCell
                    day={day}
                    key={professional.id}
                    professionalId={professional.id}
                    slot={slot}
                    onAppointment={onAppointment}
                    onSlot={onSlot}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-4 p-3 lg:hidden">
        {day.professionals.map((professional) => (
          <section key={professional.id} aria-labelledby={`professional-${professional.id}`}>
            <h2
              id={`professional-${professional.id}`}
              className="sticky top-0 mb-2 rounded-md bg-card py-2 font-semibold"
            >
              {professional.name}
            </h2>
            <ol className="grid gap-2">
              {entriesFor(day, professional.id).map((entry) => (
                <li key={`${entry.kind}-${entry.id}`}>
                  <button
                    className="flex min-h-11 w-full items-start gap-3 rounded-lg border bg-background p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    type="button"
                    disabled={entry.kind !== "appointment"}
                    onClick={() => entry.kind === "appointment" && onAppointment(entry.appointment)}
                  >
                    <span className="shrink-0 font-medium">{entry.start}</span>
                    <span className="min-w-0">
                      <span className="block font-medium">{entry.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {entry.description}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <Button
              className="mt-2 w-full"
              type="button"
              variant="outline"
              onClick={() => onSlot({ professionalId: professional.id, start: "09:00" })}
            >
              Novo horário com {professional.name}
            </Button>
          </section>
        ))}
      </div>
    </section>
  )
}

function ScheduleCell({
  day,
  onAppointment,
  onSlot,
  professionalId,
  slot,
}: {
  day: ScheduleDay
  onAppointment: (appointment: Appointment) => void
  onSlot: (slot: { professionalId: string; start: string }) => void
  professionalId: string
  slot: string
}) {
  const appointment = day.appointments.find(
    (item) => item.professionalId === professionalId && item.start === slot,
  )
  const period = day.periods.find(
    (item) => item.professionalId === professionalId && item.start === slot,
  )
  const slotMinutes = toMinutes(slot)
  const coveredByAppointment = day.appointments.some(
    (item) =>
      item.professionalId === professionalId &&
      slotMinutes > toMinutes(item.start) &&
      slotMinutes < toMinutes(item.start) + item.durationMinutes,
  )
  const coveredByPeriod = day.periods.some(
    (item) =>
      item.professionalId === professionalId &&
      slotMinutes > toMinutes(item.start) &&
      slotMinutes < toMinutes(item.end),
  )
  if (coveredByAppointment || coveredByPeriod) return null
  if (appointment) {
    const presentation = appointmentStatusPresentation[appointment.status]
    return (
      <td
        className="h-14 border-r border-b p-1 align-top"
        rowSpan={Math.ceil(appointment.durationMinutes / 15)}
      >
        <button
          type="button"
          className="flex min-h-12 w-full flex-col items-start rounded-md border-2 border-primary bg-accent p-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => onAppointment(appointment)}
        >
          <span className="max-w-48 truncate font-medium">{appointment.customerName}</span>
          <span className="flex items-center gap-1 text-xs">
            <span aria-hidden="true">{presentation.symbol}</span>
            {presentation.label} · {appointment.durationMinutes} min
          </span>
        </button>
      </td>
    )
  }
  if (period)
    return (
      <td
        className="h-14 border-r border-b p-1 align-top"
        rowSpan={Math.ceil((toMinutes(period.end) - toMinutes(period.start)) / 15)}
      >
        <div className="flex min-h-12 items-center rounded-md border border-dashed bg-muted p-2 text-xs">
          <span aria-hidden="true">
            {period.kind === "walk-in" ? "◇" : period.kind === "break" ? "Ⅱ" : "▧"}
          </span>
          <span className="ml-1">
            {period.label} · {period.start}–{period.end}
          </span>
        </div>
      </td>
    )
  return (
    <td className="h-14 border-r border-b p-1">
      <button
        type="button"
        className="min-h-12 w-full rounded-md border border-dashed text-xs text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => onSlot({ professionalId, start: slot })}
      >
        Disponível <span className="sr-only">às {slot}</span>
      </button>
    </td>
  )
}

function entriesFor(day: ScheduleDay, professionalId: string) {
  return [
    ...day.appointments
      .filter((item) => item.professionalId === professionalId)
      .map((appointment) => ({
        appointment,
        description: `${appointmentStatusPresentation[appointment.status].symbol} ${appointmentStatusPresentation[appointment.status].label} · ${appointment.durationMinutes} min`,
        id: appointment.id,
        kind: "appointment" as const,
        label: appointment.customerName,
        start: appointment.start,
      })),
    ...day.periods
      .filter((item) => item.professionalId === professionalId)
      .map((period) => ({
        description: `${period.start}–${period.end}`,
        id: period.id,
        kind: period.kind,
        label: period.label,
        start: period.start,
      })),
  ].sort((left, right) => left.start.localeCompare(right.start))
}

function makeSlots(start: string, end: string) {
  const values = []
  for (let value = toMinutes(start); value < toMinutes(end); value += 15)
    values.push(
      `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`,
    )
  return values
}
function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}
function ScheduleLoading() {
  return (
    <div role="status" aria-label="Carregando agenda" className="grid gap-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
function ScheduleError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="grid min-h-56 place-items-center rounded-lg border border-destructive p-6 text-center"
    >
      <div>
        <CircleAlertIcon className="mx-auto size-8 text-destructive" aria-hidden="true" />
        <h2 className="mt-3 font-semibold">Não foi possível carregar a agenda</h2>
        <p className="mt-1 text-sm text-muted-foreground">Troque o cenário ou tente novamente.</p>
        <Button className="mt-4" type="button" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
