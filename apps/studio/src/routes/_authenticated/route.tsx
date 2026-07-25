import { createOperationalNotificationsRepository } from "virtual:studio-operational-notifications-source"
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router"

import { AuthGate } from "@/modules/auth/components/auth-gate"
import { OperationalNotificationTrigger } from "@/modules/operational-notifications/notification-trigger"
import { OperationalNotificationsRepositoryProvider } from "@/modules/operational-notifications/repository-context"
import { WorkspaceShell } from "@/modules/shared/components/workspace-shell"

const operationalNotificationsRepository = createOperationalNotificationsRepository?.()

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedRoute,
})

function AuthenticatedRoute() {
  const scenarioId = useLocation({
    select: (location) => new URLSearchParams(location.searchStr).get("scenario") ?? undefined,
  })
  const content = (
    <AuthGate>
      <WorkspaceShell
        headerActions={
          operationalNotificationsRepository ? (
            <OperationalNotificationTrigger scenarioId={scenarioId} />
          ) : undefined
        }
      >
        <Outlet />
      </WorkspaceShell>
    </AuthGate>
  )
  return operationalNotificationsRepository ? (
    <OperationalNotificationsRepositoryProvider repository={operationalNotificationsRepository}>
      {content}
    </OperationalNotificationsRepositoryProvider>
  ) : (
    content
  )
}
