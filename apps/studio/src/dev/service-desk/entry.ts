import { createSchedulingRepository } from "@/dev/scheduling/entry"
import { ServiceDeskMemoryRepository } from "./memory-repository"

export {
  developmentScenarioGroupLabels,
  developmentScenarioGroups,
  developmentScenarioPresentation,
} from "./presentation"
export { serviceDeskScenarioIds } from "./scenarios"

const serviceDeskRepository = new ServiceDeskMemoryRepository(createSchedulingRepository())

export function createServiceDeskRepository() {
  return serviceDeskRepository
}
