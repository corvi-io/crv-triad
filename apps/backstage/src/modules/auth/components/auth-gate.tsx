import { Navigate } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { useAuth } from "@/modules/auth/services/auth-provider"
import { PageStatus } from "@/modules/shared/components/feedback/page-status"

export function AuthGate({ children }: { children: ReactNode }) {
  const { error, isPending, session } = useAuth()

  if (isPending) {
    return (
      <PageStatus title="Verificando acesso" description="Aguarde enquanto validamos sua sessão." />
    )
  }

  if (error || !session) {
    return <Navigate to="/login" replace />
  }

  return children
}
