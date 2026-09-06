import type { ReportingScenarioId } from "./contracts"
import { ReportingHttpRepository } from "./http-repository"

export const reportingScenarioIds = ["production"] as const satisfies readonly ReportingScenarioId[]
export function createReportingRepository() {
  return new ReportingHttpRepository()
}
