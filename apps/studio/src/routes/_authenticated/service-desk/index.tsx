import {
  createServiceDeskRepository,
  developmentScenarioGroupLabels,
  developmentScenarioGroups,
  developmentScenarioPresentation,
  serviceDeskScenarioIds,
} from "virtual:studio-service-desk-source"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { toast } from "sonner"
import { openCheckoutBeforeNavigation } from "@/modules/revenue-operations/open-checkout-navigation"
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
const revenueRepository = createRevenueOperationsRepository?.()

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
        scenarioGroupLabels={developmentScenarioGroupLabels}
        scenarioGroups={developmentScenarioGroups}
        scenarioIds={serviceDeskScenarioIds}
        scenarioPresentation={developmentScenarioPresentation}
        onCheckout={async (sessionId) => {
          try {
            await openCheckoutBeforeNavigation(revenueRepository, sessionId, () =>
              navigate({
                to: "/service-desk/$sessionId/checkout",
                params: { sessionId },
                search,
              }),
            )
          } catch {
            toast.error("Não foi possível abrir a comanda.")
          }
        }}
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

import { createRevenueOperationsRepository } from "virtual:studio-revenue-operations-source"
