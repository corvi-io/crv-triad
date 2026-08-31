import { useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import type { RevenueDashboardProjection } from "@/modules/revenue-operations/contracts"
import {
  type DashboardFilters,
  WorkspaceOverview,
  type WorkspaceOverviewModel,
} from "@/modules/shared/components/workspace-overview"

import { AppointmentDrawer, type DrawerMode } from "./appointment-drawer"
import type { Appointment, ScheduleDayQuery } from "./contracts"
import { deriveDashboard } from "./dashboard-projection"
import {
  type DashboardSearch,
  dashboardBounds,
  dashboardComparisonBounds,
  validateDashboardProfessionalId,
} from "./dashboard-search"
import { useScheduleDay } from "./queries"

export function DashboardPage({
  notificationAttentionState = "unavailable",
  onNavigateClients,
  onNavigateNotifications,
  onOpenNotification,
  onNavigateServices,
  onSearchChange,
  paidSales,
  notificationAttention,
  onRetryNotifications,
  search,
}: {
  notificationAttentionState?: "error" | "loading" | "ready" | "unavailable"
  onNavigateClients?: () => void
  onNavigateNotifications?: () => void
  onOpenNotification?: (id: string) => void
  onNavigateServices: () => void
  onSearchChange: (next: Partial<DashboardSearch>) => void
  paidSales?: readonly RevenueDashboardProjection[]
  notificationAttention?: WorkspaceOverviewModel["attention"]
  onRetryNotifications?: () => void
  search: DashboardSearch
}) {
  const navigate = useNavigate()
  const bounds = dashboardBounds(search)
  const comparisonBounds = dashboardComparisonBounds(bounds)
  const comparisonEndDate = comparisonBounds.endDate
  const comparisonStartDate = comparisonBounds.startDate
  const query: ScheduleDayQuery = {
    endDate: bounds.endDate,
    focusDate: bounds.startDate,
    scenarioId: search.scenario,
    startDate: comparisonStartDate,
    unitId: search.unitId,
  }
  const dayQuery = useScheduleDay(query)
  const validatedProfessionalId = validateDashboardProfessionalId(
    search.professionalId,
    dayQuery.data?.professionals.map(({ id }) => id),
  )
  const [drawer, setDrawer] = useState<{
    appointment?: Appointment
    mode: DrawerMode
  } | null>(null)
  const model = useMemo(() => {
    if (!dayQuery.data) return undefined
    const projected = deriveDashboard({
      bounds: { endDate: bounds.endDate, startDate: bounds.startDate },
      comparisonBounds: {
        endDate: comparisonEndDate,
        startDate: comparisonStartDate,
      },
      day: dayQuery.data,
      filters: {
        customEnd: search.customEnd,
        customStart: search.customStart,
        period: search.period,
        professionalId: search.professionalId,
        unitId: search.unitId,
      },
      now: new Date(),
      paidSales,
      updatedAt: dayQuery.dataUpdatedAt,
    })
    return notificationAttention ? { ...projected, attention: notificationAttention } : projected
  }, [
    bounds.endDate,
    bounds.startDate,
    comparisonEndDate,
    comparisonStartDate,
    dayQuery.data,
    dayQuery.dataUpdatedAt,
    paidSales,
    notificationAttention,
    search.customEnd,
    search.customStart,
    search.period,
    search.professionalId,
    search.unitId,
  ])
  const hasActiveFilters =
    search.period !== "today" || search.unitId !== "centro" || Boolean(search.professionalId)

  useEffect(() => {
    if (dayQuery.data && search.professionalId && !validatedProfessionalId) {
      onSearchChange({ professionalId: undefined })
    }
  }, [dayQuery.data, onSearchChange, search.professionalId, validatedProfessionalId])

  function changeFilters(next: Partial<DashboardFilters>) {
    onSearchChange(next)
  }

  function navigateAgenda(filters?: { professionalId?: string; status?: string }) {
    const period = bounds.startDate === bounds.endDate ? "today" : "custom"
    const professional = validateDashboardProfessionalId(
      filters?.professionalId ?? model?.filters.professionalId,
      dayQuery.data?.professionals.map(({ id }) => id),
    )
    void navigate({
      search: {
        client: undefined,
        customEnd: period === "custom" ? bounds.endDate : undefined,
        customStart: period === "custom" ? bounds.startDate : undefined,
        date: bounds.startDate,
        period,
        professional,
        scenario: search.scenario,
        service: undefined,
        status: filters?.status,
        unit: search.unitId,
        view: "board",
      },
      to: "/agenda",
    })
  }

  function openAppointment(id: string) {
    const appointment = dayQuery.data?.appointments.find((item) => item.id === id)
    if (appointment) setDrawer({ appointment, mode: "view" })
  }

  return (
    <>
      <WorkspaceOverview
        attentionState={notificationAttentionState}
        hasActiveFilters={hasActiveFilters}
        model={model}
        state={
          dayQuery.isPending ? "loading" : dayQuery.isError ? "error" : model ? "ready" : "error"
        }
        onFiltersChange={changeFilters}
        onNavigateAgenda={navigateAgenda}
        onNavigateClients={onNavigateClients}
        onNavigateNotifications={onNavigateNotifications}
        onOpenAttention={onOpenNotification}
        onNavigateServices={onNavigateServices}
        onNewAppointment={() => setDrawer({ mode: "create" })}
        onOpenAppointment={openAppointment}
        onRetry={() => void dayQuery.refetch()}
        onRetryAttention={onRetryNotifications}
      />
      {dayQuery.data && drawer ? (
        <AppointmentDrawer
          appointment={drawer.appointment}
          isOpen
          mode={drawer.mode}
          professionals={dayQuery.data.professionals}
          selectedDate={bounds.startDate}
          selectedUnit={search.unitId}
          services={dayQuery.data.services}
          onModeChange={(mode) =>
            setDrawer((current) => (current ? { ...current, mode } : current))
          }
          onOpenChange={(open) => !open && setDrawer(null)}
        />
      ) : null}
    </>
  )
}
