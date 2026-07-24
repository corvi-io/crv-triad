import { createReportingRepository, reportingScenarioIds } from "virtual:studio-reporting-source"
import { createFileRoute } from "@tanstack/react-router"
import type { ReportingFacets, ReportingQuery } from "@/modules/reporting/contracts"
import {
  filtersFromSearch,
  normalizeReportSearch,
  type ReportSearch,
} from "@/modules/reporting/filters"
import { useReportingResult } from "@/modules/reporting/queries"
import { ReportFiltersBar } from "@/modules/reporting/report-filters"
import { ReportingPageContent } from "@/modules/reporting/reporting-page"
import { ReportingRepositoryProvider } from "@/modules/reporting/repository-context"
import { formatDateOnly } from "@/modules/shared/components/forms/date-picker"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"

const repository = createReportingRepository?.()
const sourceDate = repository?.today() ?? formatDateOnly(new Date())
const emptyFacets: ReportingFacets = {
  paymentMethods: [],
  professionals: [],
  services: [],
}

export const Route = createFileRoute("/_authenticated/reports/")({
  component: ReportsRoute,
  validateSearch: (search: Record<string, unknown>) =>
    normalizeReportSearch(search, sourceDate, reportingScenarioIds),
})

function ReportsRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
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
      <ReportsExperience
        query={query}
        search={search}
        onSearchChange={(next) =>
          navigate({
            replace: true,
            search: (previous) => ({ ...previous, ...next }),
            to: "/reports",
          })
        }
      />
    </ReportingRepositoryProvider>
  )
}

function ReportsExperience({
  onSearchChange,
  query,
  search,
}: {
  onSearchChange: (next: Partial<ReportSearch>) => void
  query: ReportingQuery
  search: ReportSearch
}) {
  const report = useReportingResult(query)
  return (
    <ModuleLayout
      bodyMaskHeight={0}
      bodyViewportClassName="p-px"
      head={
        <>
          <PageHeader
            description="Analise resultados históricos com um recorte único e rastreável."
            title="Relatórios"
          />
          <ReportFiltersBar
            facets={report.data?.facets ?? emptyFacets}
            search={search}
            sourceDate={sourceDate}
            onChange={onSearchChange}
          />
        </>
      }
    >
      <ReportingPageContent report={report} />
    </ModuleLayout>
  )
}
