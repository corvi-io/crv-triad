import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AgendaBoard } from "@/modules/scheduling/agenda-board"
import type { ScheduleRange } from "@/modules/scheduling/contracts"
import { WeeklyBoard } from "@/modules/scheduling/weekly-board"
import { booking, occurrence, person, range } from "../fixtures/production-scheduling"

const base: ScheduleRange = {
  ...range,
  endTime: "11:00",
  appointments: [],
  availability: [{ ...occurrence, kind: "available" }],
}
const actions = { onAppointment: vi.fn(), onCreate: vi.fn(), onDropAppointment: vi.fn() }
describe("production temporal occupancy", () => {
  it.each([
    "private",
    "break",
    "blocked",
    "absence",
    "no-positive",
  ] as const)("does not offer a slot hidden by %s", async (kind) => {
    const value: ScheduleRange = {
      ...base,
      availability: kind === "no-positive" ? [] : base.availability,
      occupancies:
        kind === "private"
          ? [
              {
                id: "opaque",
                professionalId: person.id,
                date: booking.date,
                start: "09:00",
                durationMinutes: 45,
              },
            ]
          : [],
      periods: ["break", "blocked", "absence"].includes(kind)
        ? [
            {
              id: "rule-negative",
              professionalId: person.id,
              date: booking.date,
              start: "08:45",
              end: "09:30",
              kind: "blocked",
              label: "Indisponível",
            },
          ]
        : [],
    }
    render(<WeeklyBoard {...actions} range={value} appointments={[]} />)
    expect(
      screen.queryByRole("button", { name: "Criar agendamento em 07/09/2026 às 09:00" }),
    ).not.toBeInTheDocument()
    if (kind !== "no-positive")
      expect(
        screen.getByRole("button", { name: "Criar agendamento em 07/09/2026 às 10:00" }),
      ).toBeVisible()
    expect(screen.queryByText(booking.customerName)).not.toBeInTheDocument()
  })
  it("keeps another professional bookable when a colleague has a break", async () => {
    const other = { id: "other-professional", name: "Outra pessoa" },
      create = vi.fn()
    render(
      <WeeklyBoard
        {...actions}
        onCreate={create}
        appointments={[]}
        range={{
          ...base,
          professionals: [person, other],
          availability: [
            ...(base.availability ?? []),
            { ...occurrence, professionalId: other.id, kind: "available" },
          ],
          periods: [
            {
              id: "break",
              date: booking.date,
              start: "09:00",
              end: "10:00",
              professionalId: person.id,
              kind: "break",
              label: "Intervalo",
            },
          ],
        }}
      />,
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Criar agendamento em 07/09/2026 às 09:00" }),
    )
    expect(create).toHaveBeenCalledWith({
      date: booking.date,
      start: "09:00",
      professionalId: other.id,
    })
  })
  it("does not silently choose among multiple eligible professionals", async () => {
    const other = { id: "other-professional", name: "Outra pessoa" },
      create = vi.fn()
    render(
      <WeeklyBoard
        {...actions}
        onCreate={create}
        appointments={[]}
        range={{
          ...base,
          professionals: [person, other],
          availability: [
            ...(base.availability ?? []),
            { ...occurrence, professionalId: other.id, kind: "available" },
          ],
        }}
      />,
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Criar agendamento em 07/09/2026 às 09:00" }),
    )
    expect(create).toHaveBeenCalledWith({ date: booking.date, start: "09:00", professionalId: "" })
  })
  it("routes a dragged appointment to rescheduling and ignores an unknown drag payload", () => {
    const drop = vi.fn()
    render(
      <WeeklyBoard {...actions} onDropAppointment={drop} appointments={[booking]} range={base} />,
    )
    const target = screen.getByRole("group", { name: "07/09/2026 às 10:00" })
    fireEvent.dragOver(target)
    fireEvent.drop(target, { dataTransfer: { getData: () => "unknown" } })
    expect(drop).not.toHaveBeenCalled()
    fireEvent.drop(target, { dataTransfer: { getData: () => booking.id } })
    expect(drop).toHaveBeenCalledWith(booking, {
      date: booking.date,
      professionalId: person.id,
      start: "10:00",
    })
  })
  it("keeps a private day-board occupancy separate from visible appointment data", () => {
    render(
      <AgendaBoard
        day={{
          ...base,
          occupancies: [
            {
              id: "private",
              date: booking.date,
              professionalId: person.id,
              start: "09:00",
              durationMinutes: 30,
            },
          ],
        }}
        isReschedulePending={false}
        onAnnouncement={vi.fn()}
        onAppointment={vi.fn()}
        onReschedule={vi.fn()}
        onSlot={vi.fn()}
        onTransitionRequest={vi.fn()}
        unitId="centro"
      />,
    )
    expect(screen.getByText("Ocupado · 09:00–09:30")).toBeVisible()
    expect(screen.queryByText(booking.customerName)).not.toBeInTheDocument()
    expect(
      within(screen.getByRole("table")).getByRole("rowheader", { name: "09:15" }),
    ).toBeVisible()
  })
  it.each([
    15, 30, 60,
  ])("keeps %s-minute snapshot cards actionable when their catalog service is archived", async (durationMinutes) => {
    const open = vi.fn(),
      transition = vi.fn(),
      slot = vi.fn()
    const appointment = { ...booking, durationMinutes }
    render(
      <AgendaBoard
        day={{ ...base, services: [], appointments: [appointment] }}
        isReschedulePending={false}
        onAnnouncement={vi.fn()}
        onAppointment={open}
        onReschedule={vi.fn()}
        onSlot={slot}
        onTransitionRequest={transition}
        unitId="centro"
      />,
    )
    expect(screen.queryByText("Serviço sintético")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: `Ações de ${booking.customerName}` }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Ver detalhes" }))
    expect(open).toHaveBeenCalledWith(appointment)
    await userEvent.click(screen.getByRole("button", { name: `Ações de ${booking.customerName}` }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Alterar status" }))
    expect(transition).toHaveBeenCalledWith(appointment)
  })
  it("disables terminal rescheduling and hides terminal transition actions", async () => {
    const appointment = { ...booking, status: "completed" as const }
    render(
      <AgendaBoard
        day={{ ...base, appointments: [appointment] }}
        isReschedulePending={false}
        onAnnouncement={vi.fn()}
        onAppointment={vi.fn()}
        onReschedule={vi.fn()}
        onSlot={vi.fn()}
        onTransitionRequest={vi.fn()}
        unitId="centro"
      />,
    )
    expect(
      screen.getByRole("button", { name: `Remarcação indisponível para ${booking.customerName}` }),
    ).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: `Ações de ${booking.customerName}` }))
    expect(await screen.findByRole("menuitem", { name: "Ver detalhes" })).toBeVisible()
    expect(screen.queryByRole("menuitem", { name: "Alterar status" })).not.toBeInTheDocument()
  })
})
