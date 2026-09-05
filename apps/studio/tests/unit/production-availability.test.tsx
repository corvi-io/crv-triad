import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { ProductionAvailability } from "@/modules/barbershop-setup/production-availability"
import type { BarbershopSetupSearch } from "@/modules/barbershop-setup/search"
import {
  httpFixture,
  location,
  occurrence,
  person,
  renderProduction,
  respond,
  series,
} from "../fixtures/production-scheduling"

const initial: BarbershopSetupSearch = {
  section: "availability",
  scenario: "single-unit",
  availabilityDate: "2026-09-07",
  availabilityView: "day",
  unitId: location.id,
  professionalId: person.id,
}

it("shows all professionals by default and saves a dragged interval for the chosen professional", async () => {
  const other = { ...person, id: "other-professional", name: "Outra profissional" }
  const requests = httpFixture((r) =>
    r.path === "/api/professionals/options"
      ? respond([person, other])
      : r.path.startsWith("/api/availability?")
        ? respond({
            timezone: location.timezone,
            series: [series, { ...series, id: "other-series", professionalId: other.id }],
            archived: [],
            occurrences: [
              occurrence,
              {
                ...occurrence,
                id: "other-occurrence",
                seriesId: "other-series",
                professionalId: other.id,
              },
            ],
          })
        : undefined,
  )
  renderProduction(<Calendar search={{ ...initial, professionalId: undefined }} />)
  expect(
    await screen.findByRole("button", { name: /Disponível.*Outra profissional/ }),
  ).toBeVisible()
  expect(screen.getByRole("button", { name: /Disponível.*Pessoa Profissional/ })).toBeVisible()
  expect(
    requests
      .filter((r) => r.path.startsWith("/api/availability?"))
      .every((r) => !r.path.includes("professionalId=")),
  ).toBe(true)
  const target = screen.getByRole("button", { name: "Selecionar horário em 2026-09-07" })
  target.setPointerCapture = vi.fn()
  target.hasPointerCapture = () => true
  target.releasePointerCapture = vi.fn()
  fireEvent.pointerDown(target, { button: 0, clientY: 864, pointerId: 1 })
  fireEvent.pointerUp(target, { clientY: 960, pointerId: 1 })
  expect(await screen.findByRole("dialog", { name: "Disponibilidade / Novo bloco" })).toBeVisible()
  expect(screen.getByLabelText("Início", { exact: true })).toHaveTextContent("09:00")
  expect(screen.getByLabelText("Término", { exact: true })).toHaveTextContent("10:00")
  await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
  expect(requests.some((r) => r.method === "POST")).toBe(false)
  await userEvent.click(screen.getByLabelText("Profissional", { exact: true }))
  await userEvent.click(await screen.findByRole("option", { name: other.name }))
  await userEvent.click(screen.getByLabelText("Repetição", { exact: true }))
  await userEvent.click(await screen.findByRole("option", { name: "Semanal" }))
  await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
  await waitFor(() =>
    expect(requests.find((r) => r.method === "POST")?.body).toMatchObject({
      professionalId: other.id,
      start: "09:00",
      end: "10:00",
      effectiveUntil: null,
      weekdays: ["monday"],
    }),
  )
})

it("guides the first selection and clears the professional when changing units", async () => {
  httpFixture((r) =>
    r.path === "/api/scheduling/units"
      ? respond([location, { ...location, id: "second-unit", name: "Segunda unidade" }])
      : undefined,
  )
  renderProduction(
    <Calendar search={{ ...initial, unitId: undefined, professionalId: undefined }} />,
  )
  expect(await screen.findByText(/Selecione uma unidade ativa/)).toBeVisible()
  await userEvent.click(screen.getByRole("button", { name: "Unidade" }))
  await userEvent.click(await screen.findByRole("menuitemradio", { name: location.name }))
  expect(await screen.findByRole("region", { name: "Grade de horários" })).toBeVisible()
  await userEvent.click(screen.getByRole("button", { name: "Todos os profissionais" }))
  await userEvent.click(await screen.findByRole("menuitemradio", { name: person.name }))
  expect(await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ })).toBeVisible()
  await userEvent.click(screen.getByRole("button", { name: `Unidade: ${location.name}` }))
  await userEvent.click(await screen.findByRole("menuitemradio", { name: "Segunda unidade" }))
  expect(await screen.findByText(/Vincule um profissional ativo/)).toBeVisible()
  await userEvent.click(screen.getByRole("button", { name: "Unidade: Segunda unidade" }))
  await userEvent.click(await screen.findByRole("menuitem", { name: "Limpar filtro" }))
  expect(await screen.findByText(/Selecione uma unidade ativa/)).toBeVisible()
})

