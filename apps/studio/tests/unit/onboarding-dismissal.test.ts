import { afterEach, describe, expect, it } from "vitest"
import {
  dismissOnboarding,
  isOnboardingDismissed,
  onboardingDismissalKey,
} from "@/modules/onboarding/dismissal"

describe("onboarding dismissal", () => {
  afterEach(() => window.sessionStorage.clear())

  it("keeps dismissal scoped to the current tenant and browser session", () => {
    expect(onboardingDismissalKey("tenant-a")).toBe("triad:onboarding-dismissed:tenant-a")
    expect(isOnboardingDismissed("tenant-a")).toBe(false)

    dismissOnboarding("tenant-a")

    expect(isOnboardingDismissed("tenant-a")).toBe(true)
    expect(isOnboardingDismissed("tenant-b")).toBe(false)
  })

  it("ignores an absent tenant instead of creating a global dismissal", () => {
    dismissOnboarding(undefined)
    expect(isOnboardingDismissed(undefined)).toBe(false)
    expect(window.sessionStorage.length).toBe(0)
  })
})
