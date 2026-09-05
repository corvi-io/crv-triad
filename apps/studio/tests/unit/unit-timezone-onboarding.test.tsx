import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"
import { UnitTimezoneOnboarding } from "@/modules/barbershop-setup/unit-timezone-onboarding"

function deviceTimezone(timeZone: string) {
  const original = Intl.DateTimeFormat().resolvedOptions()
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...original,
    timeZone,
  })
}

it("requires a city when the device timezone is outside Brazil", async () => {
  deviceTimezone("Europe/London")
  const confirm = vi.fn()
  render(<UnitTimezoneOnboarding unitName="Centro" canManage onConfirm={confirm} />)
  await userEvent.click(screen.getByRole("button", { name: "Confirmar e continuar" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("Escolha a cidade ou região")
  expect(confirm).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole("combobox"))
  await userEvent.click(await screen.findByRole("option", { name: "Manaus" }))
  await userEvent.click(screen.getByRole("button", { name: "Confirmar e continuar" }))
  expect(confirm).toHaveBeenCalledWith("America/Manaus")
})

it("suggests the device region but only saves after explicit confirmation", async () => {
  deviceTimezone("America/Recife")
  const confirm = vi.fn()
  render(<UnitTimezoneOnboarding unitName="Centro" canManage onConfirm={confirm} />)
  expect(screen.getByRole("combobox")).toHaveTextContent("Recife")
  expect(screen.getByText(/Sugerimos o horário deste dispositivo/)).toBeVisible()
  expect(confirm).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole("button", { name: "Confirmar e continuar" }))
  expect(confirm).toHaveBeenCalledWith("America/Recife")
})
