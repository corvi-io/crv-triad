import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ClientAppointmentHistory } from "@/modules/scheduling/client-appointment-history"
import { ProductionAppointmentDrawer } from "@/modules/scheduling/production-appointment-drawer"
import { ProductionAppointmentList } from "@/modules/scheduling/production-appointment-list"
import { ProfessionalSchedule } from "@/modules/scheduling/professional-schedule"
import {
  booking,
  customer,
  httpFixture,
  location,
  offering,
  person,
  renderProduction,
  respond,
} from "../fixtures/production-scheduling"

const props = {
  isOpen: true,
  onOpenChange: vi.fn(),
  onModeChange: vi.fn(),
  professionals: [person],
  services: [offering],
  selectedDate: booking.date,
  selectedUnit: location.id,
}
async function select(label: string, value: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole("dialog").querySelector(`[id="${label}"]`) as HTMLElement)
  await user.click(await screen.findByRole("option", { name: value }))
}
describe("production appointment flows", { timeout: 20000 }, () => {
  it.each([
    "scheduled",
    "confirmed",
    "arrived",
    "waiting",
    "in-progress",
    "completed",
    "canceled",
    "no-show",
  ] as const)("shows authoritative %s snapshots and bounded actor history", async (status) => {
    httpFixture((r) =>
      r.path.startsWith("/api/scheduling/appointments/")
        ? respond({ ...booking, status })
        : undefined,
    )
    renderProduction(
      <ProductionAppointmentDrawer {...props} mode="view" appointment={{ ...booking, status }} />,
    )
    expect(await screen.findByText("Cliente Real", { selector: "dd" })).toBeVisible()
    expect(screen.getByText("R$ 45,00")).toBeVisible()
    expect(await screen.findByText(/Recepção · Criação/)).toBeVisible()
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled()
  })
  it.each([
    ["scheduled", "Confirmar agendamento", "confirm"],
    ["confirmed", "Registrar check-in", "check-in"],
  ] as const)("confirms the %s command before submitting", async (status, label, path) => {
    const requests = httpFixture((r) =>
      r.path.startsWith("/api/scheduling/appointments/")
        ? respond({ ...booking, status })
        : undefined,
    )
    renderProduction(
      <ProductionAppointmentDrawer {...props} mode="view" appointment={{ ...booking, status }} />,
    )
    await userEvent.click(await screen.findByRole("button", { name: label }))
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(0)
    const dialogs = screen.getAllByRole("dialog")
    await userEvent.click(
      within(dialogs.at(-1) as HTMLElement).getByRole("button", { name: "Confirmar" }),
    )
    await waitFor(() =>
      expect(requests.some((r) => r.path.endsWith(`/${path}`) && r.body.version === 1)).toBe(true),
    )
  })

  it.each([
    ["Editar agendamento", "edit"],
    ["Remarcar", "reschedule"],
    ["Cancelar agendamento", "cancel"],
  ])("routes %s to its explicit drawer mode", async (label, mode) => {
    httpFixture()
    const change = vi.fn()
    renderProduction(
      <ProductionAppointmentDrawer
        {...props}
        onModeChange={change}
        mode="view"
        appointment={booking}
      />,
    )
    await userEvent.click(await screen.findByRole("button", { name: label }))
    expect(change).toHaveBeenCalledWith(mode)
  })
  it("submits dedicated rescheduling without changing the service snapshot", async () => {
    const requests = httpFixture()
    renderProduction(
      <ProductionAppointmentDrawer {...props} mode="reschedule" appointment={booking} />,
    )
    await screen.findByRole("dialog")
    await select("appointment-start", "10:00")
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    await waitFor(() => expect(requests.some((r) => r.path.endsWith("/reschedule"))).toBe(true))
    const command = requests.find((r) => r.path.endsWith("/reschedule"))
    expect(command?.body).toMatchObject({ start: "10:00", version: 1, professionalId: person.id })
    expect(command?.body).not.toHaveProperty("priceCents")
  })
  it("paginates event history and retries a failed history page", async () => {
    let failed = true
    const requests = httpFixture((r) =>
      r.path.startsWith(`/api/scheduling/appointments/${booking.id}`)
        ? new URL(`http://test${r.path}`).searchParams.get("page") === "2" && failed
          ? respond({ code: "internal_error" }, 500)
          : respond({
              ...booking,
              events: Array.from({ length: 50 }, (_, i) => ({
                id: `event-${i}`,
                createdAt: "2026-09-01T12:00:00Z",
                actorName: "Recepção",
                action: "reschedule",
                toStatus: "scheduled",
              })),
            })
        : undefined,
    )
    renderProduction(<ProductionAppointmentDrawer {...props} mode="view" appointment={booking} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Próxima" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }))
    expect(await screen.findByText(/Não foi possível carregar o histórico/)).toBeVisible()
    failed = false
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    await waitFor(() => expect(screen.getAllByText(/Remarcação/)).toHaveLength(50))
    await userEvent.click(screen.getByRole("button", { name: "Anterior" }))
    expect(await screen.findByText("Página 1")).toBeVisible()
    expect(requests.some((r) => r.path.includes("page=2"))).toBe(true)
  })
  it("keeps notes through a stale save and requires explicit reload", async () => {
    let stale = true
    const requests = httpFixture((r) =>
      r.method === "PATCH" && stale ? respond({ code: "version_conflict" }, 409) : undefined,
    )
    renderProduction(<ProductionAppointmentDrawer {...props} mode="edit" appointment={booking} />)
    const notes = await screen.findByLabelText("Observações", { exact: true })
    fireEvent.change(notes, { target: { value: "Meu rascunho" } })
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    expect(await screen.findByText(/Este registro foi atualizado/)).toBeVisible()
    expect(notes).toHaveValue("Meu rascunho")
    stale = false
    await userEvent.click(screen.getByRole("button", { name: "Recarregar versão atual" }))
    await waitFor(() => expect(notes).toHaveValue(booking.notes))
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    await waitFor(() => expect(requests.filter((r) => r.method === "PATCH")).toHaveLength(2))
  })
  it("requires a cancellation category and preserves its bounded note", async () => {
    const requests = httpFixture()
    renderProduction(<ProductionAppointmentDrawer {...props} mode="cancel" appointment={booking} />)
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar agendamento" }))
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(0)
    await userEvent.click(screen.getByRole("radio", { name: "Cliente cancelou" }))
    fireEvent.change(screen.getByLabelText("Observações do cancelamento", { exact: true }), {
      target: { value: "Solicitação recebida" },
    })
    await userEvent.click(screen.getByRole("button", { name: "Cancelar agendamento" }))
    await waitFor(() =>
      expect(
        requests.some(
          (r) => r.path.endsWith("/cancel") && r.body.cancellationNote === "Solicitação recebida",
        ),
      ).toBe(true),
    )
  })

  it("preserves the appointment draft across quick-client cancellation, failure and successful retry", async () => {
    let failed = true
    const requests = httpFixture((r) =>
      r.method === "POST" && ["/api/clients", "/api/clients/"].includes(r.path)
        ? failed
          ? respond({ code: "internal_error" }, 500)
          : respond({ ...customer, id: "new-client", name: "Novo Cliente" })
        : r.path === "/api/clients/new-client"
          ? respond({ ...customer, id: "new-client", name: "Novo Cliente" })
          : undefined,
    )
    renderProduction(<ProductionAppointmentDrawer {...props} mode="create" />)
    const notes = await screen.findByLabelText("Observações", { exact: true })
    fireEvent.change(notes, { target: { value: "Preservar acabamento" } })
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar cliente" }))
    let child = await screen.findByRole("dialog", { name: "Clientes / Novo cliente" })
    await userEvent.click(within(child).getAllByRole("button", { name: "Cancelar" })[0])
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Clientes / Novo cliente" }),
      ).not.toBeInTheDocument(),
    )
    expect(notes).toHaveValue("Preservar acabamento")
    expect(
      requests.some(
        (r) => r.method === "POST" && ["/api/clients", "/api/clients/"].includes(r.path),
      ),
    ).toBe(false)
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar cliente" }))
    child = await screen.findByRole("dialog", { name: "Clientes / Novo cliente" })
    fireEvent.change(within(child).getByLabelText("Nome"), { target: { value: "Novo Cliente" } })
    fireEvent.change(within(child).getByLabelText("E-mail"), {
      target: { value: "novo@example.invalid" },
    })
    await userEvent.click(within(child).getByRole("button", { name: "Salvar cliente" }))
    await waitFor(() =>
      expect(
        requests.filter(
          (r) => r.method === "POST" && ["/api/clients", "/api/clients/"].includes(r.path),
        ),
      ).toHaveLength(1),
    )
    expect(within(child).getByLabelText("Nome")).toHaveValue("Novo Cliente")
    failed = false
    await userEvent.click(within(child).getByRole("button", { name: "Salvar cliente" }))
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Clientes / Novo cliente" }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText("Cliente", { exact: true })).toHaveValue("Novo Cliente")
    expect(notes).toHaveValue("Preservar acabamento")
  })
  it.each([
    false,
    true,
  ])("shows canonical preferences without selecting them when lookup fails=%s", async (failed) => {
    httpFixture((request) => {
      if (request.path === `/api/clients/${customer.id}`)
        return respond({
          ...customer,
          preferredServices: [],
          unitPreferences: [location],
          professionalPreferences: [person],
        })
      if (request.path.startsWith("/api/units/options"))
        return failed
          ? respond({ code: "internal_error" }, 500)
          : respond([
              { ...location, status: "archived" },
              { id: "other", name: "Outra", status: "active" },
            ])
      if (request.path.startsWith("/api/professionals/options"))
        return respond([
          { ...person, status: "active" },
          { id: "other", name: "Outro", status: "active" },
        ])
    })
    renderProduction(<ProductionAppointmentDrawer {...props} mode="create" />)
    await screen.findByRole("dialog")
    await select("appointment-client", customer.name)
    if (failed)
      expect(await screen.findByText(/Não foi possível carregar as preferências/)).toBeVisible()
    else {
      expect(await screen.findByText(/Unidade: Unidade Real \(arquivado\)/)).toBeVisible()
      expect(screen.getByText(/Profissional: Pessoa Profissional/)).toBeVisible()
    }
    expect(screen.getByLabelText("Profissional", { exact: true })).toHaveValue("")
  })
  it("retries failed client and service searches without losing the draft", async () => {
    let failed = true
    httpFixture((request) =>
      failed &&
      (request.path.startsWith("/api/clients/?") ||
        request.path.startsWith("/api/scheduling/options"))
        ? respond({ code: "internal_error" }, 500)
        : undefined,
    )
    renderProduction(<ProductionAppointmentDrawer {...props} mode="create" />)
    await screen.findByText(/Não foi possível carregar os clientes/)
    expect(await screen.findByText(/Não foi possível atualizar as opções/)).toBeVisible()
    failed = false
    for (const button of screen.getAllByRole("button", { name: "Tentar novamente" }))
      await userEvent.click(button)
    await waitFor(() =>
      expect(screen.queryByText(/Não foi possível carregar os clientes/)).not.toBeInTheDocument(),
    )
    await select("appointment-client", customer.name)
    expect(screen.getByLabelText("Cliente", { exact: true })).toHaveValue(customer.name)
  })
  it("uses bounded remote searches for large canonical catalogs", async () => {
    const requests = httpFixture()
    renderProduction(<ProductionAppointmentDrawer {...props} mode="create" />)
    fireEvent.change(await screen.findByLabelText("Cliente", { exact: true }), {
      target: { value: "Cliente" },
    })
    fireEvent.change(screen.getByLabelText("Serviço", { exact: true }), {
      target: { value: "Corte" },
    })
    fireEvent.change(screen.getByLabelText("Profissional", { exact: true }), {
      target: { value: "Pessoa" },
    })
    await waitFor(() =>
      expect(requests.some((r) => r.path.includes("Corte") && r.path.includes("Pessoa"))).toBe(
        true,
      ),
    )
    expect(requests.some((r) => r.path.includes("Cliente"))).toBe(true)
    expect(window.location.search).not.toContain("Cliente")
  })
  it("creates from canonical IDs and leaves preferences unselected", async () => {
    const requests = httpFixture((r) =>
      r.path === `/api/clients/${customer.id}`
        ? respond({
            ...customer,
            preferredServices: [offering],
            unitPreferenceIds: [location.id],
            professionalPreferenceIds: [person.id],
          })
        : undefined,
    )
    renderProduction(<ProductionAppointmentDrawer {...props} mode="create" />)
    await screen.findByRole("dialog")
    await userEvent.click(screen.getByRole("button", { name: "Criar agendamento" }))
    expect(await screen.findByText("Selecione um cliente.", { exact: true })).toBeVisible()
    await select("appointment-client", customer.name)
    expect(await screen.findByText(/Sugestões do cliente/)).toHaveTextContent("Serviço: Corte Real")
    expect(screen.getByLabelText("Serviço", { exact: true })).toHaveValue("")
    await select("appointment-service", offering.name)
    await select("appointment-professional", person.name)
    await select("appointment-start", "09:00")
    await userEvent.click(screen.getByRole("button", { name: "Criar agendamento" }))
    await waitFor(() =>
      expect(
        requests.some(
          (r) =>
            r.method === "POST" &&
            r.body.clientId === customer.id &&
            r.body.serviceId === offering.id,
        ),
      ).toBe(true),
    )
  })
})
describe("production consumers", () => {
  it("opens the paginated list row and keeps filters on server requests", async () => {
    const requests = httpFixture(),
      open = vi.fn()
    renderProduction(
      <ProductionAppointmentList
        query={{
          unitId: location.id,
          startDate: booking.date,
          endDate: booking.date,
          search: "private query",
        }}
        onAppointment={open}
      />,
    )
    await userEvent.click(await screen.findByRole("button", { name: customer.name }))
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: booking.id }))
    expect(requests[0].path).toContain("search=private+query")
  })
  it.each([
    "history",
    "professional",
  ])("reads persisted %s and links to canonical Agenda IDs", async (mode) => {
    httpFixture()
    renderProduction(
      mode === "history" ? (
        <ClientAppointmentHistory clientId={customer.id} />
      ) : (
        <ProfessionalSchedule professionalId={person.id} />
      ),
    )
    expect(await screen.findByRole("link", { name: /09:00/ })).toHaveAttribute(
      "href",
      expect.stringContaining(`appointment=${booking.id}`),
    )
  })
  it.each([
    "history",
    "professional",
    "list",
  ])("recovers the %s source without fixtures", async (mode) => {
    let failed = true
    const requests = httpFixture(() =>
      failed ? respond({ code: "internal_error" }, 500) : undefined,
    )
    renderProduction(
      mode === "history" ? (
        <ClientAppointmentHistory clientId={customer.id} />
      ) : mode === "professional" ? (
        <ProfessionalSchedule professionalId={person.id} />
      ) : (
        <ProductionAppointmentList
          query={{ unitId: location.id, startDate: booking.date, endDate: booking.date }}
          onAppointment={vi.fn()}
        />
      ),
    )
    await screen.findByRole("alert")
    failed = false
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
    expect(requests.length).toBeGreaterThan(1)
  })
  it.each([
    "history",
    "professional",
    "list",
  ])("explains an empty %s without invented counters", async (mode) => {
    httpFixture(() =>
      respond(
        mode === "professional"
          ? []
          : {
              items: [],
              nextAppointment: null,
              totalCount: 0,
              totalPages: 1,
              page: 1,
              pageSize: 20,
            },
      ),
    )
    renderProduction(
      mode === "history" ? (
        <ClientAppointmentHistory clientId={customer.id} />
      ) : mode === "professional" ? (
        <ProfessionalSchedule professionalId={person.id} />
      ) : (
        <ProductionAppointmentList
          query={{ unitId: location.id, startDate: booking.date, endDate: booking.date }}
          onAppointment={vi.fn()}
        />
      ),
    )
    expect(await screen.findByText(/Nenhum agendamento/)).toBeVisible()
  })
})
