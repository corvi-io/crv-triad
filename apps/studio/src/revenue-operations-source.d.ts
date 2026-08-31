declare module "virtual:studio-revenue-operations-source" {
  import type { RevenueOperationsRepository } from "@/modules/revenue-operations/contracts"

  export const createRevenueOperationsRepository: (() => RevenueOperationsRepository) | undefined
  export const cashScenarioIds: readonly string[]
}
