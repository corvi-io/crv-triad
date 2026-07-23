import type { ClientScenarioId } from "@/modules/clients/contracts"
import { resolveClientScenario } from "@/modules/clients/search"
import { ClientMemoryRepository } from "./memory-repository"

export function createClientRepository() {
  return new ClientMemoryRepository()
}

export function resolveClientManagementScenario(value: unknown): ClientScenarioId {
  return resolveClientScenario(value)
}
