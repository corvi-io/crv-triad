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
import { ServiceSessionPage } from "@/modules/service-desk/service-session-page"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"

const repository = createServiceDeskRepository?.()

export const Route = createFileRoute("/_authenticated/service-desk/$sessionId/")({
  component: ServiceSessionRoute,
  validateSearch: (search: Record<string, unknown>): ServiceDeskSearch =>
    validateServiceDeskSearch(search, serviceDeskScenarioIds),
  beforeLoad: ({ location, params, search }) => {
    if (shouldCanonicalizeServiceDeskSearch(location.searchStr, search)) {
      throw redirect({
        params: { sessionId: params.sessionId },
        replace: true,
        search: canonicalServiceDeskSearch(search),
        to: "/service-desk/$sessionId",
      })
    }
  },
})

function ServiceSessionRoute() {
  const { sessionId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  if (!repository) {
    return (
      <ModuleLayout
        head={
          <PageHeader
            title="Atendimento"
            description="Atendimentos indisponíveis neste ambiente."
          />
        }
      >
        <p>Este módulo de avaliação está desativado neste ambiente.</p>
      </ModuleLayout>
    )
  }
  return (
    <ServiceDeskRepositoryProvider repository={repository}>
      <ModuleLayout
        head={<PageHeader title="Atendimento" description="Atendimentos / Atendimento" />}
      >
        <ServiceSessionPage
          sessionId={sessionId}
          onCheckout={() =>
            navigate({
              params: { sessionId },
              search,
              to: "/service-desk/$sessionId/checkout",
            })
          }
          onBack={() =>
            navigate({
              to: "/service-desk",
              search,
            })
          }
        />
      </ModuleLayout>
    </ServiceDeskRepositoryProvider>
  )
}
