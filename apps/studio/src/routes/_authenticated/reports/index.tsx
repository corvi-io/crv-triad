import { createReportingRepository, reportingScenarioIds } from "virtual:studio-reporting-source"
import { createFileRoute } from "@tanstack/react-router"
import type { ReportingQuery } from "@/modules/reporting/contracts"
import { filtersFromSearch, normalizeReportSearch } from "@/modules/reporting/filters"
import { useReportingResult } from "@/modules/reporting/queries"
import { ReportingPageContent } from "@/modules/reporting/reporting-page"
import { ReportingRepositoryProvider } from "@/modules/reporting/repository-context"
import { formatDateOnly } from "@/modules/shared/components/forms/date-picker"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"

const repository = createReportingRepository?.()
const sourceDate = repository?.today() ?? formatDateOnly(new Date())
export const Route = createFileRoute("/_authenticated/reports/")({
  component: ReportsRoute,
  validateSearch: (search: Record<string, unknown>) =>
    normalizeReportSearch(search, sourceDate, reportingScenarioIds),
})

function ReportsRoute() {
  const search = Route.useSearch()
  if (!repository) {
    return (
      <ModuleLayout
        head={
          <PageHeader description="Análise histórica de operação e receita" title="Relatórios" />
        }
      >
        <Alert>
          <AlertTitle>Relatórios indisponíveis</AlertTitle>
          <AlertDescription>
            Este módulo de avaliação está desativado neste ambiente.
          </AlertDescription>
        </Alert>
      </ModuleLayout>
    )
  }

  const query: ReportingQuery = {
    filters: filtersFromSearch(search),
    scenarioId: search.scenario,
  }
  return (
    <ReportingRepositoryProvider repository={repository}>
      <ReportsExperience query={query} />
    </ReportingRepositoryProvider>
  )
}

function ReportsExperience({ query }: { query: ReportingQuery }) {
  const report = useReportingResult(query)
  return (
    <ModuleLayout
      bodyMaskHeight={0}
      bodyViewportClassName="p-px"
      head={
        <PageHeader
          description="Escolha e configure os relatórios da sua barbearia."
          title="Relatórios"
        />
      }
    >
      <ReportingPageContent report={report} />
    </ModuleLayout>
  )
}
