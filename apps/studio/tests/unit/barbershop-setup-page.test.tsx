import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { resolveBarbershopSetupScenario } from "@/dev/barbershop-setup/entry"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import type { SetupScenarioId, SetupSection } from "@/modules/barbershop-setup/contracts"
import { serviceFormSchema, unitFormSchema } from "@/modules/barbershop-setup/entity-drawer"
import { barbershopSetupQueryKeys } from "@/modules/barbershop-setup/queries"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"
import type { BarbershopSetupSearch } from "@/modules/barbershop-setup/search"
import { validateBarbershopSetupSearch } from "@/modules/barbershop-setup/search"
import { BarbershopSetupPage } from "@/modules/barbershop-setup/setup-page"

describe("barbershop setup module", () => {
  it("accepts only stable scenario and section identifiers in URL state", () => {
    expect(
      validateBarbershopSetupSearch(
        {
          availabilityDate: "2028-12-25",
          availabilityView: "month",
          scenario: "multi-unit",
          section: "services",
        },
        resolveBarbershopSetupScenario,
      ),
    ).toEqual({
      availabilityDate: "2028-12-25",
      availabilityView: "month",
      scenario: "multi-unit",
      section: "services",
    })
    expect(
      validateBarbershopSetupSearch(
        {
          scenario: "Nome da pessoa",
          section: "Rua com dados privados",
          availabilityDate: "2026-02-31",
          availabilityView: "agenda",
          phone: "81999999999",
        },
        resolveBarbershopSetupScenario,
      ),
    ).toEqual({
      availabilityDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      availabilityView: "week",
      scenario: "single-unit",
      section: "overview",
    })
  })

  it("renders overview actions and switches all stable sections", async () => {
    const user = userEvent.setup()
    renderSetup("single-unit")
    expect(
      await screen.findByRole("heading", { name: "Prepare a barbearia para operar" }),
    ).toBeVisible()
    expect(
      screen.getByRole("progressbar", { name: "100% da configuração concluída" }),
    ).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Serviços" }))
    expect(await screen.findByRole("table", { name: "Serviços da configuração" })).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Disponibilidade" }))
    expect(
      await screen.findByRole("heading", { name: "Calendário de disponibilidade" }),
    ).toBeVisible()
  })

  it("shows field errors in Portuguese and focuses the first invalid field", async () => {
    const user = userEvent.setup()
    renderSetup("new-business", "units")
    await user.click(await screen.findByRole("button", { name: "Nova unidade" }))
    await user.click(await screen.findByRole("button", { name: "Salvar" }))
    const name = screen.getByLabelText(/Nome/)
    expect(await screen.findByText("Informe um nome com pelo menos 2 caracteres.")).toBeVisible()
    expect(name).toHaveAttribute("aria-invalid", "true")
    expect(name).toHaveFocus()
  })

  it("uses filtered availability keys and hides conflicts outside the visible relationship", async () => {
    expect(
      barbershopSetupQueryKeys.availability({
        professionalId: "professional-bravo",
        scenarioId: "availability-conflicts",
        unitId: "unit-center",
      }),
    ).not.toEqual(barbershopSetupQueryKeys.availability({ scenarioId: "availability-conflicts" }))

    const user = userEvent.setup()
    renderSetup("availability-conflicts", "availability")
    expect(await screen.findByRole("alert")).toHaveTextContent("períodos de trabalho sobrepostos")
    await user.click(screen.getByLabelText("Profissional"))
    await user.click(await screen.findByRole("option", { name: "Profissional Bravo" }))
    expect(
      await screen.findByRole("button", {
        name: /Disponível, Segunda-feira, 20 de julho de 2026, das 09:00 às 18:00/,
      }),
    ).toBeVisible()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("uses the compact catalog toolbar and menu-based state filter", async () => {
    const user = userEvent.setup()
    renderSetup("single-unit", "services")
    const search = await screen.findByRole("searchbox", { name: "Buscar serviços" })
    await user.type(search, "Barba")
    expect(await screen.findByText("Barba completa")).toBeVisible()
    expect(screen.queryByText("Corte clássico")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Filtrar por estado" }))
    await user.click(await screen.findByRole("menuitemradio", { name: "Arquivados" }))
    expect(await screen.findByText("Nenhum resultado para os filtros")).toBeVisible()
  })

  it("opens the same availability editor through the keyboard alternative", async () => {
    const user = userEvent.setup()
    renderSetup("single-unit", "availability")
    const sunday = await screen.findByRole("button", {
      name: /Adicionar período em Domingo, 26 de julho de 2026/,
    })
    sunday.focus()
    await user.keyboard("{Enter}")
    expect(
      await screen.findByRole("dialog", { name: "Disponibilidade / Novo bloco" }),
    ).toBeVisible()
    expect(screen.getByLabelText("Início")).toHaveValue("09:00")
    expect(screen.getByLabelText("Fim")).toHaveValue("10:00")
  })

  it("creates the first availability block after a professional gains a unit", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    await repository.selectScenario("incomplete-setup")
    const professional = (
      await repository.list({
        kind: "professional",
        page: 1,
        pageSize: 10,
        scenarioId: "incomplete-setup",
        search: "",
        sort: { direction: "asc", field: "name" },
        status: "all",
      })
    ).items[0]
    expect(professional?.kind).toBe("professional")
    if (professional?.kind !== "professional") return
    await repository.update("professional", professional.id, {
      accountAccess: professional.accountAccess,
      name: professional.name,
      role: professional.role,
      serviceIds: [],
      unitIds: ["unit-center"],
    })

    const user = userEvent.setup()
    renderSetup("incomplete-setup", "availability", repository)
    await user.click(await screen.findByRole("button", { name: "Adicionar bloco" }))
    await user.click(
      await screen.findByRole("button", {
        name: "Salvar bloco",
      }),
    )
    expect(
      await screen.findByRole("button", {
        name: /Disponível, Segunda-feira, 20 de julho de 2026, das 09:00 às 10:00/,
      }),
    ).toBeVisible()
    await expect(
      repository.getAvailability({
        professionalId: professional.id,
        scenarioId: "incomplete-setup",
        unitId: "unit-center",
      }),
    ).resolves.toMatchObject({ records: [expect.objectContaining({ day: "monday" })] })
  })

  it("returns explicit Portuguese errors for empty numeric service fields", () => {
    const result = serviceFormSchema.safeParse({
      category: "Cabelo",
      description: "Descrição sintética válida",
      durationMinutes: Number.NaN,
      kind: "service",
      name: "Serviço válido",
      price: Number.NaN,
      professionalIds: ["professional-alpha"],
      unitIds: ["unit-center"],
    })
    expect(result.error?.issues.map(({ message }) => message)).toEqual([
      "Informe a duração em minutos.",
      "Informe o preço do serviço.",
    ])
  })

  it("validates unit opening hours as one composed period", () => {
    const result = unitFormSchema.safeParse({
      address: "Rua válida, 10",
      businessHours: { days: ["monday"], start: "18:00", end: "09:00" },
      code: "CTR",
      kind: "unit",
      name: "Unidade válida",
    })
    expect(result.error?.issues.map(({ message }) => message)).toContain(
      "O término deve ser posterior ao início.",
    )
  })
})

function renderSetup(
  scenario: SetupScenarioId,
  section: SetupSection = "overview",
  repository = new BarbershopSetupMemoryRepository(),
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Harness() {
    const [search, setSearch] = useState<BarbershopSetupSearch>({
      availabilityDate: "2026-07-20",
      availabilityView: "week",
      scenario,
      section,
    })
    return (
      <QueryClientProvider client={queryClient}>
        <BarbershopSetupRepositoryProvider repository={repository}>
          <BarbershopSetupPage
            search={search}
            onSearchChange={(next) => setSearch((previous) => ({ ...previous, ...next }))}
          />
        </BarbershopSetupRepositoryProvider>
      </QueryClientProvider>
    )
  }
  return render(<Harness />)
}
