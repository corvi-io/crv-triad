import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PersistentOnboardingBoundary } from "@/modules/onboarding/persistent-onboarding-boundary"
import type { ActivationReadiness } from "@/modules/onboarding/readiness"

let readiness: ActivationReadiness

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <p>Navigate:{to}</p>,
}))
vi.mock("@/modules/onboarding/readiness", () => ({
  useActivationReadiness: () => ({ data: readiness }),
}))
vi.mock("@/modules/workspace/context-provider", () => ({
  useWorkspaceContext: () => ({ activeTenant: { id: "tenant-a" } }),
}))

describe("persistent onboarding boundary", () => {
  afterEach(() => window.sessionStorage.clear())

  it("routes a manager with pending setup to the guided experience", () => {
    setReadiness("setup_required", true)
    render(
      <PersistentOnboardingBoundary pathname="/agenda">
        <p>Agenda</p>
      </PersistentOnboardingBoundary>,
    )
    expect(screen.getByText("Navigate:/barbershop-setup")).toBeVisible()
    expect(screen.queryByText("Agenda")).not.toBeInTheDocument()
  })

  it.each([
    ["schedule_ready", true, "/agenda"],
    ["setup_required", false, "/agenda"],
    ["setup_required", true, "/barbershop-setup/business"],
  ] as const)("preserves content for outcome %s, manager %s and path %s", (outcome, canManage, pathname) => {
    setReadiness(outcome, canManage)
    render(
      <PersistentOnboardingBoundary pathname={pathname}>
        <p>Conteúdo permitido</p>
      </PersistentOnboardingBoundary>,
    )
    expect(screen.getByText("Conteúdo permitido")).toBeVisible()
  })

  it("honors a session-scoped dismissal", () => {
    setReadiness("setup_required", true)
    window.sessionStorage.setItem("triad:onboarding-dismissed:tenant-a", "true")
    render(
      <PersistentOnboardingBoundary pathname="/agenda">
        <p>Agenda liberada nesta sessão</p>
      </PersistentOnboardingBoundary>,
    )
    expect(screen.getByText("Agenda liberada nesta sessão")).toBeVisible()
  })
})

function setReadiness(outcome: ActivationReadiness["outcome"], canManage: boolean) {
  readiness = {
    canManage,
    completedCount: outcome === "schedule_ready" ? 5 : 0,
    nextStepId: outcome === "schedule_ready" ? null : "business",
    outcome,
    steps: [],
    totalCount: 5,
  }
}
