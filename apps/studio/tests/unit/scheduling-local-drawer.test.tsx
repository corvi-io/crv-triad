import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster } from "sonner"
import { describe, expect, it, vi } from "vitest"
import { SchedulingMemoryRepository } from "@/dev/scheduling/memory-repository"
import { AppointmentDrawer, type DrawerMode } from "@/modules/scheduling/appointment-drawer"
import { ScheduleConflictError } from "@/modules/scheduling/contracts"
import { SchedulingRepositoryProvider } from "@/modules/scheduling/repository-context"

async function setup(mode: DrawerMode, failure?: "conflict" | "network") {
  const repository = new SchedulingMemoryRepository("2026-09-07")
  const range = await repository.getRange({
    startDate: "2026-09-07",
    endDate: "2026-09-07",
    focusDate: "2026-09-07",
    unitId: "centro",
  })
  const appointment = range.appointments.find((item) => item.status === "confirmed")
  if (!appointment) throw new Error("Missing local fixture")
  const update = vi.spyOn(repository, "update"),
    cancel = vi.spyOn(repository, "cancel")
  if (failure) {
    const error =
      failure === "conflict"
        ? new ScheduleConflictError("Conflito de horário.")
        : new Error("Offline")
    update.mockRejectedValueOnce(error)
    cancel.mockRejectedValueOnce(error)
  }
  const onClose = vi.fn(),
    onMode = vi.fn()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SchedulingRepositoryProvider repository={repository}>
        <AppointmentDrawer
          appointment={mode === "create" ? undefined : appointment}
          mode={mode}
          isOpen
          onModeChange={onMode}
          onOpenChange={onClose}
          professionals={range.professionals}
          services={range.services}
          selectedDate={range.date}
          selectedUnit="centro"
        />
        <Toaster />
      </SchedulingRepositoryProvider>
    </QueryClientProvider>,
  )
  await screen.findByRole("dialog")
  return { repository, appointment, update, cancel, onClose, onMode }
}
describe("explicit local scheduling adapter regressions", { timeout: 20000 }, () => {
  it.each([
    "edit",
    "reschedule",
  ] as const)("persists %s without resetting authoritative status", async (mode) => {
    const { update, appointment, onClose } = await setup(mode)
    fireEvent.change(screen.getByLabelText("Observações"), {
      target: { value: "Observação revisada" },
    })
    await userEvent.click(
      screen.getByRole("button", {
        name: mode === "edit" ? "Salvar alterações" : "Confirmar remarcação",
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(false))
    expect(update).toHaveBeenCalledWith(
      appointment.id,
      expect.objectContaining({
        notes: "Observação revisada",
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
      }),
    )
  })
  it.each([
    "conflict",
    "network",
  ] as const)("keeps the draft and exposes an actionable %s error", async (failure) => {
    const { onClose } = await setup("edit", failure)
    fireEvent.change(screen.getByLabelText("Observações"), {
      target: { value: "Rascunho preservado" },
    })
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    expect(
      (
        await screen.findAllByText(
          failure === "conflict"
            ? "Conflito de horário."
            : "Não foi possível salvar. Tente novamente.",
        )
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByLabelText("Observações")).toHaveValue("Rascunho preservado")
    expect(onClose).not.toHaveBeenCalled()
  })
  it("requires a cancellation reason and retries a failed cancellation", async () => {
    const { cancel, onClose, appointment } = await setup("cancel", "network")
    expect(screen.getByRole("button", { name: "Cancelar agendamento" })).toBeDisabled()
    await userEvent.click(screen.getByRole("radio", { name: "Barbearia cancelou" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancelar agendamento" }))
    await waitFor(() => expect(cancel).toHaveBeenCalledOnce())
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar agendamento" }))
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(false))
    expect(cancel).toHaveBeenLastCalledWith(appointment.id, "barbershop", undefined, undefined)
  })
  it("returns from cancellation without modifying the appointment", async () => {
    const { onMode, cancel } = await setup("cancel")
    await userEvent.click(screen.getByRole("button", { name: "Manter agendamento" }))
    await waitFor(() => expect(onMode).toHaveBeenCalledWith("view"))
    expect(cancel).not.toHaveBeenCalled()
  })
  it("closes a new draft without persisting a synthetic appointment", async () => {
    const { onClose } = await setup("create")
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }))
    expect(onClose).toHaveBeenCalledWith(false)
  })
})
