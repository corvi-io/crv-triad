import { Navigate, useLocation } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import { PageStatus } from "@/modules/shared/components/feedback/page-status"
import { Button } from "@/modules/shared/components/ui/button"
import { useWorkspaceContext } from "./context-provider"
import { getContextDestination } from "./context-routing"

export function WorkspaceContextGate({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const { contexts, selectTenant } = useWorkspaceContext()
  const automaticSelection = useRef<string | null>(null)
  const [selectionError, setSelectionError] = useState(false)
  const destination = getContextDestination(contexts, pathname)
  const onlyTenant = contexts.tenants.length === 1 ? contexts.tenants[0] : null

  useEffect(() => {
    if (
      destination === "/overview" &&
      onlyTenant &&
      !selectionError &&
      contexts.activeOrganizationId !== onlyTenant.id &&
      automaticSelection.current !== onlyTenant.id
    ) {
      setSelectionError(false)
      automaticSelection.current = onlyTenant.id
      void selectTenant(onlyTenant.id).catch(() => {
        automaticSelection.current = null
        setSelectionError(true)
      })
    }
  }, [contexts.activeOrganizationId, destination, onlyTenant, selectTenant, selectionError])

  if (contexts.tenants.length === 0) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
        <section className="max-w-md text-center" aria-labelledby="no-workspace-title">
          <h1 id="no-workspace-title" className="text-2xl font-semibold">
            Nenhum espaço disponível
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Peça ao responsável pela barbearia para revisar seu acesso.
          </p>
        </section>
      </main>
    )
  }

  if (destination === "/overview" && onlyTenant && !contexts.activeOrganizationId) {
    if (selectionError) {
      return (
        <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
          <section className="max-w-md text-center" role="alert">
            <h1 className="text-xl font-semibold">Não foi possível abrir sua barbearia</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua sessão continua segura. Tente confirmar o acesso novamente.
            </p>
            <Button
              className="mt-5"
              onClick={() => {
                automaticSelection.current = null
                setSelectionError(false)
              }}
              type="button"
            >
              Tentar novamente
            </Button>
          </section>
        </main>
      )
    }
    return <PageStatus title="Abrindo sua barbearia" description="Confirmando seu acesso." />
  }
  if (destination) return <Navigate replace to={destination} />
  return children
}
