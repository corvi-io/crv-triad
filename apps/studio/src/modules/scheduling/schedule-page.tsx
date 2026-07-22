import { CalendarDaysIcon, CircleAlertIcon, PlusIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"

import {
  type AgendaColumnId,
  deriveAgendaResult,
  parseIdList,
  periodBounds,
  primaryStatusForColumn,
  type ScheduleSearch,
} from "./agenda"
import { AgendaBoard } from "./agenda-board"
import { AgendaControls } from "./agenda-controls"
import { AgendaList } from "./agenda-list"
import { AppointmentDrawer, type DrawerMode } from "./appointment-drawer"
import type {
  Appointment,
  AppointmentStatus,
  AppointmentTransitionInput,
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
          statusIds: parseIdList(search.status) as AppointmentStatus[],
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
      search.status,
      search.unit,
    ],
  )

  const boardDay = useMemo(() => {
    if (!dayQuery.data) return undefined
    const selectedProfessionalIds = parseIdList(search.professional)
    return {
      ...dayQuery.data,
      appointments: result.appointments.filter(({ date }) => date === bounds.startDate),
      date: bounds.startDate,
      occupancies: dayQuery.data.occupancies.filter(({ date }) => date === bounds.startDate),
      professionals:
        selectedProfessionalIds.length > 0
          ? dayQuery.data.professionals.filter(({ id }) => selectedProfessionalIds.includes(id))
          : dayQuery.data.professionals,
    }
  }, [bounds.startDate, dayQuery.data, result.appointments, search.professional])

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
      status: undefined,
      unit: "centro",
    })
  }

  const hasActiveFilters =
    debouncedSearchText.length > 0 ||
    parseIdList(search.professional).length > 0 ||
    parseIdList(search.client).length > 0 ||
    parseIdList(search.service).length > 0 ||
    parseIdList(search.status).length > 0 ||
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
          ?.querySelector<HTMLElement>("button")
          ?.focus()
      })
    } catch {
      toast.error("Não foi possível alterar o status. O agendamento foi restaurado.")
      setAnnouncement("Falha ao alterar o status. O agendamento foi restaurado.")
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
      bodyViewportClassName="flex h-full flex-col gap-3 pb-2"
      head={
        <>
          <PageHeader
            actions={
              <Button type="button" onClick={() => setDrawer({ mode: "create" })}>
                <PlusIcon data-icon="inline-start" />
                Novo agendamento
              </Button>
            }
            description="Gerencie os atendimentos do dia com eficiência."
            title="Agenda"
          />
          <AgendaControls
            appointments={dayQuery.data?.appointments ?? []}
            professionals={dayQuery.data?.professionals ?? []}
            scenarios={scenarios.scenarios}
            search={search}
            searchText={searchText}
            services={dayQuery.data?.services ?? []}
            onClearFilters={clearFilters}
            onReset={resetScenario}
            onScenarioChange={selectScenario}
            onSearchChange={onSearchChange}
            onSearchTextChange={setSearchText}
          />
        </>
      }
    >
      {dayQuery.isPending ? (
        <ScheduleLoading />
      ) : dayQuery.isError ? (
        <ScheduleError onRetry={() => dayQuery.refetch()} />
      ) : dayQuery.data && boardDay ? (
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
                ? "Os filtros atuais não correspondem a nenhum agendamento."
                : "Não há agendamentos neste período. Você pode adicionar um novo horário."
            }
            icon={CalendarDaysIcon}
            title={hasActiveFilters ? "Nenhum agendamento encontrado" : "Agenda livre no período"}
          />
        ) : search.view === "board" ? (
          <AgendaBoard
            day={boardDay}
            onAppointment={(appointment) => setDrawer({ appointment, mode: "view" })}
            onSlot={(slot) => setDrawer({ mode: "create", slot })}
            onTransitionRequest={requestTransition}
          />
        ) : (
          <AgendaList
            appointments={result.appointments}
            professionals={dayQuery.data.professionals}
            services={dayQuery.data.services}
            onAppointment={(appointment) => setDrawer({ appointment, mode: "view" })}
            onTransitionRequest={requestTransition}
          />
        )
      ) : null}

      {dayQuery.data && drawer ? (
        <AppointmentDrawer
          appointment={drawer.appointment}
          initialSlot={drawer.slot}
          isOpen
          mode={drawer.mode}
          professionals={dayQuery.data.professionals}
          selectedDate={bounds.startDate}
          selectedUnit={search.unit}
          services={dayQuery.data.services}
          onModeChange={(mode) => setDrawer((current) => (current ? { ...current, mode } : null))}
          onOpenChange={(open) => !open && setDrawer(null)}
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

      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </ModuleLayout>
  )
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
    <div aria-label="Carregando agenda" className="grid gap-2" role="status">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

function ScheduleError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="grid min-h-56 place-items-center rounded-lg border border-destructive p-6 text-center"
      role="alert"
    >
      <div>
        <CircleAlertIcon aria-hidden="true" className="mx-auto size-8 text-destructive" />
        <h2 className="mt-3 font-semibold">Não foi possível carregar a agenda</h2>
        <p className="mt-1 text-sm text-muted-foreground">Troque o cenário ou tente novamente.</p>
        <Button className="mt-4" type="button" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
