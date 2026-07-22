import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { appointmentFormSchema } from "@/modules/scheduling/appointment-drawer"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"
import { SchedulePage } from "@/modules/scheduling/schedule-page"

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
    await user.click(within(card as HTMLElement).getByRole("button", { name: "Ver detalhes" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Editar agendamento" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Editar agendamento" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome/)).toHaveValue("João Vitor")
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
