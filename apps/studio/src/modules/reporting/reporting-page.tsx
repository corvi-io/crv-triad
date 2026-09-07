import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { Button } from "@/modules/shared/components/ui/button"
import type { ReportingQuery } from "./contracts"
import { currentMonth } from "./filters"
import { GeneratedReports } from "./generated-reports"
import { useReportingResult } from "./queries"
import { useReportingRepository } from "./repository-context"

export function ReportingPage({ query }: { query: ReportingQuery }) {
  const report = useReportingResult(query)
  return <ReportingPageContent filters={query.filters} report={report} />
}

export function ReportingPageContent({
  filters,
  report,
}: {
  filters?: ReportingQuery["filters"]
  report: ReturnType<typeof useReportingResult>
}) {
  const repository = useReportingRepository()
  if (report.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon aria-hidden="true" />
        <AlertTitle>Não foi possível carregar os relatórios</AlertTitle>
        <AlertDescription>
          <p>{report.error.message}</p>
          <Button
            className="mt-3"
            type="button"
            variant="outline"
            onClick={() => {
              repository.retry()
              report.refetch()
            }}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  const fallback = currentMonth(new Date().toISOString().slice(0, 10))
  return (
    <GeneratedReports
      facets={
        report.data?.facets ?? { paymentMethods: [], professionals: [], services: [], units: [] }
      }
      filters={filters ?? report.data?.appliedFilters ?? fallback}
    />
  )
}
