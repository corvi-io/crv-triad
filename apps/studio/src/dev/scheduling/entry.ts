import { SchedulingMemoryRepository } from "./memory-repository"

const schedulingRepository = new SchedulingMemoryRepository()

export function createSchedulingRepository() {
  return schedulingRepository
}
