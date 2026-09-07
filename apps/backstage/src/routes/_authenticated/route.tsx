import { createFileRoute, Outlet } from "@tanstack/react-router"
import { AuthGate } from "@/modules/auth/components/auth-gate"
import { OperatorGate } from "@/modules/backstage/operator-gate"
import { SupportSessionProvider } from "@/modules/backstage/support-session"
import { BackstageShell } from "@/modules/shared/components/backstage-shell"

export const Route = createFileRoute("/_authenticated")({ component: Authenticated })

function Authenticated() {
  return (
    <AuthGate>
      <OperatorGate>
        <SupportSessionProvider>
          <BackstageShell>
            <Outlet />
          </BackstageShell>
        </SupportSessionProvider>
      </OperatorGate>
    </AuthGate>
  )
}
