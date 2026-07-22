import type { SetupScenarioId } from "@/modules/barbershop-setup/contracts"
import { BarbershopSetupMemoryRepository } from "./memory-repository"
import { barbershopSetupScenarios } from "./scenarios"

const defaultScenarioId = "single-unit"
const scenarioIds = new Set(barbershopSetupScenarios.map(({ id }) => id))

export function createBarbershopSetupRepository() {
  return new BarbershopSetupMemoryRepository()
}

export function resolveBarbershopSetupScenario(value: unknown): SetupScenarioId {
  return typeof value === "string" && scenarioIds.has(value) ? value : defaultScenarioId
}
