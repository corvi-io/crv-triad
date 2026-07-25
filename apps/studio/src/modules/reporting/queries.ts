import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReportingQuery } from "./contracts"
import { useReportingRepository } from "./repository-context"

export const reportingQueryKeys = {
  all: ["reporting"] as const,
  report: (query: ReportingQuery) => [...reportingQueryKeys.all, "report", query] as const,
}

export function useReportingResult(query: ReportingQuery) {
  const repository = useReportingRepository()
  return useQuery({
    queryFn: ({ signal }) => {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError")
      return repository.getReport(query)
    },
    queryKey: reportingQueryKeys.report(query),
    refetchOnWindowFocus: false,
    retry: false,
    retryOnMount: false,
  })
}

export function useReportingReset() {
  const repository = useReportingRepository()
  const queryClient = useQueryClient()
  return async () => {
    await repository.reset()
    await queryClient.invalidateQueries({ queryKey: reportingQueryKeys.all })
  }
}
