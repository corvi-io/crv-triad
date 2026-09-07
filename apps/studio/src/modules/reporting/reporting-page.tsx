import type { ReportingQuery } from "./contracts"
import { currentMonth } from "./filters"
import { GeneratedReports } from "./generated-reports"
import { useReportingResult } from "./queries"

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
