import { createServiceDeskRepository } from "@/dev/service-desk/entry"
import { RevenueOperationsMemoryRepository } from "./memory-repository"

const revenueOperationsRepository = new RevenueOperationsMemoryRepository(
  createServiceDeskRepository(),
)

export function createRevenueOperationsRepository() {
  return revenueOperationsRepository
}
