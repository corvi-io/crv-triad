import { createContext, type ReactNode, use } from "react"
import type { SchedulingRepository } from "./contracts"

const SchedulingRepositoryContext = createContext<SchedulingRepository | null>(null)

export function SchedulingRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository: SchedulingRepository
}) {
  return <SchedulingRepositoryContext value={repository}>{children}</SchedulingRepositoryContext>
}

export function useSchedulingRepository() {
  const repository = use(SchedulingRepositoryContext)
  if (!repository) throw new Error("SchedulingRepositoryProvider is missing.")
  return repository
}
