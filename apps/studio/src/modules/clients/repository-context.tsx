import { createContext, type ReactNode, use } from "react"
import type { ClientRepository } from "./contracts"

const ClientRepositoryContext = createContext<ClientRepository | null>(null)

export function ClientRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository: ClientRepository
}) {
  return <ClientRepositoryContext value={repository}>{children}</ClientRepositoryContext>
}

export function useClientRepository() {
  const repository = use(ClientRepositoryContext)
  if (!repository) throw new Error("ClientRepositoryProvider is missing.")
  return repository
}
