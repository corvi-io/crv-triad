import {
  createBarbershopSetupRepository,
  resolveBarbershopSetupScenario,
} from "virtual:studio-barbershop-setup-source"
import { createFileRoute, redirect, stripSearchParams } from "@tanstack/react-router"
import { type SetupSection, setupSections } from "@/modules/barbershop-setup/contracts"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"
import {
  type BarbershopSetupRouteSearch,
  createBarbershopSetupRouteSearchDefaults,
  validateBarbershopSetupRouteSearch,
} from "@/modules/barbershop-setup/search"
import { BarbershopSetupPage } from "@/modules/barbershop-setup/setup-page"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"

const repository = createBarbershopSetupRepository?.()
const searchDefaults = createBarbershopSetupRouteSearchDefaults(resolveBarbershopSetupScenario)

export const Route = createFileRoute("/_authenticated/barbershop-setup/$section/")({
  beforeLoad: ({ params, search }) => {
    if (!setupSections.includes(params.section as SetupSection)) {
      throw redirect({
        to: "/barbershop-setup/$section",
        params: { section: "overview" },
        search,
      })
    }
  },
  component: BarbershopSetupSectionRoute,
  search: {
    middlewares: [stripSearchParams(searchDefaults)],
  },
  validateSearch: (search: Record<string, unknown>): BarbershopSetupRouteSearch =>
    validateBarbershopSetupRouteSearch(search, resolveBarbershopSetupScenario),
})

function BarbershopSetupSectionRoute() {
  const routeSearch = Route.useSearch()
  const { section } = Route.useParams()
  const navigate = Route.useNavigate()
  const search = { ...routeSearch, section: section as SetupSection }

  if (!repository) {
    return (
      <ModuleLayout
        head={
          <PageHeader
            title="Configuração da barbearia"
            description="Gerencie unidades, profissionais, serviços e disponibilidade."
          />
        }
      >
        <div
          role="status"
          className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
        >
          A configuração da barbearia está indisponível neste ambiente.
        </div>
      </ModuleLayout>
    )
  }

  return (
    <BarbershopSetupRepositoryProvider repository={repository}>
      <BarbershopSetupPage
        search={search}
        onSearchChange={(next) => {
          const { section: nextSection, ...nextSearch } = next
          if (nextSection && nextSection !== section) {
            return navigate({
              to: "/barbershop-setup/$section",
              params: { section: nextSection },
              search: (previous) => ({ ...previous, ...nextSearch }),
            })
          }
          return navigate({
            replace: true,
            search: (previous) => ({ ...previous, ...nextSearch }),
          })
        }}
      />
    </BarbershopSetupRepositoryProvider>
  )
}
