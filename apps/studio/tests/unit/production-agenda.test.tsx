import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { type ScheduleSearch, validateScheduleSearch } from "@/modules/scheduling/agenda"
import { validateDashboardSearch } from "@/modules/scheduling/dashboard-search"
import { ProductionAgenda } from "@/modules/scheduling/production-agenda"
import { ProductionAppointmentList } from "@/modules/scheduling/production-appointment-list"
import { ProductionDashboard } from "@/modules/scheduling/production-dashboard"
import {
  booking,
  customer,
  httpFixture,
  location,
  range,
  renderProduction,
  respond,
} from "../fixtures/production-scheduling"

const initial = validateScheduleSearch(
  { unit: location.id, date: booking.date, view: "list" },
  booking.date,
)
function Agenda({ search = initial }: { search?: ScheduleSearch }) {
  const [value, setValue] = useState(search)
  return (
    <ProductionAgenda
      search={value}
      onSearchChange={(next) => setValue((current) => ({ ...current, ...next }))}
    />
  )
}
function Dashboard() {
  const [value, setValue] = useState(
    validateDashboardSearch({ unitId: location.id, date: booking.date }, booking.date),
  )
  return (
    <ProductionDashboard
      search={value}
      onSearchChange={(next) => setValue((current) => ({ ...current, ...next }))}
    />
  )
}
describe("production Agenda and Dashboard", { timeout: 20000 }, () => {
  it.each([
    "agenda",
    "dashboard",
  ])("shows real %s data and opens the canonical drawer", async (surface) => {
    httpFixture()
    renderProduction(surface === "agenda" ? <Agenda /> : <Dashboard />)
    await userEvent.click(await screen.findByRole("button", { name: customer.name }))
    expect(await screen.findByRole("dialog")).toHaveTextContent(customer.name)
    await userEvent.click(
      within(screen.getByRole("dialog"))
        .getByRole("button", { name: "Fechar" })
        .closest("button") as HTMLElement,
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole("button", { name: "Novo agendamento" }))
    expect(await screen.findByRole("dialog")).toHaveTextContent("Novo agendamento")
  })
  it.each(["agenda", "dashboard"])("fails closed and retries the %s source", async (surface) => {
    let failed = true
    httpFixture((r) =>
      failed && r.path === "/api/scheduling/units"
        ? respond({ code: "internal_error" }, 500)
        : undefined,
    )
    renderProduction(surface === "agenda" ? <Agenda /> : <Dashboard />)
    await screen.findByRole("alert")
    failed = false
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(await screen.findByRole("button", { name: customer.name })).toBeVisible()
  })
  it.each(["agenda", "dashboard"])("explains missing timezone in %s", async (surface) => {
    httpFixture((r) =>
      r.path === "/api/scheduling/units" ? respond([{ ...location, timezone: null }]) : undefined,
    )
    renderProduction(surface === "agenda" ? <Agenda /> : <Dashboard />)
    expect(await screen.findByText(/fuso horário/i)).toBeVisible()
    expect(screen.queryByRole("button", { name: "Novo agendamento" })).not.toBeInTheDocument()
  })
  it.each(["agenda", "dashboard"])("requires a unit before querying %s", async (surface) => {
    const requests = httpFixture((r) =>
      r.path === "/api/scheduling/units" ? respond([]) : undefined,
    )
    renderProduction(surface === "agenda" ? <Agenda /> : <Dashboard />)
    await waitFor(() =>
      expect(screen.queryByRole("status", { name: /Carregando/ })).not.toBeInTheDocument(),
    )
    expect(requests.some((r) => r.path.startsWith("/api/scheduling/range"))).toBe(false)
  })
  it("uses a paginated list for month periods instead of exceeding the board range", async () => {
    const requests = httpFixture()
    renderProduction(<Agenda search={{ ...initial, period: "this-month", view: "board" }} />)
    expect(await screen.findByRole("table", { name: "Agendamentos" })).toBeVisible()
    expect(
      requests
        .filter((r) => r.path.startsWith("/api/scheduling/range"))
        .every(
          (r) =>
            Date.parse(new URL(`http://test${r.path}`).searchParams.get("endDate") ?? "") -
              Date.parse(new URL(`http://test${r.path}`).searchParams.get("startDate") ?? "") <
            7 * 86400000,
        ),
    ).toBe(true)
  })
  it("resets a controlled list page when searching", async () => {
    const requests = httpFixture()
    renderProduction(<Agenda search={{ ...initial, page: 5 }} />)
    await screen.findByRole("table", { name: "Agendamentos" })
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar na agenda" }), "Pessoa")
    await waitFor(() =>
      expect(
        requests.some((r) => {
          const url = new URL(r.path, "http://test")
          return (
            url.pathname === "/api/scheduling/appointments" &&
            url.searchParams.get("search") === "Pessoa" &&
            url.searchParams.get("page") === "1"
          )
        }),
      ).toBe(true),
    )
  })
  it("hydrates client filters beyond the first day of a custom list period", async () => {
    httpFixture((r) => {
      if (!r.path.startsWith("/api/scheduling/range")) return undefined
      const first = new URL(r.path, "http://test").searchParams.get("startDate") === "2026-09-07"
      return respond({
        ...range,
        appointments: first
          ? []
          : [
              {
                ...booking,
                id: "later",
                date: "2026-09-08",
                customerName: "Cliente do segundo dia",
              },
            ],
      })
    })
    renderProduction(
      <Agenda
        search={{
          ...initial,
          period: "custom",
          customStart: "2026-09-07",
          customEnd: "2026-09-08",
        }}
      />,
    )
    await screen.findByRole("table", { name: "Agendamentos" })
    await userEvent.click(screen.getByRole("button", { name: "Cliente" }))
    expect(await screen.findByText("Cliente do segundo dia")).toBeVisible()
  })
  it("renders a day board and a week board using server availability", async () => {
    httpFixture()
    renderProduction(<Agenda search={{ ...initial, view: "board" }} />)
    expect(await screen.findByRole("table", { name: /Horários em linhas/ })).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Semana" }))
    await waitFor(() =>
      expect(screen.queryByRole("table", { name: /Horários em linhas/ })).not.toBeInTheDocument(),
    )
  })
  it("restores a drawer by an opaque URL ID even when its row is filtered out", async () => {
    httpFixture((r) =>
      r.path.startsWith("/api/scheduling/range")
        ? respond({ ...range, appointments: [] })
        : undefined,
    )
    renderProduction(<Agenda search={{ ...initial, appointment: booking.id, mode: "edit" }} />)
    expect(await screen.findByRole("dialog")).toHaveTextContent("Editar agendamento")
  })
  it("rejects a stale direct link without clearing the visible list", async () => {
    httpFixture((r) =>
      r.path === "/api/scheduling/appointments/foreign"
        ? respond({ code: "not_found" }, 404)
        : undefined,
    )
    renderProduction(<Agenda search={{ ...initial, appointment: "foreign", mode: "view" }} />)
    expect(await screen.findByRole("button", { name: customer.name })).toBeVisible()
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })
  it("supports keyboard/context-menu row actions and server pagination/sort", async () => {
    const requests = httpFixture((r) =>
        r.path.startsWith("/api/scheduling/appointments?")
          ? respond({
              items: [booking],
              page: new URL(`http://test${r.path}`).searchParams.get("page") === "2" ? 2 : 1,
              pageSize: 20,
              totalCount: 40,
              totalPages: 2,
            })
          : undefined,
      ),
      open = vi.fn()
    renderProduction(
      <ProductionAppointmentList
        query={{ unitId: location.id, startDate: booking.date, endDate: booking.date }}
        onAppointment={open}
      />,
    )
    const row = (await screen.findByRole("button", { name: customer.name })).closest(
      "tr",
    ) as HTMLElement
    fireEvent.keyDown(row, { key: "Enter" })
    expect(open).toHaveBeenCalledTimes(1)
    fireEvent.contextMenu(row, { clientX: 10, clientY: 20 })
    await userEvent.click(await screen.findByRole("menuitem", { name: "Visualizar" }))
    expect(open).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(row, { key: "F10", shiftKey: true })
    await userEvent.click(await screen.findByRole("menuitem", { name: "Visualizar" }))
    expect(open).toHaveBeenCalledTimes(3)
    fireEvent.doubleClick(row)
    expect(open).toHaveBeenCalledTimes(4)
    await userEvent.click(screen.getByRole("button", { name: /Data e horário/ }))
    await waitFor(() =>
      expect(requests.some((r) => r.path.includes("sortDirection=desc"))).toBe(true),
    )
    await userEvent.click(screen.getByRole("button", { name: "Ir para próxima página" }))
    await waitFor(() => expect(requests.some((r) => r.path.includes("page=2"))).toBe(true))
  })
  it.each([
    false,
    true,
  ])("reschedules a weekly card through HTTP and restores after conflict=%s", async (conflict) => {
    const requests = httpFixture((r) =>
      conflict && r.path.endsWith("/reschedule")
        ? respond({ code: "appointment_conflict" }, 409)
        : undefined,
    )
    renderProduction(
      <Agenda search={{ ...initial, view: "board", scope: "week", period: "this-week" }} />,
    )
    const slot = await screen.findByRole("button", {
      name: "Criar agendamento em 07/09/2026 às 10:00",
    })
    const target = slot.closest("fieldset")
    if (!target) throw new Error("Missing weekly target")
    fireEvent.dragOver(target)
    fireEvent.drop(target, { dataTransfer: { getData: () => booking.id } })
    await waitFor(() => expect(requests.some((r) => r.path.endsWith("/reschedule"))).toBe(true))
    if (conflict) expect(await screen.findByText(/O agendamento foi restaurado/)).toBeVisible()
    else expect(await screen.findByText(/O status não foi alterado/)).toBeVisible()
  })
  it("loads a month through bounded dashboard requests and keeps missing integrations explicit", async () => {
    const requests = httpFixture()
    renderProduction(
      <ProductionDashboard
        search={validateDashboardSearch(
          { unitId: location.id, date: booking.date, period: "this-month" },
          booking.date,
        )}
        onSearchChange={() => {}}
      />,
    )
    await screen.findByText("Financeiro operacional")
    expect(screen.getAllByText("Ainda não integrado").length).toBeGreaterThan(3)
    const chunks = requests
      .filter((request) => request.path.startsWith("/api/scheduling/range"))
      .map((request) => new URL(request.path, "http://localhost").searchParams)
    expect(chunks).toHaveLength(5)
    expect(
      chunks.every(
        (params) =>
          Date.parse(params.get("endDate") ?? "") - Date.parse(params.get("startDate") ?? "") <=
          6 * 86400000,
      ),
    ).toBe(true)
  })
  it("recovers the Dashboard after a range failure without showing fabricated metrics", async () => {
    let failed = true
    httpFixture((request) =>
      failed && request.path.startsWith("/api/scheduling/range")
        ? respond({ code: "internal_error" }, 500)
        : undefined,
    )
    renderProduction(<Dashboard />)
    await screen.findByRole("alert")
    expect(screen.queryByText("Financeiro operacional")).not.toBeInTheDocument()
    failed = false
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(await screen.findByText("Financeiro operacional")).toBeVisible()
  })
  it("opens creation from a free weekly slot", async () => {
    httpFixture()
    renderProduction(
      <Agenda search={{ ...initial, view: "board", scope: "week", period: "this-week" }} />,
    )
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Criar agendamento em 07/09/2026 às 10:00",
      }),
    )
    expect(await screen.findByRole("dialog")).toHaveTextContent("Novo agendamento")
    expect(screen.getByLabelText("Data", { exact: true })).toHaveTextContent("07/09/2026")
  })
  it("opens the production drawer from a day-board status action", async () => {
    httpFixture()
    renderProduction(<Agenda search={{ ...initial, view: "board" }} />)
    await userEvent.click(await screen.findByRole("button", { name: `Ações de ${customer.name}` }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Alterar status" }))
    expect(await screen.findByRole("dialog")).toHaveTextContent("Confirmar agendamento")
    expect(screen.queryByRole("dialog", { name: "Alterar status" })).not.toBeInTheDocument()
  })
})
