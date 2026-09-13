import { describe, expect, it } from "vitest"

import {
  createPostHogErrorReporter,
  normalizeRoute,
  sanitizeErrorForReporting,
  shouldReportHttpError,
} from "../../../src/modules/analytics/error-reporter.js"

describe("PostHog error reporter", () => {
  it("normalizes identifiers and removes query values from routes", () => {
    expect(
      normalizeRoute(
        "https://api.example.test/api/appointments/01990a13-6d57-7000-8000-000000000001?token=secret",
      ),
    ).toBe("/api/appointments/:id")
    expect(normalizeRoute("/api/reports/42")).toBe("/api/reports/:id")
  })

  it("reports only unexpected server failures", () => {
    expect(shouldReportHttpError("VALIDATION", 400)).toBe(false)
    expect(shouldReportHttpError("NOT_FOUND", 404)).toBe(false)
    expect(shouldReportHttpError("UNKNOWN", undefined)).toBe(true)
    expect(shouldReportHttpError("INTERNAL_SERVER_ERROR", undefined)).toBe(true)
    expect(shouldReportHttpError("custom", 500)).toBe(true)
  })

  it("preserves stack frames without retaining a sensitive original message", () => {
    const error = new TypeError("private customer payload")
    const sanitized = sanitizeErrorForReporting(error)
    expect(sanitized.message).toBe("Unexpected server error")
    expect(sanitized.name).toBe("TypeError")
    expect(sanitized.stack).not.toContain("private customer payload")
    expect(sanitized.stack).toContain("error-reporter.test.ts")
  })

  it("is a safe no-op without provider configuration", async () => {
    const reporter = createPostHogErrorReporter({
      APP_ENV: "test",
      APP_RELEASE: "test-release",
      POSTHOG_PROJECT_KEY: "",
      POSTHOG_UPSTREAM_URL: "https://us.i.posthog.com",
    })
    expect(() => reporter.capture(new Error("secret-value"), { boundary: "http" })).not.toThrow()
    await expect(reporter.shutdown()).resolves.toBeUndefined()
  })
})
