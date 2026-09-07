import type { SetupScenarioId } from "./contracts"
import { BarbershopSetupHttpRepository } from "./http-repository"

export function createBarbershopSetupRepository() {
  return new BarbershopSetupHttpRepository()
}
export function resolveBarbershopSetupScenario(): SetupScenarioId {
  return "production"
}
