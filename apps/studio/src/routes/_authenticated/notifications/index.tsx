import {
  createOperationalNotificationsRepository,
  operationalNotificationScenarioIds,
} from "virtual:studio-operational-notifications-source"
import { createFileRoute } from "@tanstack/react-router"
import { NotificationCenterPage } from "@/modules/operational-notifications/notification-center-page"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"

const repository = createOperationalNotificationsRepository?.()

export const Route = createFileRoute("/_authenticated/notifications/")({
  component: NotificationsRoute,
  validateSearch: (search: Record<string, unknown>) => ({
    scenario:
      typeof search.scenario === "string" &&
      operationalNotificationScenarioIds.includes(search.scenario)
        ? search.scenario
        : undefined,
  }),
})

function NotificationsRoute() {
  const { scenario } = Route.useSearch()
  if (!repository) {
    return (
      <Alert>
        <AlertTitle>Notificações indisponíveis</AlertTitle>
        <AlertDescription>A fonte operacional não está habilitada neste ambiente.</AlertDescription>
      </Alert>
    )
  }
  return <NotificationCenterPage scenarioId={scenario} />
}
