import { createContext, type ReactNode, use } from "react"
import type { RevenueOperationsRepository } from "./contracts"

const RevenueOperationsRepositoryContext = createContext<RevenueOperationsRepository | null>(null)

export function RevenueOperationsRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository: RevenueOperationsRepository
}) {
  return (
    <RevenueOperationsRepositoryContext value={repository}>
      {children}
    </RevenueOperationsRepositoryContext>
  )
}

export function useRevenueOperationsRepository() {
  const repository = use(RevenueOperationsRepositoryContext)
  if (!repository) throw new Error("RevenueOperationsRepositoryProvider is missing.")
  return repository
}
