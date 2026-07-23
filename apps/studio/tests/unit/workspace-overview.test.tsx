import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { deriveDashboard } from "@/modules/scheduling/dashboard-projection"
import { WorkspaceOverview } from "@/modules/shared/components/workspace-overview"

const date = "2026-07-23"

async function dashboardModel(scenarioId = "normal") {
  const repository = new SchedulingMemoryRepository(date)
  const day = await repository.getDay({
    endDate: date,
    focusDate: date,
    scenarioId,
    startDate: "2026-07-22",
    unitId: "centro",
  })
  return deriveDashboard({
    bounds: { endDate: date, startDate: date },
    comparisonBounds: { endDate: "2026-07-22", startDate: "2026-07-22" },
    day,
    filters: { period: "today", unitId: "centro" },
    now: new Date(`${date}T08:00:00`),
    updatedAt: new Date(`${date}T08:00:00`).getTime(),
  })
}

const callbacks = () => ({
  onFiltersChange: vi.fn(),
  onNavigateAgenda: vi.fn(),
  onNavigateClients: vi.fn(),
  onNavigateServices: vi.fn(),
  onNewAppointment: vi.fn(),
  onOpenAppointment: vi.fn(),
  onRetry: vi.fn(),
})

describe("WorkspaceOverview", () => {
  it("renders the accepted hierarchy and explicit unsupported facts", async () => {
    render(<WorkspaceOverview {...callbacks()} model={await dashboardModel()} state="ready" />)

    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual(
      expect.arrayContaining([
        "Dashboard",
        "Próximos atendimentos",
        "Atenção necessária",
        "Fluxo dos atendimentos",
        "Ocupação dos barbeiros",
        "Capacidade do período",
        "Financeiro operacional",
        "Serviços do período",
        "Cancelamentos e no-show",
        "Clientes do período",
      ]),
    )
    expect(screen.getAllByText("Indisponível").length).toBeGreaterThanOrEqual(2)
    expect(
      screen.getByText("A fonte atual não comprova primeira visita nem retenção de longo prazo."),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/Valor em estado pago/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/vs\. dia anterior/)).toHaveLength(5)
    expect(
      screen.getByRole("table", { name: "Próximos atendimentos" }).querySelectorAll("tbody tr"),
    ).toHaveLength(5)
    expect(screen.queryByText(/· Pago /)).not.toBeInTheDocument()
  })

  it("opens the established compact filter menus", async () => {
    const user = userEvent.setup()
    render(<WorkspaceOverview {...callbacks()} model={await dashboardModel()} state="ready" />)

    await user.click(screen.getByRole("button", { name: "Período: Hoje" }))
    expect(await screen.findByRole("menuitemradio", { name: "Personalizado" })).toBeInTheDocument()
  })

  it("keeps KPI and creation actions keyboard-operable", async () => {
    const user = userEvent.setup()
    const handlers = callbacks()
    render(<WorkspaceOverview {...handlers} model={await dashboardModel()} state="ready" />)

    await user.click(screen.getByRole("button", { name: "Abrir Concluídos na Agenda" }))
    expect(handlers.onNavigateAgenda).toHaveBeenCalledWith({ status: "completed" })

    await user.click(screen.getByRole("button", { name: "Novo agendamento" }))
    expect(handlers.onNewAppointment).toHaveBeenCalled()
  })

  it("distinguishes loading, error/retry, disabled, and filtered-empty states", async () => {
    const handlers = callbacks()
    const { rerender } = render(<WorkspaceOverview {...handlers} state="loading" />)
    expect(screen.getByRole("status", { name: "Carregando Dashboard" })).toBeInTheDocument()

    rerender(<WorkspaceOverview {...handlers} state="error" />)
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o Dashboard")
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(handlers.onRetry).toHaveBeenCalled()

    rerender(<WorkspaceOverview {...handlers} state="disabled" />)
    expect(screen.getByRole("status")).toHaveTextContent("desativado neste ambiente")

    rerender(
      <WorkspaceOverview
        {...handlers}
        hasActiveFilters
        model={await dashboardModel("empty")}
        state="ready"
      />,
    )
    expect(
      screen.getByRole("heading", { name: "Nenhum resultado para os filtros" }),
    ).toBeInTheDocument()
  })
})
