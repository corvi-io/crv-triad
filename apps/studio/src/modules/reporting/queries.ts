import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReportingQuery } from "./contracts"
import { useReportingRepository } from "./repository-context"

export const reportingQueryKeys = {
  all: ["reporting"] as const,
  report: (query: ReportingQuery) => [...reportingQueryKeys.all, "report", query] as const,
  exports: () => [...reportingQueryKeys.all, "exports"] as const,
  catalog: () => [...reportingQueryKeys.all, "catalog"] as const,
}

export function useReportCatalog() {
  const repository = useReportingRepository()
  return useQuery({
    enabled: Boolean(repository.getExportCatalog),
    queryKey: reportingQueryKeys.catalog(),
    queryFn: () => repository.getExportCatalog?.(),
    retry: false,
    staleTime: 5 * 60_000,
  })
}

export function useGeneratedReports() {
  const repository = useReportingRepository()
  return useQuery({
    enabled: Boolean(repository.listExports),
    queryKey: reportingQueryKeys.exports(),
    queryFn: () => repository.listExports?.() ?? [],
    refetchInterval: (query) =>
      document.visibilityState === "visible" &&
      navigator.onLine &&
      query.state.data?.some(
        ({ status, emailDeliveryStatus }) =>
          status === "queued" ||
          status === "running" ||
          emailDeliveryStatus === "pending" ||
          emailDeliveryStatus === "sending",
      )
        ? 3_000
        : false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}

export function useReportExportActions() {
  const repository = useReportingRepository()
  const client = useQueryClient()
  const invalidate = () => client.invalidateQueries({ queryKey: reportingQueryKeys.exports() })
  const create = useMutation({
    mutationFn: (input: Parameters<NonNullable<typeof repository.createExport>>[0]) =>
      repository.createExport?.(input) ??
      Promise.reject(new Error("A exportação está indisponível.")),
    onSuccess: invalidate,
  })
  const retry = useMutation({
    mutationFn: (id: string) =>
      repository.retryExport?.(id) ?? Promise.reject(new Error("A repetição está indisponível.")),
    onSuccess: invalidate,
  })
  const retryDelivery = useMutation({
    mutationFn: (id: string) =>
      repository.retryExportDelivery?.(id) ??
      Promise.reject(new Error("O reenvio do e-mail está indisponível.")),
    onSuccess: invalidate,
  })
  return {
    create,
    retry,
    retryDelivery,
    download: (id: string) =>
      repository.downloadExport?.(id) ?? Promise.reject(new Error("O download está indisponível.")),
  }
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
