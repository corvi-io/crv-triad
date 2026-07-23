import {
  createServiceDeskRepository,
  serviceDeskScenarioIds,
} from "virtual:studio-service-desk-source"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { ServiceDeskRepositoryProvider } from "@/modules/service-desk/repository-context"
import { type ServiceDeskSearch, validateServiceDeskSearch } from "@/modules/service-desk/search"
import { ServiceDeskPage } from "@/modules/service-desk/service-desk-page"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"

const repository = createServiceDeskRepository?.()

export const Route = createFileRoute("/_authenticated/service-desk/")({
  component: ServiceDeskRoute,
  validateSearch: (search: Record<string, unknown>): ServiceDeskSearch =>
    validateServiceDeskSearch(search, serviceDeskScenarioIds),
  beforeLoad: ({ location, search }) => {
    if (shouldCanonicalizeSearch(location.searchStr, search)) {
      throw redirect({ replace: true, search, to: "/service-desk" })
    }
  },
})

function ServiceDeskRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  if (!repository) {
    return (
      <ModuleLayout
        head={
          <PageHeader
            title="Atendimentos"
            description="Acompanhe chegadas, chamadas e serviços iniciados."
          />
        }
        bodyViewportClassName="p-4 sm:p-6"
      >
        <Alert>
          <AlertTitle>Atendimentos indisponíveis</AlertTitle>
          <AlertDescription>
            Este módulo de avaliação está desativado neste ambiente.
          </AlertDescription>
        </Alert>
      </ModuleLayout>
    )
  }
  return (
    <ServiceDeskRepositoryProvider repository={repository}>
      <ServiceDeskPage
        search={search}
        onSearchChange={(next) =>
          navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
        }
      />
    </ServiceDeskRepositoryProvider>
  )
}

function shouldCanonicalizeSearch(searchString: string, search: ServiceDeskSearch) {
  const parameters = new URLSearchParams(searchString)
  const allowed = new Set(["preference", "priority", "professional", "scenario", "stage", "unit"])
  for (const key of parameters.keys()) {
    if (!allowed.has(key)) return true
  }
  for (const key of allowed) {
    const raw = parameters.get(key)
    if (raw !== null && raw !== search[key as keyof ServiceDeskSearch]) return true
  }
  return false
}
