import { idempotencyKeys, tasks } from "@trigger.dev/sdk"
import type { ExportPayload, ReportDispatcher } from "../application/export-providers.js"

export function createTriggerReportDispatcher(): ReportDispatcher {
  return {
    async dispatch(payload: ExportPayload, idempotencyKey: string) {
      const key = await idempotencyKeys.create(idempotencyKey, { scope: "global" })
      const handle = await tasks.trigger("generate-management-report-v1", payload, {
        idempotencyKey: key,
        queue: `management-report-${payload.organizationId}`,
      })
      return { runReference: handle.id }
    },
  }
}
