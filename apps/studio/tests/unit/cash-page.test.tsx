import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RevenueOperationsMemoryRepository } from "@/dev/revenue-operations/memory-repository"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import { AuthStateProvider } from "@/modules/auth/services/auth-provider"
import { CashPage } from "@/modules/revenue-operations/cash-page"
import type { OpenDaySummary } from "@/modules/revenue-operations/contracts"
import { revenueOperationsQueryKeys } from "@/modules/revenue-operations/queries"
import { RevenueOperationsRepositoryProvider } from "@/modules/revenue-operations/repository-context"

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-09-05T14:30:00.000Z"))
})

afterEach(() => vi.useRealTimers())

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

  it("opens an absent current cash day from an explicit counted value", async () => {
    const repository = createMemoryRepository("2026-09-05")
    vi.spyOn(repository, "getOpenDaySummary").mockResolvedValue(emptySummary())
    vi.spyOn(repository, "listDailyClosings").mockResolvedValue([])
    const openCashDay = vi
      .fn()
      .mockRejectedValueOnce(new Error("unknown outcome"))
      .mockResolvedValue({ ...emptySummary(), id: "cash-day-a", version: 1 })
    Object.assign(repository, { openCashDay })
    renderCashRepository(repository, "2026-09-05")

    expect(await screen.findByText("Abrir caixa operacional")).toBeVisible()
    const input = screen.getByLabelText("Dinheiro inicial")
    expect(screen.getByRole("button", { name: "Abrir caixa" })).toBeDisabled()
    fireEvent.change(input, { target: { value: "1000" } })
    fireEvent.click(screen.getByRole("button", { name: "Abrir caixa" }))
    expect(await screen.findByText("Caixa não aberto")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Abrir caixa" }))
    await waitFor(() => expect(openCashDay).toHaveBeenCalledTimes(2))
    expect(openCashDay).toHaveBeenLastCalledWith("centro", 1_000, expect.any(String))
  })

  it("keeps cash movement drafts until a valid reason and amount are submitted", async () => {
    const repository = createMemoryRepository("2026-09-05")
    const current = { ...emptySummary(), id: "cash-day-a", version: 2, openingCashCents: 5_000 }
    vi.spyOn(repository, "getOpenDaySummary").mockResolvedValue(current)
    vi.spyOn(repository, "listDailyClosings").mockResolvedValue([])
    const addCashMovement = vi
      .fn()
      .mockRejectedValueOnce(new Error("unknown outcome"))
      .mockResolvedValue(current)
    Object.assign(repository, { addCashMovement, reopenDay: vi.fn() })
    renderCashRepository(repository, "2026-09-05")

    expect(await screen.findByText("Movimento de dinheiro")).toBeVisible()
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "withdrawal" } })
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "250" } })
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "x" } })
    expect(screen.getByText("Use pelo menos 3 caracteres.")).toBeVisible()
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Retirada operacional" } })
    fireEvent.click(screen.getByRole("button", { name: "Registrar retirada" }))
    expect(await screen.findByText("Movimento não registrado")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Registrar retirada" }))
    await waitFor(() =>
      expect(addCashMovement).toHaveBeenCalledWith(
        expect.objectContaining({ amountCents: 250, cashDayId: "cash-day-a", kind: "withdrawal" }),
      ),
    )
  })

  it("preserves a dirty cash count and requires review when polling changes the day version", async () => {
    const repository = createMemoryRepository("2026-09-05")
    const current = { ...emptySummary(), id: "cash-day-a", version: 2, expectedCashCents: 5_000 }
    vi.spyOn(repository, "getOpenDaySummary").mockResolvedValue(current)
    vi.spyOn(repository, "listDailyClosings").mockResolvedValue([])
    const view = renderCashRepository(repository, "2026-09-05")

    const counted = await screen.findByLabelText("Dinheiro contado")
    fireEvent.change(counted, { target: { value: "6000" } })
    fireEvent.change(screen.getByLabelText("Motivo da diferença"), {
      target: { value: "Contagem física preservada" },
    })
    view.queryClient.setQueryData(revenueOperationsQueryKeys.cash(view.query), {
      ...current,
      expectedCashCents: 5_500,
      version: 3,
    })

    expect(await screen.findByText("O caixa foi atualizado")).toBeVisible()
    expect(counted).toHaveValue("R$ 6.000,00")
    expect(screen.getByLabelText("Motivo da diferença")).toHaveValue("Contagem física preservada")
    expect(screen.getByRole("button", { name: "Fechar dia" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Revisar valores atualizados" }))
    expect(screen.getByRole("button", { name: "Fechar dia" })).toBeEnabled()
  })

  it("reopens a closed current day with a server-attributed immutable revision", async () => {
    const repository = createMemoryRepository("2026-09-05")
    const closed = {
      ...emptySummary(),
      cashDayId: "cash-day-a",
      id: "closing-a",
      version: 4,
      status: "closed" as const,
      countedCashCents: 0,
      differenceCents: 0,
      closedAt: "2026-09-05T20:00:00.000Z",
      responsiblePersonName: "Pessoa Servidora",
    }
    vi.spyOn(repository, "getOpenDaySummary").mockResolvedValue(closed)
    vi.spyOn(repository, "listDailyClosings").mockResolvedValue([closed])
    const reopenDay = vi.fn().mockResolvedValue({ ...emptySummary(), id: "cash-day-a", version: 5 })
    Object.assign(repository, { reopenDay })
    renderCashRepository(repository, "2026-09-05")

    expect(await screen.findByText("Reabrir caixa de hoje")).toBeVisible()
    const button = screen.getByRole("button", { name: "Reabrir caixa" })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Motivo da reabertura"), {
      target: { value: "Nova conferência" },
    })
    fireEvent.click(button)
    await waitFor(() =>
      expect(reopenDay).toHaveBeenCalledWith("cash-day-a", expect.any(String), "Nova conferência"),
    )
  })

  it("fails closed when the production cash source cannot be read", async () => {
    const repository = createMemoryRepository("2026-09-05")
    vi.spyOn(repository, "getOpenDaySummary").mockRejectedValue(new Error("offline"))
    vi.spyOn(repository, "listDailyClosings").mockResolvedValue([])
    renderCashRepository(repository, "2026-09-05")
    expect(await screen.findByText("Caixa indisponível")).toBeVisible()
  })
})

