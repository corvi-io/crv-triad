import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { approvedKanbanFixtures } from "@/dev/scheduling/scenarios"
import { AppointmentDrawer, appointmentFormSchema } from "@/modules/scheduling/appointment-drawer"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"
import { SchedulePage, type ScheduleSearch } from "@/modules/scheduling/schedule-page"
import { TransitionDialog } from "@/modules/scheduling/transition-dialog"

const baseSearch = {
  date: "2026-07-19",
  period: "today" as const,
  scenario: "normal",
  unit: "centro" as const,
  view: "kanban" as const,
}

describe("schedule page", () => {
  it("rejects off-grid minutes in the appointment form schema", () => {
    const result = appointmentFormSchema.safeParse({
      customerName: "Cliente Teste",
      customerPhone: "81900000000",
      date: "2026-07-19",
      notes: "",
      origin: "reception",
      paymentStatus: "pending",
      professionalId: "professional-ana",
      serviceId: "service-hair-beard",
      start: "09:10",
      status: "confirmed",
      unitId: "centro",
    })

    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("15 em 15") }),
      ]),
    )
  })
  it("renders textual status cues and opens the view/edit drawer journey", async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository()}>
          <SchedulePage search={baseSearch} onSearchChange={vi.fn()} />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole("heading", { name: "Agenda" })).toBeInTheDocument()
    const card = (await screen.findByText("João Vitor")).closest("[data-appointment-id]")
    expect(card).not.toBeNull()
    if (!card) return
    expect(card).toHaveTextContent("Confirmado")
    expect(card).not.toHaveAttribute("customername")
    expect(card).not.toHaveAttribute("customerphone")
    expect(
      within(card as HTMLElement).getByRole("button", {
        name: "Mover agendamento de João Vitor",
      }),
    ).toBeEnabled()
    const terminalCard = (await screen.findByText("Marcos Paulo")).closest("[data-appointment-id]")
    expect(terminalCard).not.toBeNull()
    if (!terminalCard) return
    expect(
      within(terminalCard as HTMLElement).getByRole("button", {
        name: "Agendamento de Marcos Paulo não pode ser movido",
      }),
    ).toBeDisabled()
    expect(
      within(terminalCard as HTMLElement).getByRole("button", { name: "Ver detalhes" }),
    ).toBeEnabled()
    await user.click(within(card as HTMLElement).getByRole("button", { name: "Ver detalhes" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Editar agendamento" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Editar agendamento" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome/)).toHaveValue("João Vitor")
    expect(screen.queryByLabelText("Status inicial")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Pagamento")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Voltar" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Remarcar" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Remarcar agendamento" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Voltar" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Cancelar agendamento" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Cancelar agendamento" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Manter agendamento" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
  })

  it("offers the canonical views and completes a non-drag status transition", async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository()}>
          <SchedulePage search={baseSearch} onSearchChange={vi.fn()} />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole("radio", { name: "Kanban" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Grade diária" })).not.toBeChecked()
    expect(
      await screen.findAllByRole("heading", {
        name: /Confirmados|Check-in|Em espera|Em atendimento|Finalizados|Cancelados \/ No-show/,
      }),
    ).toHaveLength(6)

    await user.click(screen.getByRole("button", { name: "Ações de João Vitor" }))
    await user.click(await screen.findByRole("menuitem", { name: "Alterar status" }))
    expect(await screen.findByRole("dialog", { name: "Alterar status" })).toBeInTheDocument()
    await user.click(screen.getByRole("radio", { name: "Em espera" }))
    await user.click(screen.getByRole("button", { name: "Confirmar alteração" }))

    const movedCard = (await screen.findByText("João Vitor")).closest("[data-appointment-id]")
    expect(movedCard).toHaveTextContent("Aguardando")
    if (!movedCard) return

    await user.click(within(movedCard as HTMLElement).getByRole("button", { name: "Ver detalhes" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Fechar" }))

    await user.click(screen.getByRole("button", { name: "Ações de João Vitor" }))
    await user.click(await screen.findByRole("menuitem", { name: "Alterar status" }))
    await user.click(screen.getByRole("radio", { name: "Check-in" }))
    await user.click(screen.getByRole("button", { name: "Confirmar alteração" }))
    expect(
      (await screen.findByText("João Vitor")).closest("[data-appointment-id]"),
    ).toHaveTextContent("Chegou")
  })

  it("hides invalid terminal actions in menus and details", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository()}>
          <AppointmentDrawer
            appointment={approvedKanbanFixtures[12]}
            isOpen
            mode="view"
            onModeChange={vi.fn()}
            onOpenChange={vi.fn()}
            professionals={[]}
            selectedDate={baseSearch.date}
            selectedUnit="centro"
            services={[]}
          />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
    expect(screen.getByText("✓ Concluído")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Editar agendamento" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remarcar" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancelar agendamento" })).not.toBeInTheDocument()
  })

  it("distinguishes empty periods from filtered results and clears filters independently", async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository()}>
          <SchedulePage search={{ ...baseSearch, scenario: "empty" }} onSearchChange={vi.fn()} />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole("heading", { name: "Agenda livre no período" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adicionar agendamento" })).toBeInTheDocument()

    unmount()
    const filteredQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={filteredQueryClient}>
        <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository()}>
          <ScheduleHarness
            initialSearch={{
              ...baseSearch,
              period: "tomorrow",
              professional: "professional-carlos",
              scenario: "many-professionals",
              unit: "artesao",
            }}
          />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole("heading", { name: "Nenhum agendamento encontrado" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Período")).toHaveTextContent("Amanhã")
    expect(screen.getByLabelText("Unidade")).toHaveTextContent("Artesão")
    expect(screen.getByLabelText("Barbeiro")).toHaveTextContent("1 selecionado")

    await user.click(screen.getByRole("button", { name: "Limpar filtro unidade" }))
    expect(screen.getByLabelText("Unidade")).toHaveTextContent("Centro")
    expect(screen.getByLabelText("Período")).toHaveTextContent("Amanhã")
    expect(screen.getByLabelText("Barbeiro")).toHaveTextContent("1 selecionado")

    await user.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0])
    expect(screen.getByLabelText("Unidade")).toHaveTextContent("Centro")
    expect(screen.getByLabelText("Período")).toHaveTextContent("Hoje")
    expect(screen.getByLabelText("Barbeiro")).toHaveTextContent("Todos")
  })

  it("searches inside a long professional catalog", async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository()}>
          <ScheduleHarness initialSearch={{ ...baseSearch, scenario: "many-professionals" }} />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )

    await user.click(await screen.findByLabelText("Barbeiro"))
    await user.type(
      await screen.findByRole("textbox", { name: "Pesquisar barbeiro" }),
      "Sintético 7",
    )
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Profissional Sintético 7" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("menuitemcheckbox", { name: "Profissional Sintético 1" }),
    ).not.toBeInTheDocument()
  })

  it("requires cancellation reasons and unpaid-completion decisions in the non-drag path", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const { rerender } = render(
      <TransitionDialog
        appointment={approvedKanbanFixtures[0]}
        initialColumn="canceled-no-show"
        isPending={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )
    const confirm = screen.getByRole("button", { name: "Confirmar alteração" })
    expect(confirm).toBeDisabled()
    await user.click(screen.getByRole("radio", { name: "Não compareceu" }))
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    expect(onConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ cancellationReason: "no-show", status: "no-show" }),
    )

    rerender(
      <TransitionDialog
        key="completion"
        appointment={approvedKanbanFixtures[9]}
        initialColumn="completed"
        isPending={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByRole("button", { name: "Confirmar alteração" })).toBeDisabled()
    await user.click(screen.getByRole("radio", { name: "Manter pagamento pendente" }))
    await user.click(screen.getByRole("button", { name: "Confirmar alteração" }))
    expect(onConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ paymentStatus: "pending", status: "completed" }),
    )
  })

  it("renders a deliberate narrow-layout professional list alongside the desktop table", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository()}>
          <SchedulePage
            search={{ ...baseSearch, scenario: "walk-in", view: "daily-grid" }}
            onSearchChange={vi.fn()}
          />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole("table", { name: /Profissionais em colunas/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { name: "Carlos Lima" }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Encaixe aguardando/).length).toBeGreaterThan(0)
  })

  it("renders hidden-status occupancy as a non-interactive duration span", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository()}>
          <SchedulePage
            search={{
              ...baseSearch,
              client: "client-kanban-02",
              professional: "professional-ana",
              view: "daily-grid",
            }}
            onSearchChange={vi.fn()}
          />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )

    const descriptions = await screen.findAllByText(/Agendamento fora do filtro · 11:00–11:50/)
    const desktopCell = descriptions.map((node) => node.closest("td")).find(Boolean)
    expect(desktopCell).toHaveAttribute("rowspan", "4")
    expect(
      screen.queryByRole("button", { name: "Disponível às 11:00 para Ana Clara" }),
    ).not.toBeInTheDocument()
  })
})

function ScheduleHarness({ initialSearch }: { initialSearch: ScheduleSearch }) {
  const [search, setSearch] = useState(initialSearch)
  return (
    <SchedulePage
      search={search}
      onSearchChange={(next) => setSearch((current) => ({ ...current, ...next }))}
    />
  )
}
