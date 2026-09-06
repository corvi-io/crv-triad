import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { ServiceDeskMemoryRepository } from "@/dev/service-desk/memory-repository"
import type { ServiceDeskRepository } from "@/modules/service-desk/contracts"
import { ServiceDeskRepositoryProvider } from "@/modules/service-desk/repository-context"
import { ServiceSessionPage } from "@/modules/service-desk/service-session-page"

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

describe("service session page", () => {
  it("distinguishes a recoverable load failure and retries it", async () => {
    const repository = createRepository()
    const getSession = vi.spyOn(repository, "getSession")
    getSession.mockRejectedValueOnce(new Error("synthetic load failure"))

    renderSession(repository)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o atendimento",
    )
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar novamente" }))

    expect(await screen.findByRole("heading", { name: "Serviços realizados" })).toBeVisible()
    expect(getSession).toHaveBeenCalledTimes(2)
  })

  it("keeps the add operation key stable across a failed retry", async () => {
    const repository = createRepository()
    const originalAdd = repository.addServiceItem.bind(repository)
    const add = vi
      .spyOn(repository, "addServiceItem")
      .mockRejectedValueOnce(new Error("synthetic mutation failure"))
      .mockImplementation(originalAdd)
    renderSession(repository)
    await screen.findByRole("heading", { name: "Serviços realizados" })
    chooseOption("new-service", "Corte degradê")
    chooseOption("new-professional", "Ana Clara")
    const submit = screen.getByRole("button", { name: "Adicionar serviço" })

    await userEvent.setup().click(submit)
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Não foi possível adicionar o serviço."),
    )
    await userEvent.setup().click(submit)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Serviço adicionado."))

    expect(add).toHaveBeenCalledTimes(2)
    expect(add.mock.calls[0][0].operationId).toBe(add.mock.calls[1][0].operationId)
    expect((await repository.getSession("session-walk-in-fulfillment-single")).items).toHaveLength(
      2,
    )
  })

  it("disables the add action while its promise is pending", async () => {
    const repository = createRepository()
    const originalAdd = repository.addServiceItem.bind(repository)
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const add = vi.spyOn(repository, "addServiceItem").mockImplementation(async (input) => {
      await gate
      return originalAdd(input)
    })
    renderSession(repository)
    await screen.findByRole("heading", { name: "Serviços realizados" })
    chooseOption("new-service", "Corte degradê")
    chooseOption("new-professional", "Ana Clara")
    const submit = screen.getByRole("button", { name: "Adicionar serviço" })

    fireEvent.click(submit)
    await waitFor(() => expect(submit).toBeDisabled())
    fireEvent.click(submit)
    expect(add).toHaveBeenCalledTimes(1)
    release()
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Serviço adicionado."))
  })

  it("renders completed, paid and canceled sessions with exact bounded actions", async () => {
    const repository = createRepository()
    const base = await repository.getSession("session-walk-in-fulfillment-single")
    const checkout = vi.fn()
    vi.spyOn(repository, "getSession").mockResolvedValueOnce({
      ...base,
      status: "ready-for-payment",
      finishedAt: base.now,
    })
    const completed = renderSession(repository, checkout)
    expect(await screen.findByText("Pronto para pagamento")).toBeVisible()
    await userEvent.setup().click(screen.getByRole("button", { name: "Ir para pagamento" }))
    expect(checkout).toHaveBeenCalledOnce()
    completed.unmount()

    vi.spyOn(repository, "getSession").mockResolvedValueOnce({
      ...base,
      status: "paid",
      finishedAt: base.now,
    })
    const paid = renderSession(repository, checkout)
    expect(
      await screen.findByText(
        "O atendimento foi concluído e o pagamento está somente para leitura.",
      ),
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Ver pagamento" })).toBeVisible()
    paid.unmount()

    vi.spyOn(repository, "getSession").mockResolvedValueOnce({
      ...base,
      status: "canceled",
      finishedAt: base.now,
    })
    renderSession(repository)
    expect(await screen.findByText("Saída registrada")).toBeVisible()
    expect(screen.getByText("Nenhum serviço realizado foi enviado para pagamento.")).toBeVisible()
    expect(screen.queryByRole("button", { name: /pagamento/i })).not.toBeInTheDocument()
  })

  it("exposes sequential controls only for pending and active items", async () => {
    const repository = createRepository()
    const base = await repository.getSession("session-walk-in-fulfillment-single")
    vi.spyOn(repository, "getSession").mockResolvedValue({
      ...base,
      items: [
        { ...base.items[0], id: "active", status: "active" },
        { ...base.items[0], id: "pending", source: "added", status: "pending" },
        { ...base.items[0], id: "completed", source: "added", status: "completed" },
      ],
    })
    renderSession(repository)
    await screen.findByRole("heading", { name: "Serviços realizados" })
    expect(screen.getByRole("button", { name: "Concluir serviço" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Estender horário" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Iniciar serviço" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Remover serviço" })).toBeVisible()
  })
})

function createRepository() {
  return new ServiceDeskMemoryRepository(new SchedulingMemoryRepository("2026-07-23"), {
    now: () => new Date("2026-07-23T11:30:00-03:00"),
  })
}

function renderSession(repository: ServiceDeskRepository, onCheckout?: () => void) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ServiceDeskRepositoryProvider repository={repository}>
        <ServiceSessionPage
          sessionId="session-walk-in-fulfillment-single"
          onBack={vi.fn()}
          onCheckout={onCheckout}
        />
      </ServiceDeskRepositoryProvider>
    </QueryClientProvider>,
  )
}

function chooseOption(id: string, option: string) {
  const trigger = document.getElementById(id)
  if (!trigger) throw new Error(`Expected select trigger #${id}.`)
  fireEvent.click(trigger)
  const item = screen.getByRole("option", { hidden: true, name: option })
  fireEvent.pointerDown(item, { buttons: 1, pointerType: "mouse" })
  fireEvent.click(item, { detail: 1 })
}
