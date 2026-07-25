declare module "virtual:studio-operational-notifications-source" {
  import type { OperationalNotificationsRepository } from "@/modules/operational-notifications/contracts"
  export const operationalNotificationScenarioIds: readonly string[]
  export const createOperationalNotificationsRepository:
    | (() => OperationalNotificationsRepository)
    | undefined
}
