declare module "virtual:studio-service-desk-source" {
  import type {
    ServiceDeskRepository,
    ServiceDeskScenarioId,
  } from "@/modules/service-desk/contracts"

  export const createServiceDeskRepository: (() => ServiceDeskRepository) | undefined
  export const serviceDeskScenarioIds: readonly ServiceDeskScenarioId[] | undefined
}
