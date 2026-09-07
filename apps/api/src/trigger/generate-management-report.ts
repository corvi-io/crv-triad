import { queue, schemaTask } from "@trigger.dev/sdk"
import { z } from "zod"
import { createDatabase } from "../modules/idp/database/client.js"
import { createReportWorker } from "../modules/reporting/application/report-worker.js"
import { createReportingService } from "../modules/reporting/application/reporting-service.js"
import { loadReportWorkerEnv } from "../modules/reporting/config/worker-env.js"
import { createR2ArtifactStorage } from "../modules/reporting/infra/r2-artifact-storage.js"
import { createReportEmailSender } from "../modules/reporting/infra/report-email-sender.js"
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
    const env = loadReportWorkerEnv()
    const { db, pool } = createDatabase(env)
    const storage = createR2ArtifactStorage({
      endpoint: env.R2_PRIVATE_ENDPOINT,
      accessKeyId: env.R2_PRIVATE_ACCESS_KEY_ID,
      secretAccessKey: env.R2_PRIVATE_SECRET_ACCESS_KEY,
      bucket: env.R2_PRIVATE_BUCKET,
    })
    try {
      return await createReportWorker(
        db,
        createReportingService(db),
        storage,
        createReportEmailSender(env),
        env.IDP_STUDIO_URL,
        (event) => console.info(JSON.stringify({ ...event, appEnvironment: env.APP_ENV })),
      ).run(payload)
    } finally {
      await pool.end()
    }
  },
})

export const deliverManagementReportEmail = schemaTask({
  id: "deliver-management-report-email-v1",
  schema: z.object({
    schemaVersion: z.literal(1),
    organizationId: z.string().uuid(),
    reportRequestId: z.string().uuid(),
  }),
  queue: managementReportQueue,
  maxDuration: 60,
  // Align retries with the worker's five-minute `sending` lease. A provider acknowledgement
  // followed by a database outage must be reclaimed instead of completing with pending state.
  retry: { maxAttempts: 3, factor: 1, minTimeoutInMs: 300_000, maxTimeoutInMs: 300_000 },
  run: async (payload) => {
    const env = loadReportWorkerEnv()
    const { db, pool } = createDatabase(env)
    const storage = createR2ArtifactStorage({
      endpoint: env.R2_PRIVATE_ENDPOINT,
      accessKeyId: env.R2_PRIVATE_ACCESS_KEY_ID,
      secretAccessKey: env.R2_PRIVATE_SECRET_ACCESS_KEY,
      bucket: env.R2_PRIVATE_BUCKET,
    })
    try {
      return await createReportWorker(
        db,
        createReportingService(db),
        storage,
        createReportEmailSender(env),
        env.IDP_STUDIO_URL,
      ).deliver(payload)
    } finally {
      await pool.end()
    }
  },
})
