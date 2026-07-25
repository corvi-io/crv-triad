import { createContext, type ReactNode, use } from "react"
import type { ReportingRepository } from "./contracts"

const ReportingRepositoryContext = createContext<ReportingRepository | null>(null)

export function ReportingRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository: ReportingRepository
}) {
  return <ReportingRepositoryContext value={repository}>{children}</ReportingRepositoryContext>
}

export function useReportingRepository() {
  const repository = use(ReportingRepositoryContext)
  if (!repository) throw new Error("ReportingRepositoryProvider is missing.")
  return repository
}
