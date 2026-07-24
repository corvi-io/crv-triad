import {
  createServiceDeskRepository,
  serviceDeskScenarioIds,
} from "virtual:studio-service-desk-source"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { ServiceDeskRepositoryProvider } from "@/modules/service-desk/repository-context"
import {
  canonicalServiceDeskSearch,
  type ServiceDeskSearch,
  shouldCanonicalizeServiceDeskSearch,
  validateServiceDeskSearch,
} from "@/modules/service-desk/search"
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
    if (shouldCanonicalizeServiceDeskSearch(location.searchStr, search)) {
      throw redirect({
        replace: true,
        search: canonicalServiceDeskSearch(search),
        to: "/service-desk",
      })
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
        scenarioIds={serviceDeskScenarioIds}
        onCheckout={(sessionId) =>
          navigate({ to: "/service-desk/$sessionId/checkout", params: { sessionId }, search })
        }
        onOpenSession={(sessionId) =>
          navigate({ to: "/service-desk/$sessionId", params: { sessionId }, search })
        }
        onSearchChange={(next) =>
          navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
        }
      />
    </ServiceDeskRepositoryProvider>
  )
}
