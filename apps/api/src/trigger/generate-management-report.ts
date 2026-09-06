import { queue, schemaTask } from "@trigger.dev/sdk"
import { z } from "zod"
import { loadEnv } from "../modules/idp/config/env.js"
import { createDatabase } from "../modules/idp/database/client.js"
import { createReportWorker } from "../modules/reporting/application/report-worker.js"
import { createReportingService } from "../modules/reporting/application/reporting-service.js"
import { createR2ArtifactStorage } from "../modules/reporting/infra/r2-artifact-storage.js"
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
  run: async (payload) => {
    const env = loadEnv()
    const { db, pool } = createDatabase(env)
    const storage = createR2ArtifactStorage({
      endpoint: env.R2_REPORT_ENDPOINT,
      accessKeyId: env.R2_REPORT_ACCESS_KEY_ID,
      secretAccessKey: env.R2_REPORT_SECRET_ACCESS_KEY,
      bucket: env.R2_REPORT_BUCKET,
    })
    try {
      return await createReportWorker(db, createReportingService(db), storage, (event) =>
        console.info(JSON.stringify({ ...event, appEnvironment: env.APP_ENV })),
      ).run(payload)
    } finally {
      await pool.end()
    }
  },
})
