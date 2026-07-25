import { ClientMemoryRepository } from "@/dev/clients/memory-repository"
import { RevenueOperationsMemoryRepository } from "@/dev/revenue-operations/memory-repository"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import type { ReportingScenarioId } from "@/modules/reporting/contracts"
import { REPORTING_SOURCE_DATE, ReportingMemoryRepository } from "./memory-repository"

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

const sourceClock = { now: () => new Date(`${REPORTING_SOURCE_DATE}T12:00:00-03:00`) }
const schedulingRepository = new SchedulingMemoryRepository(REPORTING_SOURCE_DATE)
const serviceDeskRepository = new ServiceDeskMemoryRepository(schedulingRepository, sourceClock)
const revenueRepository = new RevenueOperationsMemoryRepository(
  serviceDeskRepository,
  schedulingRepository,
  sourceClock,
)
const reportingRepository = new ReportingMemoryRepository(
  schedulingRepository,
  revenueRepository,
  new ClientMemoryRepository(),
)

export function createReportingRepository() {
  return reportingRepository
}
