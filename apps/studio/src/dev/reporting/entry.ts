import { ClientMemoryRepository } from "@/dev/clients/memory-repository"
import { RevenueOperationsMemoryRepository } from "@/dev/revenue-operations/memory-repository"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import type { ReportingScenarioId } from "@/modules/reporting/contracts"
import { ReportingMemoryRepository } from "./memory-repository"

export const reportingScenarioIds = [
  "typical",
  "empty",
  "edge",
  "partial",
  "zero-paid-sales",
  "unknown-customers",
  "ties",
  "long-labels",
  "slow",
  "next-failure",
  "persistent-error",
] as const satisfies readonly ReportingScenarioId[]

const schedulingRepository = new SchedulingMemoryRepository()
const serviceDeskRepository = new ServiceDeskMemoryRepository(schedulingRepository)
const revenueRepository = new RevenueOperationsMemoryRepository(
  serviceDeskRepository,
  schedulingRepository,
)
const reportingRepository = new ReportingMemoryRepository(
  schedulingRepository,
  revenueRepository,
  new ClientMemoryRepository(),
)

export function createReportingRepository() {
  return reportingRepository
}
