import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActivationCard } from "@/modules/onboarding/activation-card"

describe("role-aware activation", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("guides a manager to the next real setup surface", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json({
        canManage: true,
        completedCount: 2,
        nextStepId: "professional",
        outcome: "setup_required",
        totalCount: 5,
        steps: [
          {
            complete: false,
            description: "Vincule um profissional ativo à unidade principal.",
            id: "professional",
            section: "professionals",
            title: "Profissional ativo",
          },
        ],
      }),
    )
    renderCard()
    expect(await screen.findByText("Prepare o primeiro agendamento")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2")
    expect(screen.getByRole("link", { name: /Continuar configuração/ })).toHaveAttribute(
      "href",
      "/barbershop-setup/professionals",
    )
  })

  it("does not present owner setup as a member's primary task", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json({
        canManage: false,
        completedCount: 1,
        nextStepId: "primary_unit",
        outcome: "setup_required",
        steps: [],
        totalCount: 5,
      }),
    )
    renderCard()
    await waitFor(() => expect(screen.getByTestId("onboarding-settled")).toBeEmptyDOMElement())
  })

  it("shows a bounded loading state while readiness is pending", () => {
    vi.stubGlobal("fetch", () => new Promise(() => undefined))
    renderCard()

    expect(screen.getByRole("status", { name: "Carregando próximos passos" })).toBeVisible()
  })

  it("recovers from a readiness failure through the visible retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(
          Response.json({
            canManage: true,
            completedCount: 5,
            nextStepId: null,
            outcome: "schedule_ready",
            steps: [],
            totalCount: 5,
          }),
        ),
    )
    const user = userEvent.setup()
    renderCard()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os próximos passos.",
    )
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(await screen.findByText("Sua agenda está pronta")).toBeVisible()
    expect(screen.getByRole("link", { name: /Abrir agenda/ })).toHaveAttribute("href", "/agenda")
  })

  it("falls back to the setup overview when the next step is unavailable", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json({
        canManage: true,
        completedCount: 0,
        nextStepId: "unknown",
        outcome: "setup_required",
        steps: [],
        totalCount: 5,
      }),
    )
    renderCard()

    expect(await screen.findByRole("link", { name: /Continuar configuração/ })).toHaveAttribute(
      "href",
      "/barbershop-setup/overview",
    )
  })
})

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <div data-testid="onboarding-settled">
        <ActivationCard />
      </div>
    </QueryClientProvider>,
  )
}
