import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RevenueOperationsMemoryRepository } from "@/dev/revenue-operations/memory-repository"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import { AuthStateProvider } from "@/modules/auth/services/auth-provider"
import { CashPage } from "@/modules/revenue-operations/cash-page"
import { RevenueOperationsRepositoryProvider } from "@/modules/revenue-operations/repository-context"

describe("cash page", () => {
  it("renders exact source-derived totals and focuses an associated mismatch reason error", async () => {
    renderCash("cash-positive-difference")
    expect(await screen.findByRole("heading", { name: "Resumo do dia" })).toBeVisible()
    expect(screen.getByText("+R$ 5,00")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Fechar dia" }))

    const reason = await screen.findByLabelText("Motivo da diferença")
    await waitFor(() => expect(reason).toHaveFocus())
    expect(reason).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Explique a diferença com pelo menos 3 caracteres.")).toBeVisible()
  })

  it("renders an already-closed day without a reopen, edit, or close control", async () => {
    renderCash("cash-already-closed")
    expect(await screen.findByText("Dia fechado")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Fechamento registrado" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Fechar dia" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Reabrir|Editar/ })).not.toBeInTheDocument()
  })

  it("resets the cash count when the operational context changes", async () => {
    const view = renderCash("cash-positive-difference")
    expect(await screen.findByLabelText("Dinheiro contado")).not.toHaveValue("R$ 0,00")

    view.rerenderCash("cash-empty")

    await waitFor(() => expect(screen.getByLabelText("Dinheiro contado")).toHaveValue("R$ 0,00"))
  })
})

function renderCash(scenarioId: string) {
  const now = new Date("2026-07-24T11:30:00-03:00")
  const scheduling = new SchedulingMemoryRepository("2026-07-24")
  const serviceDesk = new ServiceDeskMemoryRepository(scheduling, { now: () => now })
  const repository = new RevenueOperationsMemoryRepository(serviceDesk, scheduling, {
    now: () => now,
  })
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const view = (scenario: string) => (
    <AuthStateProvider
      value={{
        error: null,
        isPending: false,
        refetch: vi.fn(),
        session: { user: { id: "reviewer", name: "Pessoa Revisora" } },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RevenueOperationsRepositoryProvider repository={repository}>
          <CashPage
            closingId={null}
            query={{ date: "2026-07-24", scenarioId: scenario, unitId: "centro" }}
            onContextChange={vi.fn()}
            onOpenClosing={vi.fn()}
          />
        </RevenueOperationsRepositoryProvider>
      </QueryClientProvider>
    </AuthStateProvider>
  )
  const result = render(view(scenarioId))
  return { ...result, rerenderCash: (scenario: string) => result.rerender(view(scenario)) }
}
