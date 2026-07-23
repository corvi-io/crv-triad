declare module "virtual:studio-client-management-source" {
  import type { ClientRepository, ClientScenarioId } from "@/modules/clients/contracts"

  export const createClientRepository: null | (() => ClientRepository)
  export function resolveClientManagementScenario(value: unknown): ClientScenarioId
}
