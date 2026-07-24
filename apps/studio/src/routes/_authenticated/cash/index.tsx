import {
  cashScenarioIds,
  createRevenueOperationsRepository,
} from "virtual:studio-revenue-operations-source"
import { createFileRoute } from "@tanstack/react-router"
import { CashPage } from "@/modules/revenue-operations/cash-page"
import { RevenueOperationsRepositoryProvider } from "@/modules/revenue-operations/repository-context"
import type { SchedulingUnitId } from "@/modules/scheduling/contracts"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"

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
    date: isDate(search.date) ? search.date : today(),
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
        head={
          <PageHeader
            title="Caixa"
            description="Confira recebimentos e registre um fechamento imutável por unidade e data."
          />
        }
      >
        <CashPage
          closingId={search.closing}
          query={{ date: search.date, scenarioId: search.scenario, unitId: search.unitId }}
          onContextChange={(context) =>
            navigate({
              replace: true,
              search: (previous) => ({ ...previous, closing: null, ...context }),
              to: "/cash",
            })
          }
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

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime())
}

function today() {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}
