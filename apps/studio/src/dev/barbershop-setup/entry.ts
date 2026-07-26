import { connectSchedulingCatalog, createSchedulingRepository } from "@/dev/scheduling/entry"
import type { SetupScenarioId } from "@/modules/barbershop-setup/contracts"
import { BarbershopSetupMemoryRepository } from "./memory-repository"
import { barbershopSetupScenarios } from "./scenarios"

const defaultScenarioId = "single-unit"
const scenarioIds = new Set(barbershopSetupScenarios.map(({ id }) => id))
const repository = new BarbershopSetupMemoryRepository(createSchedulingRepository())
const schedulingServiceIds = [
  "service-hair-beard",
  "service-fade",
  "service-cut-beard",
  "service-simple-cut",
]
const setupServiceIds = ["service-classic", "service-beard", "service-combo", "service-care"]
const schedulingProfessionalIds = [
  "professional-carlos",
  "professional-bruno",
  "professional-ana",
  "professional-joao",
]
const setupProfessionalIds = [
  "professional-alpha",
  "professional-bravo",
  "professional-charlie",
  "professional-delta",
]

connectSchedulingCatalog({
  async resolveAppointmentService(input) {
    const serviceIndex = schedulingServiceIds.indexOf(input.serviceId)
    const professionalIndex = schedulingProfessionalIds.indexOf(input.professionalId)
    if (serviceIndex < 0 || professionalIndex < 0) return input
    const resolved = await repository.resolveProfessionalService(
      setupServiceIds[serviceIndex],
      setupProfessionalIds[professionalIndex],
    )
    return {
      durationMinutes: resolved.durationMinutes,
      priceCents: resolved.priceCents,
    }
  },
})

export function createBarbershopSetupRepository() {
  return repository
}

export function resolveBarbershopSetupScenario(value: unknown): SetupScenarioId {
  return typeof value === "string" && scenarioIds.has(value) ? value : defaultScenarioId
}
