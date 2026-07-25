import { OperationalNotificationsMemoryRepository } from "./memory-repository"

export { operationalNotificationScenarioIds } from "./scenarios"

const repository = new OperationalNotificationsMemoryRepository()

export function createOperationalNotificationsRepository() {
  return repository
}
