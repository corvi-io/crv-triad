import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type ReactElement, useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { approvedBoardFixtures } from "@/dev/scheduling/scenarios"
import { AppointmentDrawer, appointmentFormSchema } from "@/modules/scheduling/appointment-drawer"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"
import { SchedulePage, type ScheduleSearch } from "@/modules/scheduling/schedule-page"
import { TransitionDialog } from "@/modules/scheduling/transition-dialog"

const baseSearch: ScheduleSearch = {
  date: "2026-07-19",
  period: "today",
  scenario: "normal",
  unit: "centro",
  view: "board",
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

  it("renders the temporal board with six barber columns, time rows, and portrait cards", async () => {
    const { container } = renderSchedule(
      <SchedulePage search={baseSearch} onSearchChange={vi.fn()} />,
    )

    expect(await screen.findByRole("heading", { name: "Agenda" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Visualizar como quadro" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await screen.findByRole("table", { name: /Horários em linhas/ })
    const moduleViewport = container.querySelector('[data-slot="scroll-area-viewport"]')
    expect(moduleViewport).not.toBeNull()
    expect(
      moduleViewport?.className.split(/\s+/).some((className) => className.startsWith("pb-")),
    ).toBe(false)
    expect(
      moduleViewport?.className.split(/\s+/).some((className) => className.startsWith("space-y-")),
    ).toBe(false)
    expect(container.querySelector(".agenda-board")).toHaveClass("flex-1")
    for (const name of [
      "Carlos Lima",
      "Bruno Rocha",
      "Ana Clara",
      "João Vitor",
      "Diego Rodrigues",
      "Marcos Paulo",
    ]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(name) })).toBeInTheDocument()
    }
    expect(screen.getByRole("rowheader", { name: "08:00" })).toBeInTheDocument()
    expect(screen.getByRole("rowheader", { name: "08:15" })).toBeInTheDocument()
    expect(container.querySelectorAll("[data-appointment-id]")).toHaveLength(42)
    expect(container.querySelectorAll("[data-slot=avatar]").length).toBeGreaterThan(42)
    expect(screen.queryByText("Resumo da agenda")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remarcar Carlos Eduardo" })).toBeEnabled()
    expect(
      screen.getByRole("button", { name: "Remarcação indisponível para João Vitor" }),
    ).toBeDisabled()
  })

  it("announces keyboard drag instructions and cancellation in Portuguese", async () => {
    const user = userEvent.setup()
    const originalScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = vi.fn()
    renderSchedule(<SchedulePage search={baseSearch} onSearchChange={vi.fn()} />)

    const handle = await screen.findByRole("button", { name: "Remarcar Carlos Eduardo" })
    handle.focus()
    await user.keyboard("[Space]")
    expect(await screen.findByText(/Remarcando Carlos Eduardo\. Use as setas/)).toBeInTheDocument()
    await user.keyboard("[Escape]")
    expect(await screen.findByText("Remarcação cancelada.")).toBeInTheDocument()
    expect(handle).toHaveFocus()
    Element.prototype.scrollIntoView = originalScrollIntoView
  })

  it("opens details from a board card and preserves the edit journey", async () => {
    const user = userEvent.setup()
    renderSchedule(<SchedulePage search={baseSearch} onSearchChange={vi.fn()} />)

    const card = (await screen.findByText("Carlos Eduardo")).closest("[data-appointment-id]")
    expect(card).not.toBeNull()
    if (!card) return
    expect(card).toHaveTextContent("Em atendimento")
    expect(card.querySelector("[data-slot=avatar]")).toBeInTheDocument()

    await user.click(within(card as HTMLElement).getByRole("button", { name: /^Carlos Eduardo/ }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Editar agendamento" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Editar agendamento" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome/)).toHaveValue("Carlos Eduardo")
    expect(screen.queryByLabelText("Status inicial")).not.toBeInTheDocument()
  }, 10_000)

  it("switches between Quadro and Lista through the canonical icon toggle", async () => {
    const user = userEvent.setup()
    const { container } = renderSchedule(<ScheduleHarness initialSearch={baseSearch} />)

    expect(await screen.findByRole("table", { name: /Horários em linhas/ })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Visualizar como lista" }))
    const list = await screen.findByRole("table", { name: /Agendamentos filtrados/ })
    expect(list).toBeInTheDocument()
    expect(list.closest("section")).toHaveClass("flex-1")
    const moduleViewport = container.querySelector('[data-slot="scroll-area-viewport"]')
    expect(moduleViewport).not.toBeNull()
    expect(
      moduleViewport?.className.split(/\s+/).some((className) => className.startsWith("pb-")),
    ).toBe(false)
    expect(
      moduleViewport?.className.split(/\s+/).some((className) => className.startsWith("space-y-")),
    ).toBe(false)
    expect(screen.getByRole("button", { name: "Visualizar como lista" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("completes the non-drag status path from the appointment menu", async () => {
    const user = userEvent.setup()
    renderSchedule(<SchedulePage search={baseSearch} onSearchChange={vi.fn()} />)

    await user.click(await screen.findByRole("button", { name: "Ações de Carlos Eduardo" }))
    await user.click(await screen.findByRole("menuitem", { name: "Alterar status" }))
    expect(await screen.findByRole("dialog", { name: "Alterar status" })).toBeInTheDocument()
    await user.click(screen.getByRole("radio", { name: "Em espera" }))
    await user.click(screen.getByRole("button", { name: "Confirmar alteração" }))

    const card = (await screen.findByText("Carlos Eduardo")).closest("[data-appointment-id]")
    expect(card).toHaveTextContent("Em espera")
  })

  it("uses button-like filter triggers with counters and searchable menus", async () => {
    const user = userEvent.setup()
    renderSchedule(<ScheduleHarness initialSearch={baseSearch} />)

    const barberFilter = await screen.findByRole("button", { name: "Barbeiro" })
    expect(barberFilter).not.toHaveTextContent("6")
    await user.click(barberFilter)
    fireEvent.change(await screen.findByLabelText("Pesquisar barbeiro"), {
      target: { value: "Carlos" },
    })
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Carlos Lima" }))
    expect(screen.getByRole("button", { name: "Barbeiro: 1 selecionado(s)" })).toHaveTextContent(
      "1",
    )

    await user.click(screen.getByRole("button", { name: "Status" }))
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Confirmado" }))
    expect(screen.getByRole("button", { name: "Status: 1 selecionado(s)" })).toHaveTextContent("1")
  })

  it("opens a calendar range from the period trigger and keeps scenarios in settings", async () => {
    const user = userEvent.setup()
    renderSchedule(<ScheduleHarness initialSearch={baseSearch} />)

    await user.click(screen.getByRole("button", { name: "Período: 19/07" }))
    expect(screen.getByText("Período da agenda")).toBeInTheDocument()
    expect(
      screen.getByText("Escolha um atalho ou selecione as datas inicial e final."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Aplicar período" })).toBeEnabled()
    await user.keyboard("{Escape}")

    await user.click(screen.getByRole("button", { name: "Configurações do protótipo" }))
    expect(await screen.findByText("Cenário de desenvolvimento")).toBeInTheDocument()
    expect(screen.getByRole("menuitemradio", { name: /Quadro preenchido/ })).toBeChecked()
  })

  it("keeps terminal appointments read-only in the drawer", async () => {
    const completed = approvedBoardFixtures.find(({ status }) => status === "completed")
    expect(completed).toBeDefined()
    if (!completed) return

    renderSchedule(
      <AppointmentDrawer
        appointment={completed}
        isOpen
        mode="view"
        professionals={[]}
        selectedDate={baseSearch.date}
        selectedUnit="centro"
        services={[]}
        onModeChange={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    )

    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Editar agendamento" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remarcar" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cancelar agendamento" })).not.toBeInTheDocument()
  })

  it("requires cancellation reasons and unpaid-completion decisions", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const confirmed = approvedBoardFixtures.find(({ status }) => status === "confirmed")
    const inProgress = approvedBoardFixtures.find(({ status }) => status === "in-progress")
    expect(confirmed).toBeDefined()
    expect(inProgress).toBeDefined()
    if (!confirmed || !inProgress) return

    const { rerender } = render(
      <TransitionDialog
        appointment={confirmed}
        initialColumn="canceled-no-show"
        isPending={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByRole("button", { name: "Confirmar alteração" })).toBeDisabled()
    await user.click(screen.getByRole("radio", { name: "Não compareceu" }))
    await user.click(screen.getByRole("button", { name: "Confirmar alteração" }))
    expect(onConfirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ cancellationReason: "no-show", status: "no-show" }),
    )

    rerender(
      <TransitionDialog
        key="completion"
        appointment={inProgress}
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

  it("renders filtered-out appointments as occupied time spans", async () => {
    renderSchedule(
      <SchedulePage
        search={{
          ...baseSearch,
          client: "client-kanban-02",
          professional: "professional-carlos",
        }}
        onSearchChange={vi.fn()}
      />,
    )

    const occupancy = await screen.findByText("Ocupado · 08:00–08:45")
    expect(occupancy.closest("td")).toHaveAttribute("rowspan", "3")
    expect(
      screen.queryByRole("button", { name: "Novo agendamento às 08:00 com Carlos Lima" }),
    ).not.toBeInTheDocument()
  })
})

function renderSchedule(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository(baseSearch.date)}>
        {ui}
      </SchedulingRepositoryProvider>
    </QueryClientProvider>,
  )
}

function ScheduleHarness({ initialSearch }: { initialSearch: ScheduleSearch }) {
  const [search, setSearch] = useState(initialSearch)
  return (
    <SchedulePage
      search={search}
      onSearchChange={(next) => setSearch((current) => ({ ...current, ...next }))}
    />
  )
}
