import type { AppointmentCatalogPort } from "@/modules/scheduling/contracts"
import { SchedulingMemoryRepository } from "./memory-repository"

let catalog: AppointmentCatalogPort | undefined
const schedulingRepository = new SchedulingMemoryRepository(undefined, {
  resolveAppointmentService(input) {
    return catalog?.resolveAppointmentService(input) ?? Promise.resolve(input)
  },
})

export function createSchedulingRepository() {
  return schedulingRepository
}

export function connectSchedulingCatalog(next: AppointmentCatalogPort) {
  catalog = next
}