it("changes the displayed period after setup without changing the selected unit", async () => {
  const requests = httpFixture()
  renderProduction(<Calendar />)
  await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ })
  await userEvent.click(screen.getByRole("button", { name: "Semana" }))
  await userEvent.click(screen.getByRole("button", { name: "Período anterior" }))
  await waitFor(() =>
    expect(requests.some((r) => r.path.includes("startDate=2026-08-31"))).toBe(true),
  )
  expect(screen.getByRole("button", { name: `Unidade: ${location.name}` })).toBeVisible()
})
function Calendar({ search = initial }: { search?: BarbershopSetupSearch }) {
  const [value, setValue] = useState(search),
    [create, setCreate] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setCreate(true)}>
        Adicionar bloco de teste
      </button>
      <ProductionAvailability
        search={value}
        onSearchChange={(next) => setValue((current) => ({ ...current, ...next }))}
        createRequest={create}
        onCreateHandled={() => setCreate(false)}
      />
    </>
  )
}
describe("production availability", { timeout: 20000 }, () => {
  it.each([
    "day",
    "week",
    "month",
  ] as const)("projects the bounded %s calendar and navigates without dropping selected IDs", async (availabilityView) => {
    const requests = httpFixture()
    renderProduction(<Calendar search={{ ...initial, availabilityView }} />)
    expect(await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ })).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Próximo período" }))
    expect(
      requests.some(
        (r) =>
          r.path.includes("unitId=unit-real") &&
          r.path.includes("professionalId=professional-real"),
      ),
    ).toBe(true)
  })
  it("shows a read-only rule to members", async () => {
    httpFixture()
    renderProduction(<Calendar />, false)
    await userEvent.click(await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ }))
    expect(
      await screen.findByRole("dialog", {
        name: "Disponibilidade / Visualizar bloco",
      }),
    ).toBeVisible()
    expect(screen.queryByRole("button", { name: "Salvar bloco" })).not.toBeInTheDocument()
    expect(screen.getByLabelText("Início", { exact: true })).toBeDisabled()
  })
  it("keeps weekly values on a stale save and reloads the latest version explicitly", async () => {
    let stale = true
    const requests = httpFixture((r) =>
      r.method === "PATCH" && stale
        ? respond({ code: "version_conflict" }, 409)
        : r.path === `/api/availability/series/${series.id}` && r.method === "GET"
          ? respond({ ...series, version: 2 })
          : undefined,
    )
    renderProduction(<Calendar />)
    await userEvent.click(await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
    expect(await screen.findByText(/Este registro foi atualizado/)).toBeVisible()
    expect(screen.getByLabelText("Início", { exact: true })).toHaveTextContent("09:00")
    stale = false
    await userEvent.click(screen.getByRole("button", { name: "Recarregar versão atual" }))
    await waitFor(() =>
      expect(screen.queryByText(/Este registro foi atualizado/)).not.toBeInTheDocument(),
    )
    await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
    await waitFor(() =>
      expect(requests.some((r) => r.method === "PATCH" && r.body.version === 2)).toBe(true),
    )
  })
  it("asks before archiving an occurrence and sends explicit scope", async () => {
    const requests = httpFixture()
    renderProduction(<Calendar />)
    await userEvent.click(await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ }))
    await userEvent.click(screen.getByRole("button", { name: "Arquivar bloco" }))
    const confirmation = screen.getByRole("dialog", {
      name: "Arquivar disponibilidade?",
    })
    expect(requests.some((r) => r.method === "PATCH")).toBe(false)
    await userEvent.click(within(confirmation).getByRole("button", { name: "Arquivar bloco" }))
    await waitFor(() =>
      expect(requests.some((r) => r.body.archive === true && r.body.scope === "occurrence")).toBe(
        true,
      ),
    )
  })
  it("restores a previously excluded occurrence without recreating its series", async () => {
    const requests = httpFixture((r) =>
      r.path.startsWith("/api/availability?")
        ? respond({
            series: [{ ...series, excludedDates: [initial.availabilityDate] }],
            occurrences: [],
            archived: [],
          })
        : undefined,
    )
    renderProduction(<Calendar />)
    await userEvent.click(await screen.findByRole("button", { name: /Restaurar ocorrência/ }))
    await waitFor(() =>
      expect(
        requests.some((r) => r.body.restore === true && r.body.date === initial.availabilityDate),
      ).toBe(true),
    )
  })
  it("restores an archived series with its current version", async () => {
    const requests = httpFixture((r) =>
      r.path.startsWith("/api/availability?")
        ? respond({ series: [], occurrences: [], archived: [{ ...series, status: "archived" }] })
        : undefined,
    )
    renderProduction(<Calendar />)
    await userEvent.click(await screen.findByRole("button", { name: /Restaurar disponível/ }))
    await userEvent.click(screen.getByRole("button", { name: "Restaurar bloco" }))
    await waitFor(() =>
      expect(requests.some((r) => r.body.restore === true && r.body.scope === "series")).toBe(true),
    )
  })
  it("requires explicit timezone confirmation and preserves selection after a server rejection", async () => {
    let valid = false
    const requests = httpFixture((r) =>
      r.path === "/api/scheduling/units"
        ? respond([{ ...location, timezone: valid ? location.timezone : null }])
        : r.method === "PUT"
          ? valid
            ? respond(location)
            : respond({ code: "invalid_request" }, 400)
          : undefined,
    )
    renderProduction(<Calendar />)
    const input = await screen.findByRole("combobox", { name: "Cidade ou região da unidade" })
    await userEvent.click(input)
    await userEvent.click(await screen.findByRole("option", { name: "Recife" }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar e continuar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Revise os campos")
    expect(input).toHaveTextContent("Recife")
    valid = true
    await userEvent.click(screen.getByRole("button", { name: "Confirmar e continuar" }))
    expect(await screen.findByRole("region", { name: "Grade de horários" })).toBeVisible()
    expect(requests.filter((r) => r.method === "PUT")).toHaveLength(2)
  })
  it("explains the timezone dependency to a member without exposing a mutation", async () => {
    httpFixture((r) =>
      r.path === "/api/scheduling/units" ? respond([{ ...location, timezone: null }]) : undefined,
    )
    renderProduction(<Calendar />, false)
    expect(
      await screen.findByText(/Peça ao responsável pela barbearia para confirmar/),
    ).toBeVisible()
    expect(screen.queryByRole("button", { name: "Confirmar e continuar" })).not.toBeInTheDocument()
  })
  it.each(["units", "people", "projection"])("recovers a failed %s request", async (kind) => {
    let failed = true
    httpFixture((r) =>
      failed &&
      (kind === "units"
        ? r.path === "/api/scheduling/units"
        : kind === "people"
          ? r.path === "/api/professionals/options"
          : r.path.startsWith("/api/availability?"))
        ? respond({ code: "internal_error" }, 500)
        : undefined,
    )
    renderProduction(<Calendar />)
    await screen.findByRole("alert")
    failed = false
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ })).toBeVisible()
  })
  it("explains empty catalog dependencies and does not open a phantom editor", async () => {
    httpFixture((r) => (r.path === "/api/professionals/options" ? respond([]) : undefined))
    renderProduction(<Calendar search={{ ...initial, professionalId: undefined }} />)
    expect(await screen.findByText(/Vincule um profissional ativo/)).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Adicionar bloco de teste" }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
  it("keeps block types visibly distinct", async () => {
    httpFixture((r) =>
      r.path.startsWith("/api/availability?")
        ? respond({
            series: [series],
            archived: [],
            occurrences: ["available", "break", "blocked", "absence"].map((kind) => ({
              ...occurrence,
              kind,
              id: kind,
            })),
          })
        : undefined,
    )
    renderProduction(<Calendar />)
    for (const label of ["Disponível", "Intervalo", "Bloqueio", "Ausência"])
      expect(
        await screen.findByRole("button", { name: new RegExp(`${label} · 09:00–18:00`) }),
      ).toBeVisible()
  })
  it.each([
    "once",
    "weekly",
  ] as const)("creates a canonical %s rule only after valid time selection", async (repeat) => {
    const requests = httpFixture()
    renderProduction(<Calendar />)
    await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ })
    await userEvent.click(screen.getByRole("button", { name: "Adicionar bloco de teste" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
    expect(requests.some((r) => r.method === "POST")).toBe(false)
    expect(await screen.findByText("Selecione o início.", { exact: true })).toBeVisible()
    await userEvent.click(screen.getByLabelText("Início", { exact: true }))
    await userEvent.click(await screen.findByRole("option", { name: "09:00" }))
    await userEvent.click(screen.getByLabelText("Término", { exact: true }))
    await userEvent.click(await screen.findByRole("option", { name: "10:00" }))
    if (repeat === "weekly") {
      await userEvent.click(screen.getByLabelText("Repetição", { exact: true }))
      await userEvent.click(await screen.findByRole("option", { name: "Semanal" }))
      await userEvent.click(screen.getByRole("button", { name: "Seg" }))
      await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
      expect(await screen.findByText("Selecione ao menos um dia.")).toBeVisible()
      await userEvent.click(screen.getByRole("button", { name: "Ter" }))
    }
    await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
    await waitFor(() => expect(requests.some((r) => r.method === "POST")).toBe(true))
    expect(requests.find((r) => r.method === "POST")?.body).toMatchObject({
      unitId: location.id,
      professionalId: person.id,
      start: "09:00",
      end: "10:00",
      weekdays: repeat === "once" ? ["monday"] : ["tuesday"],
      effectiveUntil: repeat === "once" ? "2026-09-07" : null,
    })
  })
  it("rejects reversed hours locally and allows cancelling without mutation", async () => {
    const requests = httpFixture()
    renderProduction(<Calendar />)
    await userEvent.click(await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ }))
    await userEvent.click(screen.getByLabelText("Término", { exact: true }))
    await userEvent.click(await screen.findByRole("option", { name: "08:00" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
    expect(await screen.findByText("O término deve ser posterior ao início.")).toBeVisible()
    expect(requests.some((r) => r.method === "PATCH")).toBe(false)
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })
  it("retains a whole-series draft and retries after a rejected command", async () => {
    let failed = true
    const requests = httpFixture((r) =>
      r.method === "PATCH" && failed ? respond({ code: "availability_conflict" }, 409) : undefined,
    )
    renderProduction(<Calendar />)
    await userEvent.click(await screen.findByRole("button", { name: /Disponível · 09:00–18:00/ }))
    await userEvent.click(screen.getByLabelText("Aplicar alteração em", { exact: true }))
    await userEvent.click(await screen.findByRole("option", { name: "Toda a série" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
    expect(await screen.findByRole("alert")).toBeVisible()
    expect(screen.getByLabelText("Início", { exact: true })).toHaveTextContent("09:00")
    failed = false
    await userEvent.click(screen.getByRole("button", { name: "Salvar bloco" }))
    await waitFor(() => expect(requests.filter((r) => r.method === "PATCH")).toHaveLength(2))
    expect(
      requests.filter((r) => r.method === "PATCH").every((r) => r.body.scope === "series"),
    ).toBe(true)
  })
})
