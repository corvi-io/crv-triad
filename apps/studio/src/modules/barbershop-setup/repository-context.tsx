import { createContext, type ReactNode, use } from "react"
import type { BarbershopSetupRepository } from "./contracts"

const BarbershopSetupRepositoryContext = createContext<BarbershopSetupRepository | null>(null)

export function BarbershopSetupRepositoryProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository: BarbershopSetupRepository
}) {
  return (
    <BarbershopSetupRepositoryContext value={repository}>
      {children}
    </BarbershopSetupRepositoryContext>
  )
}

export function useBarbershopSetupRepository() {
  const repository = use(BarbershopSetupRepositoryContext)
  if (!repository) throw new Error("BarbershopSetupRepositoryProvider is missing.")
  return repository
}
