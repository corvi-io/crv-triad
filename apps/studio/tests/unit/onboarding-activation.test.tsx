import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { PersistentOnboardingDialog } from "@/modules/onboarding/persistent-onboarding-dialog"

const readiness = {
  canManage: true,
  completedCount: 2,
  nextStepId: "professional",
  outcome: "setup_required" as const,
  totalCount: 5,
  steps: [
    {
      complete: true,
      description: "Confirme os dados da barbearia.",
      id: "business",
      section: "business",
      title: "Dados",
    },
    {
      complete: false,
      description: "Vincule um profissional ativo.",
      id: "professional",
      section: "professionals",
      title: "Profissional",
    },
  ],
}

describe("persistent onboarding", () => {
  it("presents server-derived progress and the real setup content", () => {
    render(
      <PersistentOnboardingDialog
        currentSection="business"
        readiness={readiness}
        onSectionChange={vi.fn()}
        onDismiss={vi.fn()}
      >
        <p>Formulário real da etapa</p>
      </PersistentOnboardingDialog>,
    )

    expect(screen.getByRole("dialog", { name: "Configure sua barbearia" })).toBeVisible()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2")
    expect(screen.getByText("Formulário real da etapa")).toBeVisible()
    expect(screen.getByRole("button", { name: "Revisão" })).toBeVisible()
    expect(screen.getByRole("button", { name: /Dados/ })).toHaveAttribute("aria-current", "step")
  })

  it("navigates between the existing setup sections", async () => {
    const onSectionChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PersistentOnboardingDialog
        currentSection="business"
        readiness={readiness}
        onSectionChange={onSectionChange}
        onDismiss={vi.fn()}
      >
        <p>Conteúdo</p>
      </PersistentOnboardingDialog>,
    )

    await user.click(screen.getByRole("button", { name: /Profissional/ }))
    expect(onSectionChange).toHaveBeenCalledWith("professionals")
  })

  it("keeps future dependencies locked until the current step is complete", () => {
    render(
      <PersistentOnboardingDialog
        currentSection="professionals"
        readiness={{
          ...readiness,
          steps: [
            ...readiness.steps,
            {
              complete: false,
              description: "Cadastre um serviço elegível.",
              id: "service",
              section: "services",
              title: "Serviço",
            },
          ],
          totalCount: 3,
        }}
        onSectionChange={vi.fn()}
        onDismiss={vi.fn()}
      >
        <p>Conteúdo</p>
      </PersistentOnboardingDialog>,
    )

    expect(screen.getByRole("button", { name: /Dados/ })).toBeEnabled()
    expect(screen.getByRole("button", { name: /Profissional/ })).toBeEnabled()
    expect(screen.getByRole("button", { name: /Serviço/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Revisão" })).toBeDisabled()
  })

  it("lets the manager dismiss the onboarding without changing readiness", async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(
      <PersistentOnboardingDialog
        currentSection="business"
        readiness={readiness}
        onSectionChange={vi.fn()}
        onDismiss={onDismiss}
      >
        <p>Conteúdo</p>
      </PersistentOnboardingDialog>,
    )

    await user.click(screen.getByRole("button", { name: "Fechar configuração inicial" }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it("shows the completed review and lets the manager revisit every step", async () => {
    const onSectionChange = vi.fn()
    const user = userEvent.setup()
    const completed = {
      ...readiness,
      completedCount: 2,
      nextStepId: null,
      outcome: "schedule_ready" as const,
      steps: readiness.steps.map((step) => ({ ...step, complete: true })),
    }
    render(
      <PersistentOnboardingDialog
        actions={<button type="button">Ação contextual</button>}
        currentSection="overview"
        readiness={completed}
        onSectionChange={onSectionChange}
        onDismiss={vi.fn()}
      >
        <p>Conteúdo oculto durante a revisão</p>
      </PersistentOnboardingDialog>,
    )

    expect(screen.getByText("Sua barbearia está quase pronta")).toBeVisible()
    expect(screen.getByText("Ação contextual")).toBeVisible()
    expect(screen.getAllByText("Completa")).toHaveLength(2)
    expect(screen.queryByText("Conteúdo oculto durante a revisão")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Revisão" })).toBeEnabled()

    await user.click(screen.getAllByRole("button", { name: /Revisar/ })[0])
    expect(onSectionChange).toHaveBeenCalledWith("business")
  })

  it("offers the next dependency when review is opened before completion", async () => {
    const onSectionChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PersistentOnboardingDialog
        currentSection="overview"
        readiness={readiness}
        onSectionChange={onSectionChange}
        onDismiss={vi.fn()}
      >
        <p>Conteúdo</p>
      </PersistentOnboardingDialog>,
    )

    expect(screen.getAllByText("Vincule um profissional ativo.")).toHaveLength(2)
    await user.click(screen.getByRole("button", { name: /Continuar configuração/ }))
    expect(onSectionChange).toHaveBeenCalledWith("professionals")
  })
})
