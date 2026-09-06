import { describe, expect, it, vi } from "vitest"
import { createOnboardingRoutes } from "../../../src/modules/onboarding/http/routes.js"

describe("onboarding readiness routes", () => {
  it("derives the tenant from the session context and returns the bounded projection", async () => {
    const readiness = vi.fn(async () => ({
      canManage: true,
      completedCount: 0,
      nextStepId: "business_identity",
      outcome: "setup_required",
      steps: [],
      totalCount: 5,
    }))
    const context = {
      actorUserId: "user-1",
      membershipId: "member-1",
      organizationId: "organization-1",
      organizationName: "Aurora",
      role: "owner" as const,
    }
    const app = createOnboardingRoutes(readiness as never, async () => ({ allowed: true, context }))

    const response = await app.handle(new Request("http://api.test/api/onboarding/readiness"))

    expect(response.status).toBe(200)
    expect(readiness).toHaveBeenCalledWith(context)
    await expect(response.json()).resolves.toMatchObject({
      nextStepId: "business_identity",
      outcome: "setup_required",
    })
  })

  it("fails closed without an active tenant context", async () => {
    const app = createOnboardingRoutes(vi.fn() as never, async () => ({
      allowed: false,
      reason: "context_required",
    }))
    const response = await app.handle(new Request("http://api.test/api/onboarding/readiness"))
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ code: "context_required" })
  })
})
