import {
  createOperationalNotificationsRepository,
  operationalNotificationScenarioIds,
} from "virtual:studio-operational-notifications-source"
import { createFileRoute } from "@tanstack/react-router"
import { NotificationCenterPage } from "@/modules/operational-notifications/notification-center-page"
import { AccountPageLayout } from "@/modules/shared/components/layout/account-page-layout"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"

const repository = createOperationalNotificationsRepository?.()

export const Route = createFileRoute("/_authenticated/notifications/")({
  component: NotificationsRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    notificationScenario:
      typeof search.notificationScenario === "string" &&
      operationalNotificationScenarioIds.includes(search.notificationScenario)
        ? search.notificationScenario
        : undefined,
  }),
})

function NotificationsRoute() {
  const { notificationScenario } = Route.useSearch()
  if (!repository) {
    return (
      <AccountPageLayout
        title="Notificações"
        description="Acompanhe situações operacionais e siga para a próxima ação."
      >
        <Alert>
          <AlertTitle>Notificações indisponíveis</AlertTitle>
          <AlertDescription>
            A fonte operacional não está habilitada neste ambiente.
          </AlertDescription>
        </Alert>
      </AccountPageLayout>
    )
  }
  return <NotificationCenterPage scenarioId={notificationScenario} />
}
