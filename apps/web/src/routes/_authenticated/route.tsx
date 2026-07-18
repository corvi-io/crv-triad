import { createFileRoute, Outlet } from "@tanstack/react-router"

import { AuthGate } from "@/modules/auth/components/auth-gate"
import { WorkspaceShell } from "@/modules/shared/components/workspace-shell"

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedRoute,
})

function AuthenticatedRoute() {
  return (
    <AuthGate>
      <WorkspaceShell>
        <Outlet />
      </WorkspaceShell>
    </AuthGate>
  )
}
