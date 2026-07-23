import {
  createClientRepository,
  resolveClientManagementScenario,
} from "virtual:studio-client-management-source"
import { createFileRoute } from "@tanstack/react-router"
import { ClientDirectoryPage } from "@/modules/clients/client-directory-page"
import { ClientRepositoryProvider } from "@/modules/clients/repository-context"
import { type ClientSearch, validateClientSearch } from "@/modules/clients/search"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"

const repository = createClientRepository?.()

export const Route = createFileRoute("/_authenticated/clients/")({
  component: ClientRoute,
  validateSearch: (search: Record<string, unknown>): ClientSearch =>
    validateClientSearch(search, resolveClientManagementScenario),
})

function ClientRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  if (!repository) {
    return (
      <ModuleLayout
        head={
          <PageHeader
            title="Clientes"
            description="Encontre clientes e consulte o histórico de atendimento."
          />
        }
      >
        <div
          role="status"
          className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
        >
          O gerenciamento de clientes está indisponível neste ambiente.
        </div>
      </ModuleLayout>
    )
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
