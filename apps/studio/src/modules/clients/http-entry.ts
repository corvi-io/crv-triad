import type { ClientScenarioId } from "./contracts"
import { ClientHttpRepository } from "./http-repository"

export function createClientRepository() {
  return new ClientHttpRepository()
}

export function resolveClientManagementScenario(): ClientScenarioId {
  return "typical"
}
