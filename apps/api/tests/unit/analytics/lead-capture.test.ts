import { afterEach, describe, expect, it, vi } from "vitest"

import { createPostHogLeadCapture } from "../../../src/modules/analytics/lead-capture.js"

const env = {
  APP_ENV: "production" as const,
  POSTHOG_PROJECT_KEY: "phc_public-project-key",
  POSTHOG_UPSTREAM_URL: "https://us.i.posthog.com" as const,
}

const acceptedLead = {
  ctaLocation: "hero" as const,
  distinctId: "01990a13-6d57-7000-8000-000000000001",
  product: "studio" as const,
  sourcePage: "/studio" as const,
}

describe("PostHog accepted lead capture", () => {
  afterEach(() => vi.restoreAllMocks())

  it("captures the server-confirmed lead without PII or person profiles", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    const capture = createPostHogLeadCapture(env, { fetch })

    await capture(acceptedLead)

    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/")
    const body = JSON.parse(String(init.body))
    expect(body).toEqual({
      api_key: "phc_public-project-key",
      event: "lead_submission_accepted",
      properties: {
        distinct_id: acceptedLead.distinctId,
        $process_person_profile: false,
        cta_location: "hero",
        environment: "production",
        integration: "api",
        product: "studio",
        source_page: "/studio",
      },
    })
    expect(JSON.stringify(body)).not.toMatch(/email|phone|whatsapp|barbershop|name/i)
  })

  it("is disabled without a configured project key", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    const capture = createPostHogLeadCapture({ ...env, POSTHOG_PROJECT_KEY: "" }, { fetch })

    await capture(acceptedLead)

    expect(fetch).not.toHaveBeenCalled()
  })

  it("keeps analytics provider failures out of the lead workflow", async () => {
    const fetch = vi.fn(async () => new Response("private provider error", { status: 500 }))
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const capture = createPostHogLeadCapture(env, { fetch })

    await expect(capture(acceptedLead)).resolves.toBeUndefined()

    expect(error).toHaveBeenCalledWith(JSON.stringify({ event: "lead_analytics_capture_failed" }))
    expect(error.mock.calls.flat().join(" ")).not.toContain("private provider error")
  })
})
