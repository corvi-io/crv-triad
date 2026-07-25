import { createOperationalNotificationsRepository } from "virtual:studio-operational-notifications-source"
import { createRevenueOperationsRepository } from "virtual:studio-revenue-operations-source"
import { createSchedulingRepository } from "virtual:studio-scheduling-prototype"
import { createFileRoute } from "@tanstack/react-router"
import { resolveNotificationDestination } from "@/modules/operational-notifications/destinations"
import { useNotificationPreview } from "@/modules/operational-notifications/queries"
import { useRevenueDashboardProjection } from "@/modules/revenue-operations/queries"
import { RevenueOperationsRepositoryProvider } from "@/modules/revenue-operations/repository-context"
import { DashboardPage } from "@/modules/scheduling/dashboard-page"
import {
  type DashboardSearch,
  validateDashboardSearch,
} from "@/modules/scheduling/dashboard-search"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"
import { defaultServiceDeskSearch } from "@/modules/service-desk/search"
import { formatDateOnly } from "@/modules/shared/components/forms/date-picker"
import { WorkspaceOverview } from "@/modules/shared/components/workspace-overview"

const repository = createSchedulingRepository?.()
const revenueRepository = createRevenueOperationsRepository?.()
const notificationsRepository = createOperationalNotificationsRepository?.()

export const Route = createFileRoute("/_authenticated/overview/")({
  component: OverviewRoute,
  validateSearch: (search: Record<string, unknown>): Partial<DashboardSearch> =>
    validateDashboardSearch(
      search,
      formatDateOnly(new Date()),
      repository?.scenarios().map(({ id }) => id),
    ),
})

function OverviewRoute() {
  const search = validateDashboardSearch(
    Route.useSearch(),
    formatDateOnly(new Date()),
    repository?.scenarios().map(({ id }) => id),
  )
  const navigate = Route.useNavigate()
  if (!repository) {
    return (
      <WorkspaceOverview
        state="disabled"
        onFiltersChange={() => undefined}
        onNavigateAgenda={() => undefined}
        onNavigateServices={() => undefined}
        onNewAppointment={() => undefined}
        onOpenAppointment={() => undefined}
        onRetry={() => undefined}
      />
    )
  }
  return (
    <SchedulingRepositoryProvider repository={repository}>
      {revenueRepository ? (
        <RevenueOperationsRepositoryProvider repository={revenueRepository}>
          {notificationsRepository ? (
            <DashboardWithNotifications>
              {(notificationProps) => (
                <DashboardWithRevenue
                  {...notificationProps}
                  search={search}
                  onNavigateClients={() =>
                    navigate({
                      search: {
                        contact: "all",
                        duplicate: "all",
                        page: 1,
                        pageSize: 10,
                        scenario: "typical",
                        sortDirection: "asc",
                        sortField: "name",
                        status: "active",
                        tag: "",
                      },
                      to: "/clients",
                    })
                  }
                  onNavigateServices={() =>
                    navigate({
                      search: {
                        availabilityDate: search.date,
                        availabilityView: "week",
                        scenario: "single-unit",
                        section: "services",
                      },
                      to: "/barbershop-setup",
                    })
                  }
                  onSearchChange={(next) =>
                    navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
                  }
                />
              )}
            </DashboardWithNotifications>
          ) : (
            <DashboardWithRevenue
              search={search}
              onNavigateClients={() =>
                navigate({
                  search: {
                    contact: "all",
                    duplicate: "all",
                    page: 1,
                    pageSize: 10,
                    scenario: "typical",
                    sortDirection: "asc",
                    sortField: "name",
                    status: "active",
                    tag: "",
                  },
                  to: "/clients",
                })
              }
              onNavigateServices={() =>
                navigate({
                  search: {
                    availabilityDate: search.date,
                    availabilityView: "week",
                    scenario: "single-unit",
                    section: "services",
                  },
                  to: "/barbershop-setup",
                })
              }
              onSearchChange={(next) =>
                navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
              }
            />
          )}
        </RevenueOperationsRepositoryProvider>
      ) : (
        <DashboardPage
          search={search}
          onNavigateClients={() =>
            navigate({
              search: {
                contact: "all",
                duplicate: "all",
                page: 1,
                pageSize: 10,
                scenario: "typical",
                sortDirection: "asc",
                sortField: "name",
                status: "active",
                tag: "",
              },
              to: "/clients",
            })
          }
          onNavigateServices={() =>
            navigate({
              search: {
                availabilityDate: search.date,
                availabilityView: "week",
                scenario: "single-unit",
                section: "services",
              },
              to: "/barbershop-setup",
            })
          }
          onSearchChange={(next) =>
            navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
          }
        />
      )}
    </SchedulingRepositoryProvider>
  )
}

function DashboardWithRevenue(props: React.ComponentProps<typeof DashboardPage>) {
  const revenue = useRevenueDashboardProjection()
  return <DashboardPage {...props} paidSales={revenue.data ?? []} />
}

function DashboardWithNotifications({
  children,
}: {
  children: (
    props: Pick<
      React.ComponentProps<typeof DashboardPage>,
      | "notificationAttention"
      | "notificationAttentionState"
      | "onNavigateNotifications"
      | "onOpenNotification"
      | "onRetryNotifications"
    >,
  ) => React.ReactNode
}) {
  const notifications = useNotificationPreview({ activeLimit: 4, historyLimit: 0 })
  const navigate = Route.useNavigate()
  return children({
    notificationAttentionState: notifications.isPending
      ? "loading"
      : notifications.isError
        ? "error"
        : "ready",
    notificationAttention: notifications.data?.active.map((item) => ({
      description: item.detail,
      id: item.id,
      title: item.summary,
      tone:
        item.severity === "critical"
          ? "danger"
          : item.severity === "attention"
            ? "warning"
            : "info",
    })),
    onNavigateNotifications: () =>
      void navigate({ search: { notificationScenario: undefined }, to: "/notifications" }),
    onOpenNotification: (id) => {
      const notification = notifications.data?.active.find((item) => item.id === id)
      const destination = notification
        ? resolveNotificationDestination(notification.destination)
        : null
      if (!destination || destination.kind === "notifications") {
        void navigate({ search: { notificationScenario: undefined }, to: "/notifications" })
        return
      }
      if (destination.kind === "agenda") {
        void navigate({
          search: {
            appointment: destination.appointment,
            date: destination.date ?? formatDateOnly(new Date()),
            period: "today",
            scenario: "normal",
            unit: "centro",
            view: "board",
          },
          to: "/agenda",
        })
        return
      }
      if (destination.kind === "checkout") {
        void navigate({
          params: { sessionId: destination.sessionId },
          search: defaultServiceDeskSearch,
          to: "/service-desk/$sessionId/checkout",
        })
        return
      }
      void navigate({
        params: { sessionId: destination.sessionId },
        search: defaultServiceDeskSearch,
        to: "/service-desk/$sessionId",
      })
    },
    onRetryNotifications: () => void notifications.refetch(),
  })
}
