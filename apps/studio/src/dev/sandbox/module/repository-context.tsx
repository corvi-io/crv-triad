import { createContext, type ReactNode, use } from "react"
import type { SandboxRepository } from "./contracts"

const SandboxRepositoryContext = createContext<SandboxRepository | null>(null)

export function SandboxRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository: SandboxRepository
}) {
  return <SandboxRepositoryContext value={repository}>{children}</SandboxRepositoryContext>
}

export function useSandboxRepository() {
  const repository = use(SandboxRepositoryContext)
  if (!repository) {
    throw new Error("SandboxRepositoryProvider is missing.")
  }
  return repository
}
