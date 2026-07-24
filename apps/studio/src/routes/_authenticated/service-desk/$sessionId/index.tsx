import { createServiceDeskRepository } from "virtual:studio-service-desk-source"
import { createFileRoute } from "@tanstack/react-router"
import { ServiceDeskRepositoryProvider } from "@/modules/service-desk/repository-context"
import { ServiceSessionPage } from "@/modules/service-desk/service-session-page"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"

const repository = createServiceDeskRepository?.()

export const Route = createFileRoute("/_authenticated/service-desk/$sessionId/")({
  component: ServiceSessionRoute,
})

function ServiceSessionRoute() {
  const { sessionId } = Route.useParams()
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
              search: {
                preference: "all",
                priority: "all",
                professional: "all",
                scenario: "typical",
                stage: "all",
                unit: "centro",
              },
            })
          }
        />
      </ModuleLayout>
    </ServiceDeskRepositoryProvider>
  )
}
