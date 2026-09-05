import { createOperationalNotificationsRepository } from "virtual:studio-operational-notifications-source"
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router"
import { useAccessSummary } from "@/modules/access/use-access-summary"
import { AuthGate } from "@/modules/auth/components/auth-gate"
import { OperationalNotificationTrigger } from "@/modules/operational-notifications/notification-trigger"
import { OperationalNotificationsRepositoryProvider } from "@/modules/operational-notifications/repository-context"
import { WorkspaceShell } from "@/modules/shared/components/workspace-shell"
import { WorkspaceContextGate } from "@/modules/workspace/context-gate"
import { WorkspaceContextProvider } from "@/modules/workspace/context-provider"
import {
  ContextSwitcherMenuItem,
  ContextSwitcherProvider,
} from "@/modules/workspace/context-switcher"

const operationalNotificationsRepository = createOperationalNotificationsRepository?.()

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedRoute,
})

function AuthenticatedRoute() {
  const scenarioId = useLocation({
    select: (location) =>
      new URLSearchParams(location.searchStr).get("notificationScenario") ?? undefined,
  })
  const content = (
    <AuthGate>
      <WorkspaceContextProvider>
        <WorkspaceContextGate>
          <AuthenticatedContent scenarioId={scenarioId} />
        </WorkspaceContextGate>
      </WorkspaceContextProvider>
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

function AuthenticatedContent({ scenarioId }: { scenarioId?: string }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const access = useAccessSummary()
  const canReadClients =
    access.data?.capabilities.some((item) => item.capability === "clients.read" && item.allowed) ??
    false
  if (pathname === "/select-workspace") return <Outlet />

  return (
    <ContextSwitcherProvider>
      <WorkspaceShell
        hiddenPrimaryPaths={canReadClients ? [] : ["/clients"]}
        workspaceSwitcher={<ContextSwitcherMenuItem />}
        headerActions={
          <div className="flex items-center gap-2">
            {operationalNotificationsRepository ? (
              <OperationalNotificationTrigger scenarioId={scenarioId} />
            ) : null}
          </div>
        }
      >
        <Outlet />
      </WorkspaceShell>
    </ContextSwitcherProvider>
  )
}
