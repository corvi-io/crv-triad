import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import type { SetupSection } from "@/modules/barbershop-setup/contracts"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"
import type { BarbershopSetupSearch } from "@/modules/barbershop-setup/search"
import { BarbershopSetupPage } from "@/modules/barbershop-setup/setup-page"
import type { ActivationReadiness } from "@/modules/onboarding/readiness"

let readiness: ActivationReadiness
const refetch = vi.fn(async () => ({ data: readiness }))

vi.mock("@/modules/onboarding/readiness", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/onboarding/readiness")>()),
  useActivationReadiness: () => ({ data: readiness, refetch }),
}))
vi.mock("@/modules/access/use-access-summary", () => ({
  useAccessSummary: () => ({ data: { capabilities: [] } }),
}))
vi.mock("@/modules/workspace/context-provider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/workspace/context-provider")>()),
  useWorkspaceTenantId: () => "tenant-onboarding",
}))

const steps: ActivationReadiness["steps"] = [
  {
    complete: false,
    description: "Informe os dados.",
    id: "business",
    section: "business",
    title: "Dados",
  },
  {
    complete: false,
    description: "Cadastre a unidade.",
    id: "primary_unit",
    section: "units",
    title: "Unidade",
  },
  {
    complete: false,
    description: "Vincule a equipe.",
    id: "professional",
    section: "professionals",
    title: "Profissional",
  },
  {
    complete: false,
    description: "Cadastre um serviço.",
    id: "service",
    section: "services",
    title: "Serviço",
  },
  {
    complete: false,
    description: "Defina horários.",
    id: "availability",
    section: "availability",
    title: "Disponibilidade",
  },
]

describe("guided onboarding setup page", () => {
  afterEach(() => {
    window.sessionStorage.clear()
    vi.clearAllMocks()
  })

  it("forces the first incomplete step and dismisses only the modal experience", async () => {
    setReadiness("business", 0)
    renderSetup("overview")

    expect(await screen.findByRole("dialog", { name: "Configure sua barbearia" })).toBeVisible()
    expect(await screen.findByLabelText("Nome de exibição")).toBeVisible()
    expect(screen.getByRole("button", { name: /Unidade/ })).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: "Fechar configuração inicial" }))
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Configure sua barbearia" }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByRole("heading", { name: "Dados da barbearia", level: 3 })).toBeVisible()
  })

  it.each([
    ["professional", "professionals", "Convidar profissional"],
    ["service", "services", "Novo serviço"],
  ] as const)(
    "renders %s as an inline form without the CRUD list",
    async (nextStepId, section, heading) => {
      const completedCount = steps.findIndex((step) => step.id === nextStepId)
      setReadiness(nextStepId, completedCount)
      renderSetup(section)

      expect(await screen.findByRole("heading", { name: heading })).toBeVisible()
      expect(screen.getByRole("button", { name: "Salvar e continuar" })).toBeVisible()
      expect(screen.queryByRole("table")).not.toBeInTheDocument()
    },
    15_000,
  )

  it("keeps the dialog open for final review when the last dependency becomes ready", async () => {
    setReadiness("business", 0)
    renderSetup("business")
    expect(await screen.findByRole("dialog", { name: "Configure sua barbearia" })).toBeVisible()

    readiness = {
      ...readiness,
      completedCount: steps.length,
      nextStepId: null,
      outcome: "schedule_ready",
      steps: steps.map((step) => ({ ...step, complete: true })),
    }
    await userEvent.click(screen.getByRole("button", { name: /Dados/ }))

    expect(
      await screen.findByRole("heading", { name: "Sua barbearia está quase pronta" }),
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Revisão" })).toHaveAttribute("aria-current", "step")
    expect(screen.getAllByText("Completa")).toHaveLength(5)
  })
})

function setReadiness(nextStepId: string, completedCount: number) {
  readiness = {
    canManage: true,
    completedCount,
    nextStepId,
    outcome: "setup_required",
    steps: steps.map((step, index) => ({ ...step, complete: index < completedCount })),
    totalCount: steps.length,
  }
}

function renderSetup(section: SetupSection) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repository = new BarbershopSetupMemoryRepository()
  function Harness() {
    const [search, setSearch] = useState<BarbershopSetupSearch>({
      availabilityDate: "2026-09-07",
      availabilityView: "week",
      scenario: "single-unit",
      section,
    })
    return (
      <QueryClientProvider client={cache}>
        <BarbershopSetupRepositoryProvider repository={repository}>
          <BarbershopSetupPage
            search={search}
            onSearchChange={(next) => setSearch((current) => ({ ...current, ...next }))}
          />
        </BarbershopSetupRepositoryProvider>
      </QueryClientProvider>
    )
  }
  return render(<Harness />)
}
