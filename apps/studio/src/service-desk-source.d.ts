declare module "virtual:studio-service-desk-source" {
  import type {
    ServiceDeskRepository,
    ServiceDeskScenarioId,
  } from "@/modules/service-desk/contracts"

  export const createServiceDeskRepository: (() => ServiceDeskRepository) | undefined
  export const serviceDeskScenarioIds: readonly ServiceDeskScenarioId[] | undefined
  type DevelopmentScenarioGroup = "queue" | "reliability" | "fulfillment" | "checkout"

  export const developmentScenarioGroups: readonly DevelopmentScenarioGroup[] | undefined
  export const developmentScenarioGroupLabels: Record<DevelopmentScenarioGroup, string> | undefined
  export const developmentScenarioPresentation:
    | Record<
        ServiceDeskScenarioId,
        { description: string; group: DevelopmentScenarioGroup; label: string }
      >
    | undefined
}
