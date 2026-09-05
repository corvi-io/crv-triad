import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, type ReactNode, useContext } from "react"

import { PageStatus } from "@/modules/shared/components/feedback/page-status"
import { Button } from "@/modules/shared/components/ui/button"

import {
  type AvailableContexts,
  listAvailableContexts,
  selectTenantWorkspace,
  type TenantWorkspace,
} from "./services/context-client"

const contextQueryKey = ["administrative-contexts"] as const

type WorkspaceContextValue = {
  activeTenant: TenantWorkspace | null
  contexts: Awaited<ReturnType<typeof listAvailableContexts>>
  selectTenant: (organizationId: string) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceContextProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const contextsQuery = useQuery({
    queryKey: contextQueryKey,
    queryFn: ({ signal }) =>
      import.meta.env.MODE === "test"
        ? Promise.resolve({
            activeOrganizationId: "test-tenant",
            platform: null,
            status: "available" as const,
            tenants: [
              { id: "test-tenant", name: "Barbearia de teste", role: "owner" as const },
              { id: "second-tenant", name: "Barbearia dois", role: "admin" as const },
            ],
          })
        : listAvailableContexts(signal),
  })

  async function selectTenant(organizationId: string) {
    const selection = await selectTenantWorkspace(organizationId)
    await queryClient.cancelQueries()
    queryClient.setQueryData<AvailableContexts>(contextQueryKey, (current) =>
      current ? { ...current, activeOrganizationId: selection.activeOrganizationId } : current,
    )
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== contextQueryKey[0],
    })
  }

  const activeTenant =
    contextsQuery.data?.tenants.find(
      (tenant) => tenant.id === contextsQuery.data.activeOrganizationId,
    ) ?? null
  const value: WorkspaceContextValue | null = contextsQuery.data
    ? { activeTenant, contexts: contextsQuery.data, selectTenant }
    : null

  if (contextsQuery.isPending) {
    return <WorkspaceContextLoading />
  }
  if (contextsQuery.isError || !value) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <div className="flex max-w-md flex-col gap-3 text-center" role="alert">
          <h1 className="text-xl font-semibold">Não foi possível carregar seus espaços</h1>
          <p className="text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente. Nenhum dado de outra empresa foi carregado.
          </p>
          <Button className="mx-auto" onClick={() => contextsQuery.refetch()} type="button">
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>
}

function WorkspaceContextLoading() {
  return <PageStatus title="Preparando seus espaços" description="Aguarde um instante." />
}

export function useWorkspaceContext() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error("useWorkspaceContext must be used inside WorkspaceContextProvider.")
  return value
}
