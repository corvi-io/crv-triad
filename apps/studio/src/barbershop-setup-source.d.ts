declare module "virtual:studio-barbershop-setup-source" {
  import type {
    BarbershopSetupRepository,
    SetupScenarioId,
  } from "@/modules/barbershop-setup/contracts"

  export const createBarbershopSetupRepository: (() => BarbershopSetupRepository) | null
  export function resolveBarbershopSetupScenario(value: unknown): SetupScenarioId
}
