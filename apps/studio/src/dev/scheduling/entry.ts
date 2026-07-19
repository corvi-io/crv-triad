import { SchedulingMemoryRepository } from "./memory-repository"

export function createSchedulingRepository() {
  return new SchedulingMemoryRepository()
}