function renderCash(scenarioId: string) {
  const now = new Date("2026-07-24T11:30:00-03:00")
  const scheduling = new SchedulingMemoryRepository("2026-07-24")
  const serviceDesk = new ServiceDeskMemoryRepository(scheduling, { now: () => now })
  const repository = new RevenueOperationsMemoryRepository(serviceDesk, scheduling, {
    now: () => now,
  })
  return renderCashRepository(repository, "2026-07-24", scenarioId)
}

function createMemoryRepository(date: string) {
  const now = new Date(`${date}T11:30:00-03:00`)
  const scheduling = new SchedulingMemoryRepository(date)
  const serviceDesk = new ServiceDeskMemoryRepository(scheduling, { now: () => now })
  return new RevenueOperationsMemoryRepository(serviceDesk, scheduling, { now: () => now })
}

function emptySummary(): OpenDaySummary {
  return {
    barbershopCents: 0,
    cancellationCount: 0,
    commissionCents: 0,
    date: "2026-09-05",
    discountCents: 0,
    expectedCashCents: 0,
    noShowCount: 0,
    paidSaleCount: 0,
    paymentMethods: [],
    professionals: [],
    receivedCents: 0,
    status: "open",
    surchargeCents: 0,
    unitId: "centro",
    unitName: "Centro",
  }
}

function renderCashRepository(
  repository: RevenueOperationsMemoryRepository,
  date: string,
  scenarioId = "cash-empty",
) {
  const query = { date, scenarioId, unitId: "centro" as const }
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
            query={{ ...query, scenarioId: scenario }}
            onOpenClosing={vi.fn()}
          />
        </RevenueOperationsRepositoryProvider>
      </QueryClientProvider>
    </AuthStateProvider>
  )
  const result = render(view(scenarioId))
  return {
    ...result,
    query,
    queryClient,
    rerenderCash: (scenario: string) => result.rerender(view(scenario)),
  }
}
