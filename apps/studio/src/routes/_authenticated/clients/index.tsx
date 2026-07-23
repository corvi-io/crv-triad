import {
  createClientRepository,
  resolveClientManagementScenario,
} from "virtual:studio-client-management-source"
import { createFileRoute } from "@tanstack/react-router"
import { ClientDirectoryPage } from "@/modules/clients/client-directory-page"
import { ClientManagementUnavailableState } from "@/modules/clients/client-management-unavailable-state"
import { ClientRepositoryProvider } from "@/modules/clients/repository-context"
import { type ClientSearch, validateClientSearch } from "@/modules/clients/search"

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
