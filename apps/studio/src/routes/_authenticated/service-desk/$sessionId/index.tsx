import {
  createServiceDeskRepository,
  serviceDeskScenarioIds,
} from "virtual:studio-service-desk-source"
import { createFileRoute } from "@tanstack/react-router"
import { ServiceDeskRepositoryProvider } from "@/modules/service-desk/repository-context"
import { type ServiceDeskSearch, validateServiceDeskSearch } from "@/modules/service-desk/search"
import { ServiceSessionPage } from "@/modules/service-desk/service-session-page"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"

const repository = createServiceDeskRepository?.()

export const Route = createFileRoute("/_authenticated/service-desk/$sessionId/")({
  component: ServiceSessionRoute,
  validateSearch: (search: Record<string, unknown>): ServiceDeskSearch =>
    validateServiceDeskSearch(search, serviceDeskScenarioIds),
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
        bodyViewportClassName="p-4 sm:p-6"
      >
        <p>Este módulo de avaliação está desativado neste ambiente.</p>
      </ModuleLayout>
    )
  }
  return (
    <ServiceDeskRepositoryProvider repository={repository}>
      <ModuleLayout
        head={<PageHeader title="Atendimento" description="Atendimentos / Atendimento" />}
        bodyViewportClassName="p-4 sm:p-6"
      >
        <ServiceSessionPage
          sessionId={sessionId}
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
