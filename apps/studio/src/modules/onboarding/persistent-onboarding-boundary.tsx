import { Navigate } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useWorkspaceContext } from "@/modules/workspace/context-provider"
import { isOnboardingDismissed } from "./dismissal"
import { useActivationReadiness } from "./readiness"

export function PersistentOnboardingBoundary({
  children,
  pathname,
}: {
  children: ReactNode
  pathname: string
}) {
  const readiness = useActivationReadiness()
  const { activeTenant } = useWorkspaceContext()
  const mustConfigure =
    readiness.data?.canManage === true &&
    readiness.data.outcome === "setup_required" &&
    !isOnboardingDismissed(activeTenant?.id)

  if (mustConfigure && !pathname.startsWith("/barbershop-setup")) {
    return <Navigate replace to="/barbershop-setup" />
  }

  return children
}
