import { CalendarDaysIcon, CircleAlertIcon, PlusIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { cn } from "@/modules/shared/lib/utils"
import {
  type AgendaColumnId,
  deriveAgendaResult,
  parseIdList,
  periodBounds,
  primaryStatusForColumn,
  type ScheduleSearch,
} from "./agenda"
import { AgendaControls } from "./agenda-controls"
import { AgendaKanban } from "./agenda-kanban"
import { AppointmentDrawer, type DrawerMode } from "./appointment-drawer"
import type {
  Appointment,
  AppointmentTransitionInput,
  Professional,
  ScheduleDay,
  ScheduleDayQuery,
} from "./contracts"
import { useScenarioActions, useScheduleDay, useTransitionAppointment } from "./queries"
import { appointmentStatusPresentation, isTerminalAppointmentStatus } from "./status"
import { TransitionDialog } from "./transition-dialog"

export type { ScheduleSearch } from "./agenda"

export function SchedulePage({
  onSearchChange,
  search,
}: {
  onSearchChange: (next: Partial<ScheduleSearch>) => void
  search: ScheduleSearch
}) {
  const bounds = periodBounds(search.date, search.period, search.customStart, search.customEnd)
  const query: ScheduleDayQuery = {
    endDate: bounds.endDate,
    scenarioId: search.scenario,
    startDate: bounds.startDate,
    unitId: search.unit,
  }
  const dayQuery = useScheduleDay(query)
  const scenarios = useScenarioActions()
  const transitionMutation = useTransitionAppointment()
  const [searchText, setSearchText] = useState("")
  const debouncedSearchText = useDebouncedValue(searchText, 250)
  const [announcement, setAnnouncement] = useState("")
  const [transitionRequest, setTransitionRequest] = useState<{
    appointment: Appointment
    initialColumn?: AgendaColumnId
  } | null>(null)
  const [drawer, setDrawer] = useState<{
    appointment?: Appointment
    mode: DrawerMode
    slot?: { professionalId: string; start: string }
  } | null>(null)
  const result = useMemo(
    () =>
      deriveAgendaResult(
        dayQuery.data?.appointments ?? [],
        dayQuery.data?.professionals ?? [],
        dayQuery.data?.services ?? [],
        {
          clientIds: parseIdList(search.client),
          endDate: bounds.endDate,
          professionalIds: parseIdList(search.professional),
          searchText: debouncedSearchText,
          serviceIds: parseIdList(search.service),
          startDate: bounds.startDate,
          unitId: search.unit,
        },
      ),
    [
      bounds.endDate,
      bounds.startDate,
      dayQuery.data,
      debouncedSearchText,
      search.client,
      search.professional,
      search.service,
      search.unit,
    ],
  )
  const gridDay = useMemo(() => {
    if (!dayQuery.data) return undefined
    const selectedProfessionalIds = parseIdList(search.professional)
    return {
      ...dayQuery.data,
      appointments: result.appointments.filter(({ date }) => date === search.date),
      date: search.date,
      occupancies: dayQuery.data.occupancies.filter(({ date }) => date === search.date),
      professionals:
        selectedProfessionalIds.length > 0
          ? dayQuery.data.professionals.filter(({ id }) => selectedProfessionalIds.includes(id))
          : dayQuery.data.professionals,
    }
  }, [dayQuery.data, result.appointments, search.date, search.professional])

  async function selectScenario(id: string) {
    onSearchChange({ scenario: id })
    await scenarios.select(id)
    toast.success("Cenário carregado.")
  }

  async function resetScenario() {
    await scenarios.reset()
    toast.success("Cenário restaurado.")
  }

  function clearFilters() {
    setSearchText("")
    onSearchChange({
      client: undefined,
      customEnd: undefined,
      customStart: undefined,
      period: "today",
      professional: undefined,
      service: undefined,
      unit: "centro",
    })
  }

  const hasActiveFilters =
    debouncedSearchText.length > 0 ||
    parseIdList(search.professional).length > 0 ||
    parseIdList(search.client).length > 0 ||
    parseIdList(search.service).length > 0 ||
    search.period !== "today" ||
    search.unit !== "centro"

  async function transitionAppointment(input: AppointmentTransitionInput) {
    if (transitionMutation.isPending) return
    const destination = appointmentStatusPresentation[input.status].label
    setAnnouncement(`Atualizando status para ${destination}.`)
    try {
      await transitionMutation.mutateAsync(input)
      toast.success(`Status atualizado para “${destination}”.`)
      setAnnouncement(`Status atualizado para ${destination}.`)
      setTransitionRequest(null)
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-appointment-id="${input.id}"]`)
          ?.querySelector<HTMLElement>(
            "[data-kanban-drag-handle]:not([disabled]), [data-appointment-details]",
          )
          ?.focus()
      })
    } catch {
      toast.error("Não foi possível alterar o status. O agendamento foi restaurado.")
      setAnnouncement("Falha ao alterar o status. Cartão, contagens e resumo foram restaurados.")
      setTransitionRequest(null)
    }
  }

  function requestTransition(appointment: Appointment, column?: AgendaColumnId) {
    if (transitionMutation.isPending || isTerminalAppointmentStatus(appointment.status)) return
    if (
      !column ||
      column === "canceled-no-show" ||
      (column === "completed" && appointment.paymentStatus === "pending")
    ) {
      setTransitionRequest({ appointment, initialColumn: column })
      return
    }
    void transitionAppointment({
      id: appointment.id,
      status: primaryStatusForColumn(column),
    })
  }

  return (
    <ModuleLayout
      head={
        <>
          <PageHeader
            title="Agenda"
            description="Fluxo operacional sintético, limitado à sessão e sem persistência."
            actions={
              <Button type="button" onClick={() => setDrawer({ mode: "create" })}>
                <PlusIcon data-icon="inline-start" />
                Novo agendamento
              </Button>
            }
          />
          <AgendaControls
            appointments={dayQuery.data?.appointments ?? []}
            search={search}
            scenarios={scenarios.scenarios}
            professionals={dayQuery.data?.professionals ?? []}
            services={dayQuery.data?.services ?? []}
            searchText={searchText}
            onSearchChange={onSearchChange}
            onSearchTextChange={setSearchText}
            onScenarioChange={selectScenario}
            onReset={resetScenario}
            onClearFilters={clearFilters}
          />
        </>
      }
      bodyViewportClassName="flex h-full flex-col gap-3 pb-2"
    >
      {dayQuery.isPending ? (
        <ScheduleLoading />
      ) : dayQuery.isError ? (
        <ScheduleError onRetry={() => dayQuery.refetch()} />
      ) : dayQuery.data && gridDay ? (
        search.view === "kanban" ? (
          result.total === 0 ? (
            <EmptyState
              action={
                hasActiveFilters ? (
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setDrawer({ mode: "create" })}>
                    <PlusIcon data-icon="inline-start" />
                    Adicionar agendamento
                  </Button>
                )
              }
              description={
                hasActiveFilters
                  ? "Os filtros atuais não correspondem a nenhum agendamento. Limpe um filtro ou restaure todos."
                  : "Não há agendamentos neste período. Você pode adicionar um novo horário."
              }
              icon={CalendarDaysIcon}
              title={hasActiveFilters ? "Nenhum agendamento encontrado" : "Agenda livre no período"}
            />
          ) : (
            <AgendaKanban
              announcement={announcement}
              dateLabel={
                bounds.startDate === bounds.endDate
                  ? formatDisplayDate(bounds.startDate)
                  : `${formatDisplayDate(bounds.startDate)} a ${formatDisplayDate(bounds.endDate)}`
              }
              onAdd={() => setDrawer({ mode: "create" })}
              onEdit={(appointment) => setDrawer({ appointment, mode: "edit" })}
              onOpen={(appointment) => setDrawer({ appointment, mode: "view" })}
              onTransitionRequest={requestTransition}
              pendingAppointmentId={
                transitionMutation.isPending ? transitionMutation.variables?.id : undefined
              }
              professionals={dayQuery.data.professionals}
              result={result}
              services={dayQuery.data.services}
            />
          )
        ) : (
          <Schedule
            day={gridDay}
            onAppointment={(appointment) => setDrawer({ appointment, mode: "view" })}
            onSlot={(slot) => setDrawer({ mode: "create", slot })}
          />
        )
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
          selectedUnit={search.unit}
          services={dayQuery.data.services}
        />
      ) : null}
      {transitionRequest ? (
        <TransitionDialog
          appointment={transitionRequest.appointment}
          initialColumn={transitionRequest.initialColumn}
          isPending={transitionMutation.isPending}
          onCancel={() => {
            setTransitionRequest(null)
            setAnnouncement("Alteração de status cancelada.")
          }}
          onConfirm={transitionAppointment}
        />
      ) : null}
    </ModuleLayout>
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
  if (day.appointments.length === 0 && day.occupancies.length === 0 && day.periods.length === 0)
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
                    professional={professional}
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
          <ProfessionalSchedule
            day={day}
            key={professional.id}
            professional={professional}
            slots={slots}
            onAppointment={onAppointment}
            onSlot={onSlot}
          />
        ))}
      </div>
    </section>
  )
}

function ProfessionalSchedule({
  day,
  onAppointment,
  onSlot,
  professional,
  slots,
}: {
  day: ScheduleDay
  onAppointment: (appointment: Appointment) => void
  onSlot: (slot: { professionalId: string; start: string }) => void
  professional: Professional
  slots: readonly string[]
}) {
  const availableSlot = slots.find((slot) => !isSlotOccupied(day, professional.id, slot))
  return (
    <section aria-labelledby={`professional-${professional.id}`}>
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
              className={cn(
                "flex min-h-11 w-full items-start gap-3 rounded-lg border-2 bg-background p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                entry.kind === "appointment" &&
                  appointmentStatusPresentation[entry.appointment.status].className,
              )}
              data-appointment-status={
                entry.kind === "appointment" ? entry.appointment.status : undefined
              }
              type="button"
              disabled={entry.kind !== "appointment"}
              onClick={() => entry.kind === "appointment" && onAppointment(entry.appointment)}
            >
              <span className="shrink-0 font-medium">{entry.start}</span>
              <span className="min-w-0">
                <span className="block font-medium">{entry.label}</span>
                <span className="block text-xs text-muted-foreground">{entry.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      {availableSlot ? (
        <Button
          className="mt-2 w-full"
          type="button"
          variant="outline"
          onClick={() => onSlot({ professionalId: professional.id, start: availableSlot })}
        >
          Novo horário às {availableSlot} com {professional.name}
        </Button>
      ) : (
        <p className="mt-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Sem horários disponíveis para {professional.name}.
        </p>
      )}
    </section>
  )
}

function ScheduleCell({
  day,
  onAppointment,
  onSlot,
  professional,
  slot,
}: {
  day: ScheduleDay
  onAppointment: (appointment: Appointment) => void
  onSlot: (slot: { professionalId: string; start: string }) => void
  professional: Professional
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
    const StatusIcon = presentation.icon
    return (
      <td
        className="h-14 border-r border-b p-1 align-top"
        rowSpan={Math.ceil(appointment.durationMinutes / 15)}
      >
        <button
          type="button"
          className={cn(
            "flex min-h-12 w-full flex-col items-start rounded-md border-2 p-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            presentation.className,
          )}
          data-appointment-status={appointment.status}
          onClick={() => onAppointment(appointment)}
        >
          <span className="max-w-48 truncate font-medium">{appointment.customerName}</span>
          <span className="flex items-center gap-1 text-xs">
            <StatusIcon className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{presentation.symbol}</span>
            {presentation.label} · {appointment.durationMinutes} min
          </span>
        </button>
      </td>
    )
  }
  if (occupancy)
    return (
      <td
        className="h-14 border-r border-b p-1 align-top"
        rowSpan={Math.ceil(occupancy.durationMinutes / 15)}
      >
        <div className="flex min-h-12 flex-col justify-center rounded-md border border-dashed bg-muted p-2 text-xs">
          <span className="font-medium">Ocupado</span>
          <span className="text-muted-foreground">
            Agendamento fora do filtro · {occupancy.start}–
            {fromMinutes(toMinutes(occupancy.start) + occupancy.durationMinutes)} ·{" "}
            {occupancy.durationMinutes} min
          </span>
        </div>
      </td>
    )
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
        aria-label={`Disponível às ${slot} para ${professional.name}`}
        onClick={() => onSlot({ professionalId: professional.id, start: slot })}
      >
        Disponível
      </button>
    </td>
  )
}

function entriesFor(day: ScheduleDay, professionalId: string) {
  const visibleIds = new Set(day.appointments.map(({ id }) => id))
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
    ...day.occupancies
      .filter((item) => item.professionalId === professionalId && !visibleIds.has(item.id))
      .map((occupancy) => ({
        description: `Agendamento fora do filtro · ${occupancy.start}–${fromMinutes(toMinutes(occupancy.start) + occupancy.durationMinutes)} · ${occupancy.durationMinutes} min`,
        id: occupancy.id,
        kind: "occupied" as const,
        label: "Ocupado",
        start: occupancy.start,
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

function isSlotOccupied(day: ScheduleDay, professionalId: string, slot: string) {
  const start = toMinutes(slot)
  return (
    day.appointments.some(
      (item) =>
        item.professionalId === professionalId &&
        start >= toMinutes(item.start) &&
        start < toMinutes(item.start) + item.durationMinutes,
    ) ||
    day.occupancies.some(
      (item) =>
        item.professionalId === professionalId &&
        start >= toMinutes(item.start) &&
        start < toMinutes(item.start) + item.durationMinutes,
    ) ||
    day.periods.some(
      (item) =>
        item.kind !== "walk-in" &&
        item.professionalId === professionalId &&
        start >= toMinutes(item.start) &&
        start < toMinutes(item.end),
    )
  )
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
function fromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`
}
function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}
function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])
  return debounced
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
