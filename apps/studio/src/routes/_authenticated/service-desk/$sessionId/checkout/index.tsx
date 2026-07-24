import { createRevenueOperationsRepository } from "virtual:studio-revenue-operations-source"
import {
  createServiceDeskRepository,
  serviceDeskScenarioIds,
} from "virtual:studio-service-desk-source"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { CheckoutPage } from "@/modules/revenue-operations/checkout-page"
import { RevenueOperationsRepositoryProvider } from "@/modules/revenue-operations/repository-context"
import { ServiceDeskRepositoryProvider } from "@/modules/service-desk/repository-context"
import {
  canonicalServiceDeskSearch,
  type ServiceDeskSearch,
  shouldCanonicalizeServiceDeskSearch,
  validateServiceDeskSearch,
} from "@/modules/service-desk/search"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"

const repository = createRevenueOperationsRepository?.()
const serviceDeskRepository = createServiceDeskRepository?.()

export const Route = createFileRoute("/_authenticated/service-desk/$sessionId/checkout/")({
  component: CheckoutRoute,
  validateSearch: (search: Record<string, unknown>): ServiceDeskSearch =>
    validateServiceDeskSearch(search, serviceDeskScenarioIds),
  beforeLoad: ({ location, params, search }) => {
    if (shouldCanonicalizeServiceDeskSearch(location.searchStr, search)) {
      throw redirect({
        params: { sessionId: params.sessionId },
        replace: true,
        search: canonicalServiceDeskSearch(search),
        to: "/service-desk/$sessionId/checkout",
      })
    }
  },
})

function CheckoutRoute() {
  const { sessionId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  if (!repository || !serviceDeskRepository) {
    return (
      <ModuleLayout
        head={<PageHeader title="Pagamento" description="Atendimentos / Atendimento / Pagamento" />}
      >
        <Alert>
          <AlertTitle>Pagamento indisponível</AlertTitle>
          <AlertDescription>
            Este módulo de avaliação está desativado neste ambiente.
          </AlertDescription>
        </Alert>
      </ModuleLayout>
    )
  }
  return (
    <ServiceDeskRepositoryProvider repository={serviceDeskRepository}>
      <RevenueOperationsRepositoryProvider repository={repository}>
        <ModuleLayout
          head={
            <PageHeader title="Pagamento" description="Atendimentos / Atendimento / Pagamento" />
          }
        >
          <CheckoutPage
            sessionId={sessionId}
            onBack={() =>
              navigate({
                params: { sessionId },
                search,
                to: "/service-desk/$sessionId",
              })
            }
          />
        </ModuleLayout>
      </RevenueOperationsRepositoryProvider>
    </ServiceDeskRepositoryProvider>
  )
}
