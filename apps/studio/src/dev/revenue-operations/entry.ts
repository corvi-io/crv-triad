import { createSchedulingRepository } from "@/dev/scheduling/entry"
import { createServiceDeskRepository } from "@/dev/service-desk/entry"
import { RevenueOperationsMemoryRepository } from "./memory-repository"

const revenueOperationsRepository = new RevenueOperationsMemoryRepository(
  createServiceDeskRepository(),
  createSchedulingRepository(),
)

export const cashScenarioIds = [
  "cash-typical",
  "cash-exact",
  "cash-positive-difference",
  "cash-negative-difference",
  "cash-empty",
  "cash-methods",
  "cash-adjustments",
  "cash-professionals",
  "cash-slow",
  "cash-next-failure",
  "cash-persistent-error",
  "cash-already-closed",
  "cash-dense-history",
  "cash-long-reason",
] as const

export function createRevenueOperationsRepository() {
  return revenueOperationsRepository
}
