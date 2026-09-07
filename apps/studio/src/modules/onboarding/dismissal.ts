const dismissalPrefix = "triad:onboarding-dismissed"

export function onboardingDismissalKey(tenantId: string) {
  return `${dismissalPrefix}:${tenantId}`
}

export function isOnboardingDismissed(tenantId: string | undefined) {
  if (!tenantId || typeof window === "undefined") return false
  return window.sessionStorage.getItem(onboardingDismissalKey(tenantId)) === "true"
}

export function dismissOnboarding(tenantId: string | undefined) {
  if (!tenantId || typeof window === "undefined") return
  window.sessionStorage.setItem(onboardingDismissalKey(tenantId), "true")
}
