import { PostHog } from "posthog-node"

import type { IdpEnv } from "../idp/config/env.js"

export type ErrorContext = {
  boundary: "auth" | "background" | "http" | "process" | "trigger"
  method?: string
  module?: string
  requestId?: string
  route?: string
  status?: number
  tenantId?: string
  userId?: string
}

export type ErrorReporter = {
  capture: (error: unknown, context: ErrorContext) => void
  shutdown: () => Promise<void>
}

const noopReporter: ErrorReporter = { capture: () => undefined, shutdown: async () => undefined }

export function createPostHogErrorReporter(
  env: Pick<IdpEnv, "APP_ENV" | "APP_RELEASE" | "POSTHOG_PROJECT_KEY" | "POSTHOG_UPSTREAM_URL">,
): ErrorReporter {
  if (!env.POSTHOG_PROJECT_KEY) return noopReporter
  const client = new PostHog(env.POSTHOG_PROJECT_KEY, {
    host: env.POSTHOG_UPSTREAM_URL,
    flushAt: 10,
    flushInterval: 1_000,
  })
  return {
    capture(error, context) {
      try {
        client.captureException(sanitizeErrorForReporting(error), context.userId, {
          app: "api",
          boundary: context.boundary,
          environment: env.APP_ENV,
          method: context.method,
          module: context.module,
          release: env.APP_RELEASE,
          request_id: context.requestId,
          route: context.route ? normalizeRoute(context.route) : undefined,
          status: context.status,
          tenant_id: context.tenantId,
        })
      } catch {
        console.error(JSON.stringify({ event: "posthog_error_report_failed" }))
      }
    },
    async shutdown() {
      try {
        await client.shutdown(2_000)
      } catch {
        console.error(JSON.stringify({ event: "posthog_error_report_failed" }))
      }
    },
  }
}

export function sanitizeErrorForReporting(error: unknown) {
  const safe = new Error("Unexpected server error")
  if (error instanceof Error) {
    safe.name = /^[A-Za-z][A-Za-z0-9]*Error$/.test(error.name) ? error.name : "Error"
    const frames = error.stack?.split("\n").slice(1) ?? []
    safe.stack = [`${safe.name}: ${safe.message}`, ...frames].join("\n")
  }
  return safe
}

export function normalizeRoute(route: string) {
  return new URL(route, "http://localhost").pathname
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    .replace(/\/[0-9]+(?=\/|$)/g, "/:id")
}

export function shouldReportHttpError(code: string | number, status: number | undefined) {
  if (typeof status === "number") return status >= 500
  return code === "INTERNAL_SERVER_ERROR" || code === "UNKNOWN"
}
