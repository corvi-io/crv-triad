import { afterEach, describe, expect, it, vi } from "vitest"

describe("Studio analytics contract", () => {
  it("remains a safe no-op in tests", async () => {
    const analytics = await import("@/modules/shared/analytics/posthog")
    expect(() =>
      analytics.captureProductEvent("module_viewed", { route: "/clients" }),
    ).not.toThrow()
    expect(() => analytics.captureUnexpectedError(new Error("sensitive-value"))).not.toThrow()
    expect(analytics.analyticsTestState()).toEqual({
      activeTenantId: null,
      identifiedUserId: null,
      initialized: false,
    })
  })
})

describe("configured Studio analytics", () => {
  afterEach(() => {
    vi.doUnmock("@/modules/shared/config/env")
    vi.doUnmock("posthog-js")
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("initializes, identifies, groups, captures, and resets through the safe facade", async () => {
    vi.resetModules()
    const sdk = {
      capture: vi.fn(),
      captureException: vi.fn(),
      group: vi.fn(),
      identify: vi.fn(),
      init: vi.fn(),
      reset: vi.fn(),
      resetGroups: vi.fn(),
    }
    vi.doMock("@/modules/shared/config/env", () => ({
      env: {
        deployTarget: "production",
        isTest: false,
        posthogHost: "https://example.test/e",
        posthogKey: "phc_test",
        posthogReplaySampleRate: 0.1,
        release: "test-release",
      },
    }))
    vi.doMock("posthog-js", () => ({ default: sdk }))
    vi.spyOn(Math, "random").mockReturnValue(0.5)

    const analytics = await import("@/modules/shared/analytics/posthog")
    analytics.identifyAnalyticsUser("user-id")
    analytics.setAnalyticsTenant("tenant-id")
    await analytics.initializeAnalytics()
    await analytics.initializeAnalytics()

    expect(sdk.init).toHaveBeenCalledOnce()
    expect(sdk.init.mock.calls[0]?.[1]).toMatchObject({ disable_session_recording: true })
    expect(sdk.init.mock.calls[0]?.[1]).toMatchObject({
      capture_exceptions: false,
      session_recording: expect.objectContaining({ maskAllInputs: true, maskTextSelector: "*" }),
    })
    const beforeSend = sdk.init.mock.calls[0]?.[1].before_send
    expect(
      beforeSend?.({
        event: "test",
        properties: {
          $current_url: "https://studio.example.test/reset-password?token=private",
          email: "private@example.test",
        },
      }),
    ).toMatchObject({
      properties: {
        $current_url: "https://studio.example.test/reset-password",
        app: "studio",
      },
    })
    expect(sdk.identify).toHaveBeenCalledWith("user-id", { app: "studio" })
    expect(sdk.group).toHaveBeenCalledWith("tenant", "tenant-id")

    analytics.captureProductEvent("module_viewed", { email: "private@example.test", route: "/" })
    analytics.captureMutationSuccess({
      analyticsEvent: "client_created",
      email: "private@example.test",
    })
    analytics.captureMutationSuccess({ analyticsEvent: "unknown_event" })
    analytics.captureUnexpectedError(new TypeError("private detail"), {
      boundary: "render",
      email: "private@example.test",
    })
    analytics.captureUnexpectedError(new DOMException("cancelled", "AbortError"))
    analytics.captureUnexpectedError(
      Object.assign(new Error("expected"), { name: "FormSubmissionError" }),
    )
    analytics.identifyAnalyticsUser("user-id")
    analytics.setAnalyticsTenant("tenant-id")
    analytics.setAnalyticsTenant(null)
    analytics.resetAnalyticsIdentity()
    analytics.resetAnalyticsIdentity()

    expect(sdk.capture).toHaveBeenCalledWith(
      "module_viewed",
      expect.objectContaining({ app: "studio", release: "test-release" }),
    )
    expect(sdk.capture.mock.calls.flat()).not.toContain("private@example.test")
    expect(sdk.capture).toHaveBeenCalledWith(
      "client_created",
      expect.objectContaining({ app: "studio" }),
    )
    expect(sdk.captureException).toHaveBeenCalledOnce()
    expect(sdk.captureException.mock.calls[0]?.[0]).toMatchObject({
      message: "Unexpected application error",
      name: "TypeError",
    })
    expect(sdk.captureException.mock.calls[0]?.[0].stack).not.toContain("private detail")
    expect(sdk.captureException.mock.calls[0]?.[1]).not.toHaveProperty("email")
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("runtime private detail") }))
    expect(sdk.captureException).toHaveBeenCalledTimes(2)
    expect(sdk.captureException.mock.calls[1]?.[0].stack).not.toContain("runtime private detail")
    expect(sdk.reset).toHaveBeenCalledWith(true)
    expect(sdk.resetGroups).toHaveBeenCalledOnce()
  })
})
