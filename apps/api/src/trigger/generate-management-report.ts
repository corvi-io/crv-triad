import { queue, schemaTask } from "@trigger.dev/sdk"
import { z } from "zod"
export const managementReportQueue = queue({
  name: "management-report-export",
  concurrencyLimit: 4,
})
export const generateManagementReport = schemaTask({
  id: "generate-management-report-v1",
  schema: z.object({
    schemaVersion: z.literal(1),
    organizationId: z.string().uuid(),
    reportRequestId: z.string().uuid(),
  }),
  queue: managementReportQueue,
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10_000,
    randomize: true,
  },
  run: async (payload) => ({ accepted: true, reportRequestId: payload.reportRequestId }),
})
