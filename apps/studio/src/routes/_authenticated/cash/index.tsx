import {
  cashScenarioIds,
  createRevenueOperationsRepository,
} from "virtual:studio-revenue-operations-source"
import { createFileRoute } from "@tanstack/react-router"
import { CashFilters, CashPage } from "@/modules/revenue-operations/cash-page"
import { RevenueOperationsRepositoryProvider } from "@/modules/revenue-operations/repository-context"
import type { SchedulingUnitId } from "@/modules/scheduling/contracts"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { isValidDateOnly } from "@/modules/shared/lib/form-schema"

const repository = createRevenueOperationsRepository?.()

type CashSearch = {
  closing: string | null
  date: string
  scenario: string
  unitId: SchedulingUnitId
}

export const Route = createFileRoute("/_authenticated/cash/")({
  component: CashRoute,
  validateSearch: (search: Record<string, unknown>): CashSearch => ({
    closing:
      typeof search.closing === "string" && /^closing-[\w-]+$/.test(search.closing)
        ? search.closing
        : null,
    date: typeof search.date === "string" && isValidDateOnly(search.date) ? search.date : today(),
    scenario:
      typeof search.scenario === "string" && cashScenarioIds.includes(search.scenario)
        ? search.scenario
        : "cash-typical",
    unitId: search.unitId === "artesao" ? "artesao" : "centro",
  }),
})

function CashRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  if (!repository) {
    return (
      <ModuleLayout
        head={<PageHeader title="Caixa" description="Conferência e fechamento operacional" />}
      >
        <Alert>
          <AlertTitle>Caixa indisponível</AlertTitle>
          <AlertDescription>
            Este módulo de avaliação está desativado neste ambiente.
          </AlertDescription>
        </Alert>
      </ModuleLayout>
    )
  }
  return (
    <RevenueOperationsRepositoryProvider repository={repository}>
      <ModuleLayout
        bodyMaskHeight={0}
        bodyViewportClassName="p-px"
        head={
          <>
            <PageHeader
              title="Caixa"
              description="Confira recebimentos e registre um fechamento imutável por unidade e data."
            />
            <CashFilters
              date={search.date}
              unitId={search.unitId}
              onContextChange={(context) =>
                navigate({
                  replace: true,
                  search: (previous) => ({ ...previous, closing: null, ...context }),
                  to: "/cash",
                })
              }
            />
          </>
        }
      >
        <CashPage
          closingId={search.closing}
          query={{ date: search.date, scenarioId: search.scenario, unitId: search.unitId }}
          onOpenClosing={(closing) =>
            navigate({
              replace: true,
              search: (previous) => ({ ...previous, closing }),
              to: "/cash",
            })
          }
        />
      </ModuleLayout>
    </RevenueOperationsRepositoryProvider>
  )
}

function today() {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}
