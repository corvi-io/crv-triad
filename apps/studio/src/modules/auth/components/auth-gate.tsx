import { Navigate } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { useAuth } from "@/modules/auth/services/auth-provider"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"

export function AuthGate({ children }: { children: ReactNode }) {
  const { error, isPending, refetch, session } = useAuth()

  if (isPending) {
    return <SessionSkeleton />
  }

  if (!session && (!error || getErrorStatus(error) === 401)) {
    return <Navigate to="/login" replace />
  }

  if (error && getErrorStatus(error) === 403) {
    return (
      <SessionFailure
        title="Acesso não autorizado"
        description="Sua sessão continua ativa, mas esta área não está disponível para sua conta."
        onRetry={refetch}
      />
    )
  }

  if (error && !session) {
    return (
      <SessionFailure
        title="Não foi possível confirmar sua sessão"
        description="Verifique sua conexão e tente novamente. Você não foi desconectado."
        onRetry={refetch}
      />
    )
  }

  return children
}

function SessionSkeleton() {
  return (
    <main
      aria-label="Preparando sua área de trabalho"
      role="status"
      className="flex min-h-svh bg-background"
    >
      <div className="hidden w-64 border-r p-4 md:block">
        <Skeleton className="h-10 w-32" />
        <div className="mt-10 space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-4/5" />
        </div>
      </div>
      <div className="flex-1 p-5 md:p-8">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="mt-6 h-72" />
      </div>
    </main>
  )
}

function SessionFailure({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry: () => void
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6">
      <section className="max-w-md text-center" role="alert">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button className="mt-5" onClick={onRetry}>
          Tentar novamente
        </Button>
      </section>
    </main>
  )
}

function getErrorStatus(error: Error) {
  const candidate = error as Error & { status?: number; statusCode?: number }
  return candidate.status ?? candidate.statusCode
}
