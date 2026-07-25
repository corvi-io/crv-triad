import { createContext, type ReactNode, use } from "react"
import type { OperationalNotificationsRepository } from "./contracts"

const Context = createContext<OperationalNotificationsRepository | null>(null)

export function OperationalNotificationsRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository: OperationalNotificationsRepository
}) {
  return <Context value={repository}>{children}</Context>
}

export function useOperationalNotificationsRepository() {
  const repository = use(Context)
  if (!repository) throw new Error("OperationalNotificationsRepositoryProvider is missing.")
  return repository
}
