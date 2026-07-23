import { createContext, type ReactNode, use } from "react"
import type { ServiceDeskRepository } from "./contracts"

const ServiceDeskRepositoryContext = createContext<ServiceDeskRepository | null>(null)

export function ServiceDeskRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository: ServiceDeskRepository
}) {
  return <ServiceDeskRepositoryContext value={repository}>{children}</ServiceDeskRepositoryContext>
}

export function useServiceDeskRepository() {
  const repository = use(ServiceDeskRepositoryContext)
  if (!repository) throw new Error("ServiceDeskRepositoryProvider is missing.")
  return repository
}
