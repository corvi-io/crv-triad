import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { appointmentFormSchema } from "@/modules/scheduling/appointment-drawer"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"
import { SchedulePage } from "@/modules/scheduling/schedule-page"

describe("schedule page", () => {
  it("rejects off-grid minutes in the appointment form schema", () => {
    const result = appointmentFormSchema.safeParse({
      customerName: "Cliente Teste",
      customerPhone: "81900000000",
      date: "2026-07-19",
      notes: "",
      origin: "reception",
      professionalId: "professional-ana",
      serviceId: "service-cut",
      start: "09:10",
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
          <SchedulePage
            search={{ date: "2026-07-19", scenario: "normal" }}
            onSearchChange={vi.fn()}
          />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole("heading", { name: "Agenda" })).toBeInTheDocument()
    const appointment = (await screen.findAllByRole("button", { name: /Marina Teste/ }))[0]
    expect(appointment).toHaveTextContent("●Confirmado")
    await user.click(appointment)
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Ver agendamento" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Editar agendamento" }))
    expect(
      await screen.findByRole("dialog", { name: "Agenda / Editar agendamento" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome/)).toHaveValue("Marina Teste")
  })

  it("renders a deliberate narrow-layout professional list alongside the desktop table", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <SchedulingRepositoryProvider repository={new SchedulingMemoryRepository()}>
          <SchedulePage
            search={{ date: "2026-07-19", scenario: "walk-in" }}
            onSearchChange={vi.fn()}
          />
        </SchedulingRepositoryProvider>
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole("table", { name: /Profissionais em colunas/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { name: "Ana Lima" }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Encaixe aguardando/).length).toBeGreaterThan(0)
  })
})
