import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RevenueOperationsMemoryRepository } from "@/dev/revenue-operations/memory-repository"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import { CheckoutPage } from "@/modules/revenue-operations/checkout-page"
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

    fireEvent.click(screen.getByRole("button", { name: "Concluir pagamento" }))
    const dialog = screen.getByRole("dialog", { name: "Concluir pagamento?" })
    fireEvent.click(dialog.querySelector("button:last-of-type") as HTMLButtonElement)

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Pagamento concluído."))
    expect(await screen.findByText("Concluído · Pago")).toBeVisible()
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
    fireEvent.click(screen.getByRole("button", { name: "Concluir pagamento" }))
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

function renderCheckout(repository: RevenueOperationsMemoryRepository, sessionId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <RevenueOperationsRepositoryProvider repository={repository}>
        <CheckoutPage onBack={vi.fn()} sessionId={sessionId} />
      </RevenueOperationsRepositoryProvider>
    </QueryClientProvider>,
  )
}
