import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RevenueOperationsMemoryRepository } from "@/dev/revenue-operations/memory-repository"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import { CheckoutPage } from "@/modules/revenue-operations/checkout-page"
import { RevenueOperationsError } from "@/modules/revenue-operations/contracts"
import { RevenueOperationsRepositoryProvider } from "@/modules/revenue-operations/repository-context"

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

describe("checkout page", () => {
  it("renders exact Pix checkout, confirmation, and read-only paid state", async () => {
    const repository = createRepository()
    renderCheckout(repository, "session-walk-in-checkout-pix")
    expect(await screen.findByRole("heading", { name: "Serviços realizados" })).toBeVisible()
    expect(screen.getByText("Pix")).toBeVisible()
    expect(screen.getAllByText("R$ 35,00").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }))
    const dialog = screen.getByRole("dialog", { name: "Registrar pagamento?" })
    fireEvent.click(dialog.querySelector("button:last-of-type") as HTMLButtonElement)

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Pagamento registrado."))
    expect(await screen.findAllByText("Pagamento registrado")).not.toHaveLength(0)
    expect(screen.getByText(/não é um comprovante fiscal/i)).toBeVisible()
    expect(screen.queryByRole("button", { name: "Atualizar ajustes" })).not.toBeInTheDocument()
  })

  it("validates adjustment reasons and focuses the first invalid field", async () => {
    renderCheckout(createRepository(), "session-walk-in-checkout-discount")
    await screen.findByRole("heading", { name: "Ajustes da comanda" })
    const reason = screen.getByLabelText("Motivo do desconto")
    fireEvent.change(reason, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Atualizar ajustes" }))
    expect(await screen.findByText("Informe o motivo do desconto.")).toBeVisible()
    expect(reason).toHaveFocus()
  })

  it("prevents duplicate completion while the first operation is pending", async () => {
    const repository = createRepository()
    const original = repository.completePayment.bind(repository)
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const complete = vi.spyOn(repository, "completePayment").mockImplementation(async (input) => {
      await gate
      return original(input)
    })
    renderCheckout(repository, "session-walk-in-checkout-pix")
    await screen.findByRole("heading", { name: "Serviços realizados" })
    fireEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }))
    const confirm = screen
      .getByRole("dialog")
      .querySelector("button:last-of-type") as HTMLButtonElement
    fireEvent.click(confirm)
    await waitFor(() => expect(confirm).toBeDisabled())
    fireEvent.click(confirm)
    expect(complete).toHaveBeenCalledTimes(1)
    release()
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
  })

  it("renders unavailable and retryable read failures without a synthetic checkout", async () => {
    const unavailable = createRepository()
    vi.spyOn(unavailable, "getCheckout").mockRejectedValue(
      new RevenueOperationsError("Ausente", "not-ready"),
    )
    const onBack = vi.fn()
    renderCheckout(unavailable, "missing", onBack)
    expect(await screen.findByText("Pagamento indisponível")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Voltar para o atendimento" }))
    expect(onBack).toHaveBeenCalledOnce()

    const retryable = createRepository()
    const checkout = await retryable.getCheckout("session-walk-in-checkout-pix")
    vi.spyOn(retryable, "getCheckout")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(checkout)
    renderCheckout(retryable, "retryable")
    expect(await screen.findByText("Não foi possível carregar o pagamento")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(await screen.findByRole("heading", { name: "Serviços realizados" })).toBeVisible()
  })

  it("renders received cash and replaces the tender draft", async () => {
    const repository = createRepository()
    const replace = vi.spyOn(repository, "replaceTenders")
    renderCheckout(repository, "session-walk-in-checkout-cash")
    await screen.findByRole("heading", { name: "Serviços realizados" })
    expect(screen.getByText(/Recebido R\$ 45,00/)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Limpar pagamentos" }))
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(expect.objectContaining({ tenders: [] })),
    )

    fireEvent.change(screen.getByLabelText("Valor aplicado (R$)"), { target: { value: "35" } })
    fireEvent.click(screen.getByRole("button", { name: "Adicionar pagamento" }))
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        expect.objectContaining({
          tenders: [expect.objectContaining({ appliedCents: 3_500, method: "pix" })],
        }),
      ),
    )
  })
})

function createRepository() {
  const scheduling = new SchedulingMemoryRepository("2026-07-23")
  const serviceDesk = new ServiceDeskMemoryRepository(scheduling, {
    now: () => new Date("2026-07-23T11:30:00-03:00"),
  })
  return new RevenueOperationsMemoryRepository(serviceDesk, {
    now: () => new Date("2026-07-23T11:30:00-03:00"),
  })
}

function renderCheckout(
  repository: RevenueOperationsMemoryRepository,
  sessionId: string,
  onBack = vi.fn(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <RevenueOperationsRepositoryProvider repository={repository}>
        <CheckoutPage onBack={onBack} sessionId={sessionId} />
      </RevenueOperationsRepositoryProvider>
    </QueryClientProvider>,
  )
}
