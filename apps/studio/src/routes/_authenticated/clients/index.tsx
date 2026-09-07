import {
  createClientRepository,
  resolveClientManagementScenario,
} from "virtual:studio-client-management-source"
import { createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { useState } from "react"
import { requestCapability, useAccessSummary } from "@/modules/access/use-access-summary"
import { ClientDirectoryPage } from "@/modules/clients/client-directory-page"
import { ClientManagementUnavailableState } from "@/modules/clients/client-management-unavailable-state"
import { ClientRepositoryProvider } from "@/modules/clients/repository-context"
import {
  type ClientSearch,
  clientSearchDefaults,
  validateClientSearch,
} from "@/modules/clients/search"
import { PageStatus } from "@/modules/shared/components/feedback/page-status"
import { Button } from "@/modules/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/components/ui/card"

const repository = createClientRepository?.()

export const Route = createFileRoute("/_authenticated/clients/")({
  component: ClientRoute,
  validateSearch: (search: Record<string, unknown>): ClientSearch =>
    validateClientSearch(search, resolveClientManagementScenario),
  search: {
    middlewares: [stripSearchParams(clientSearchDefaults)],
  },
})

function ClientRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const access = useAccessSummary()
  const [requestState, setRequestState] = useState<"idle" | "pending" | "sent" | "error">("idle")
  const clientAccess = access.data?.capabilities.find((item) => item.capability === "clients.read")

  if (access.isPending)
    return <PageStatus title="Verificando seu acesso" description="Aguarde um instante." />
  if (access.isError || !clientAccess) {
    return (
      <Card className="mx-auto mt-10 max-w-xl">
        <CardHeader>
          <CardTitle>Não foi possível verificar seu acesso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            Nenhuma permissão foi alterada. Tente carregar novamente.
          </p>
          <Button className="w-fit" variant="outline" onClick={() => void access.refetch()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }
  if (!clientAccess.allowed) {
    return (
      <Card className="mx-auto mt-10 max-w-xl">
        <CardHeader>
          <CardTitle>Acesso a clientes indisponível</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">{denialMessage(clientAccess.reason)}</p>
          {requestState === "sent" ? (
            <p className="text-sm" role="status">
              Solicitação enviada ao responsável.
            </p>
          ) : null}
          {requestState === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              Não foi possível enviar a solicitação.
            </p>
          ) : null}
          <Button
            className="w-fit"
            disabled={requestState === "pending" || requestState === "sent"}
            onClick={async () => {
              setRequestState("pending")
              try {
                await requestCapability("clients.read")
                setRequestState("sent")
              } catch {
                setRequestState("error")
              }
            }}
          >
            {requestState === "pending" ? "Enviando…" : "Solicitar acesso"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!repository) {
    return <ClientManagementUnavailableState />
  }

  return (
    <ClientRepositoryProvider repository={repository}>
      <ClientDirectoryPage
        search={search}
        onSearchChange={(next) =>
          navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
        }
      />
    </ClientRepositoryProvider>
  )
}

function denialMessage(reason: string | null) {
  if (reason === "capability_forbidden") return "Sua função atual não permite consultar clientes."
  if (reason === "subscription_inactive")
    return "A assinatura da barbearia está suspensa ou expirada."
  if (reason === "module_not_included") return "O plano atual não inclui a gestão de clientes."
  return "Este recurso não está liberado para o acesso atual."
}
