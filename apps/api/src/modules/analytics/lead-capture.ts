import type { IdpEnv } from "../idp/config/env.js"

const captureTimeoutMs = 1_000

export type AcceptedLeadAnalytics = {
  ctaLocation: "final_cta" | "header" | "hero" | "product_section" | "unknown"
  distinctId: string
  product: "ecosystem" | "pro_barber" | "studio"
  sourcePage: "/" | "/pro-barber" | "/studio"
}

export type CaptureAcceptedLead = (analytics: AcceptedLeadAnalytics) => Promise<void>

type LeadCaptureDependencies = {
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  timeoutMs?: number
}

export function createPostHogLeadCapture(
  env: Pick<IdpEnv, "APP_ENV" | "POSTHOG_PROJECT_KEY" | "POSTHOG_UPSTREAM_URL">,
  dependencies: LeadCaptureDependencies = {},
): CaptureAcceptedLead {
  if (!env.POSTHOG_PROJECT_KEY) return async () => undefined

  const fetchUpstream = dependencies.fetch ?? globalThis.fetch
  const timeoutMs = dependencies.timeoutMs ?? captureTimeoutMs

  return async (analytics) => {
    try {
      const response = await fetchUpstream(`${env.POSTHOG_UPSTREAM_URL}/i/v0/e/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: env.POSTHOG_PROJECT_KEY,
          event: "lead_submission_accepted",
          properties: {
            distinct_id: analytics.distinctId,
            $process_person_profile: false,
            cta_location: analytics.ctaLocation,
            environment: env.APP_ENV,
            integration: "api",
            product: analytics.product,
            source_page: analytics.sourcePage,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) throw new Error("analytics_upstream_rejected")
    } catch {
      console.error(JSON.stringify({ event: "lead_analytics_capture_failed" }))
    }
  }
}
