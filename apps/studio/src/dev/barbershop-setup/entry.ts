import { connectSchedulingCatalog, createSchedulingRepository } from "@/dev/scheduling/entry"
import type { SetupScenarioId } from "@/modules/barbershop-setup/contracts"
import { schedulingToSetupProfessionalId, schedulingToSetupServiceId } from "./identity-map"
import { BarbershopSetupMemoryRepository } from "./memory-repository"
import { barbershopSetupScenarios } from "./scenarios"

const defaultScenarioId = "single-unit"
const scenarioIds = new Set(barbershopSetupScenarios.map(({ id }) => id))
const repository = new BarbershopSetupMemoryRepository(createSchedulingRepository())
connectSchedulingCatalog({
  async resolveAppointmentService(input) {
    const setupServiceId = schedulingToSetupServiceId[input.serviceId]
    const setupProfessionalId = schedulingToSetupProfessionalId[input.professionalId]
    if (!setupServiceId || !setupProfessionalId) return input
    const resolved = await repository.resolveProfessionalService(
      setupServiceId,
      setupProfessionalId,
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

export const prototypeCheckoutPolicy = {
  getActivePaymentMethodIds: () => repository.getActivePaymentMethodIds(),
  async getCommissionRateBasisPoints(professionalId: string) {
    const setupProfessionalId = schedulingToSetupProfessionalId[professionalId]
    if (!setupProfessionalId) return undefined
    return repository.getProfessionalCommissionBasisPoints(setupProfessionalId)
  },
}

export function resolveBarbershopSetupScenario(value: unknown): SetupScenarioId {
  return typeof value === "string" && scenarioIds.has(value) ? value : defaultScenarioId
}
