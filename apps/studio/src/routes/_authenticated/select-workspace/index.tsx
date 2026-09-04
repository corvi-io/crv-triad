import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/modules/shared/components/ui/button"
import { useWorkspaceContext } from "@/modules/workspace/context-provider"
import { BarbershopAvatar, workspaceRoleLabel } from "@/modules/workspace/context-switcher"

export const Route = createFileRoute("/_authenticated/select-workspace/")({
  component: SelectWorkspacePage,
})

function SelectWorkspacePage() {
  const navigate = useNavigate()
  const { contexts, selectTenant } = useWorkspaceContext()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState(false)

  async function openTenant(id: string) {
    setPendingId(id)
    setSelectionError(false)
    try {
      await selectTenant(id)
      await navigate({ to: "/overview", replace: true })
    } catch {
      setSelectionError(true)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-svh bg-background px-5 py-10 text-foreground sm:px-8"
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Onde você quer trabalhar?</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Escolha a barbearia que você quer abrir agora. Você poderá trocar depois pelo menu do
            seu perfil.
          </p>
        </div>
        {selectionError ? (
          <p
            className="mt-6 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
            role="alert"
          >
            Não foi possível abrir o espaço. Seu contexto anterior foi preservado; tente novamente.
          </p>
        ) : null}
        <ul className="mt-8 grid gap-3">
          {contexts.tenants.map((tenant) => (
            <li
              key={tenant.id}
              className="flex flex-col gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <BarbershopAvatar tenant={tenant} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{tenant.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {workspaceRoleLabel[tenant.role]} · Gestão da barbearia
                  </p>
                </div>
              </div>
              <Button
                className="w-full sm:w-auto"
                disabled={!!pendingId}
                isLoading={pendingId === tenant.id}
                onClick={() => void openTenant(tenant.id)}
              >
                Abrir barbearia
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
