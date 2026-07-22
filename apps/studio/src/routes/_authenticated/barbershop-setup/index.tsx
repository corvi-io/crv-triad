import {
  createBarbershopSetupRepository,
  resolveBarbershopSetupScenario,
} from "virtual:studio-barbershop-setup-source"
import { createFileRoute } from "@tanstack/react-router"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"
import {
  type BarbershopSetupSearch,
  validateBarbershopSetupSearch,
} from "@/modules/barbershop-setup/search"
import { BarbershopSetupPage } from "@/modules/barbershop-setup/setup-page"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"

const repository = createBarbershopSetupRepository?.()

export const Route = createFileRoute("/_authenticated/barbershop-setup/")({
  component: BarbershopSetupRoute,
  validateSearch: (search: Record<string, unknown>): BarbershopSetupSearch =>
    validateBarbershopSetupSearch(search, resolveBarbershopSetupScenario),
})

function BarbershopSetupRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

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
        onSearchChange={(next) =>
          navigate({ replace: true, search: (previous) => ({ ...previous, ...next }) })
        }
      />
    </BarbershopSetupRepositoryProvider>
  )
}
