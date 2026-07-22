import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"
import type { BarbershopSetupSearch } from "@/modules/barbershop-setup/search"
import { validateBarbershopSetupSearch } from "@/modules/barbershop-setup/search"
import { BarbershopSetupPage } from "@/modules/barbershop-setup/setup-page"

describe("barbershop setup presentation", () => {
  it("accepts only stable scenario and section identifiers in URL state", () => {
    expect(validateBarbershopSetupSearch({ scenario: "multi-unit", section: "services" })).toEqual({
      scenario: "multi-unit",
      section: "services",
    })
    expect(
      validateBarbershopSetupSearch({
        scenario: "Nome da pessoa",
        section: "Rua com dados privados",
        phone: "81999999999",
      }),
    ).toEqual({ scenario: "single-unit", section: "overview" })
  })

  it("renders overview actions and switches all stable sections", async () => {
    const user = userEvent.setup()
    renderSetup("single-unit")
    expect(
      await screen.findByRole("heading", { name: "Visão geral da configuração" }),
    ).toBeVisible()
    expect(screen.getByText(/4 de 4 etapas visuais completas/)).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Serviços" }))
    expect(await screen.findByRole("table", { name: "Serviços da configuração" })).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Disponibilidade" }))
    expect(await screen.findByRole("heading", { name: "Disponibilidade semanal" })).toBeVisible()
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
})

function renderSetup(
  scenario: "new-business" | "single-unit",
  section: "availability" | "overview" | "services" | "units" = "overview",
) {
  const repository = new BarbershopSetupMemoryRepository()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Harness() {
    const [search, setSearch] = useState<BarbershopSetupSearch>({ scenario, section })
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
