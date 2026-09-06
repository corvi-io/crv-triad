import { useQuery } from "@tanstack/react-query"
import { addDays, format, parseISO } from "date-fns"
import { MapPinIcon } from "lucide-react"
import { useState } from "react"
import { ActivationCard } from "@/modules/onboarding/activation-card"
import { SingleSelectListFilter } from "@/modules/shared/components/data-display/list-filter"
import { DatePicker } from "@/modules/shared/components/forms/date-picker"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { WorkspaceOverview } from "@/modules/shared/components/workspace-overview"
import { useWorkspaceContext } from "@/modules/workspace/context-provider"
import { AppointmentDrawer, type DrawerMode } from "./appointment-drawer"
import type { Appointment } from "./contracts"
import type { DashboardSearch } from "./dashboard-search"
import { dashboardBounds } from "./dashboard-search"
import { productionDashboardModel } from "./production-dashboard-projection"
import { useSchedulingRepository } from "./repository-context"

type DashboardProps = {
  search: DashboardSearch
  onSearchChange: (value: Partial<DashboardSearch>) => void
}
export function ProductionDashboard(props: DashboardProps) {
  const { activeTenant } = useWorkspaceContext()
  return <Dashboard key={activeTenant?.id} {...props} />
}
function Dashboard({ search, onSearchChange }: DashboardProps) {
  const repository = useSchedulingRepository(),
    { activeTenant } = useWorkspaceContext()
  const unit = search.unitId,
    date = search.date
  const setUnit = (unitId: string) => onSearchChange({ unitId })
  const setDate = (date: string) => onSearchChange({ date })
  const [drawer, setDrawer] = useState<{ appointment?: Appointment; mode: DrawerMode } | null>(null)
  const units = useQuery({
    queryKey: ["scheduling", activeTenant?.id, "units"],
    queryFn: ({ signal }) => {
      if (!repository.units) throw new Error("Não foi possível carregar as unidades.")
      return repository.units(signal)
    },
  })
  const selected =
    units.data?.find((item) => item.id === unit) ??
    (units.data?.length === 1 ? units.data[0] : undefined)
  const query = { unitId: selected?.id ?? "", ...dashboardBounds(search) }
  const range = useQuery({
    queryKey: ["scheduling", activeTenant?.id, "dashboard", query],
    queryFn: async ({ signal }) => {
      const chunks = []
      for (
        let startDate = query.startDate;
        startDate <= query.endDate;
        startDate = format(addDays(parseISO(startDate), 7), "yyyy-MM-dd")
      ) {
        const end = format(addDays(parseISO(startDate), 6), "yyyy-MM-dd")
        chunks.push({ ...query, startDate, endDate: end < query.endDate ? end : query.endDate })
      }
      const ranges = await Promise.all(chunks.map((chunk) => repository.getRange(chunk, signal)))
      return {
        ...ranges[0],
        appointments: [
          ...new Map(
            ranges
              .flatMap((range) => range.appointments)
              .map((appointment) => [appointment.id, appointment]),
          ).values(),
        ],
        availability: ranges.flatMap((range) => range.availability ?? []),
        occupancies: ranges.flatMap((range) => range.occupancies),
        periods: ranges.flatMap((range) => range.periods),
      }
    },
    enabled: Boolean(selected?.timezone),
  })
  if (selected?.timezone && range.data && !range.isError && !units.isError) {
    const model = productionDashboardModel(
      range.data,
      { ...search, unitId: selected.id },
      units.data ?? [],
      range.dataUpdatedAt,
    )
    return (
      <>
        <ActivationCard />
        <WorkspaceOverview
          state="ready"
          model={model}
          attentionState="unavailable"
          onFiltersChange={onSearchChange}
          onNavigateAgenda={(filters) => {
            const params = new URLSearchParams({
              unit: selected.id,
              date: query.startDate,
              period: "custom",
              customStart: query.startDate,
              customEnd: query.endDate,
              view: "list",
            })
            if (filters?.professionalId ?? search.professionalId)
              params.set("professional", filters?.professionalId ?? search.professionalId ?? "")
            if (filters?.status) params.set("status", filters.status)
            window.location.assign(`/agenda?${params}`)
          }}
          onNavigateServices={() => window.location.assign("/barbershop-setup/services")}
          onNavigateClients={() => window.location.assign("/clients")}
          onNewAppointment={() => setDrawer({ mode: "create" })}
          onOpenAppointment={(id) => {
            const appointment = range.data.appointments.find((item) => item.id === id)
            if (appointment) setDrawer({ appointment, mode: "view" })
          }}
          onRetry={() => void range.refetch()}
        />
        {drawer ? (
          <AppointmentDrawer
            appointment={drawer.appointment}
            isOpen
            mode={drawer.mode}
            onModeChange={(mode) => setDrawer({ ...drawer, mode })}
            onOpenChange={(open) => !open && setDrawer(null)}
            professionals={range.data.professionals}
            services={range.data.services}
            selectedDate={query.startDate}
            selectedUnit={selected.id}
          />
        ) : null}
      </>
    )
  }
  return (
    <ModuleLayout
      head={
        <div className="flex flex-col gap-3">
          <PageHeader title="Dashboard" description="Acompanhe os agendamentos da unidade." />
          <div className="flex flex-wrap items-center gap-2">
            <SingleSelectListFilter
              showSelectedLabel
              icon={MapPinIcon}
              id="dashboard-unit"
              label="Unidade"
              inactiveValue=""
              value={selected?.id ?? ""}
              options={units.data?.map((item) => ({ label: item.name, value: item.id })) ?? []}
              onValueChange={setUnit}
            />
            <div className="w-40 shrink-0 [&>button]:h-10">
              <DatePicker
                id="dashboard-date"
                placeholder="Selecione a data"
                value={date}
                onValueChange={setDate}
              />
            </div>
            {selected ? (
              <a
                className="text-sm text-foreground underline"
                href={`/agenda?unit=${encodeURIComponent(selected.id)}&date=${date}`}
              >
                Abrir Agenda
              </a>
            ) : null}
          </div>
        </div>
      }
    >
      {units.isPending || (selected?.timezone && range.isPending) ? (
        <div role="status" aria-label="Carregando agendamentos">
          <Skeleton className="h-80" />
        </div>
      ) : units.isError || range.isError ? (
        <div role="alert">
          <p>Não foi possível carregar os agendamentos.</p>
          <Button
            onClick={() => {
              void units.refetch()
              void range.refetch()
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : !selected ? (
        <p role="status">Selecione uma unidade para acompanhar os agendamentos.</p>
      ) : !selected.timezone ? (
        <p role="status">
          Confirme o fuso horário em{" "}
          <a className="underline" href="/barbershop-setup/availability">
            Disponibilidade
          </a>{" "}
          para começar.
        </p>
      ) : null}
    </ModuleLayout>
  )
}
