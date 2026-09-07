import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type ReactNode, StrictMode, useState } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { createReportingRepository } from "@/dev/reporting/entry"
import type { ReportingFacets, ReportingScenarioId } from "@/modules/reporting/contracts"
import type { ReportSearch } from "@/modules/reporting/filters"
import { ReportFiltersBar } from "@/modules/reporting/report-filters"
import { ReportingPage } from "@/modules/reporting/reporting-page"
import { ReportingRepositoryProvider } from "@/modules/reporting/repository-context"

const repository = createReportingRepository()
const filters = { from: "2026-07-01", to: "2026-07-31" }

describe("ReportingPage", () => {
  beforeEach(async () => {
    await repository.reset()
  })

  it("renders the report catalog without analytics or global filters", async () => {
    renderReport("typical")
    expect(await screen.findByRole("heading", { name: "Escolha um relatório" })).toBeVisible()
    expect(screen.getAllByRole("button", { name: "Configurar relatório" })).toHaveLength(6)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Hoje" })).not.toBeInTheDocument()
  })

  it("shows a recoverable error when the catalog data query fails", async () => {
    renderReport("next-failure")
    expect(await screen.findByText("Não foi possível carregar os relatórios")).toBeVisible()
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled()
    expect(screen.queryByRole("heading", { name: "Escolha um relatório" })).not.toBeInTheDocument()
  })

  it("opens Personalizado from a preset without changing the canonical range", async () => {
    const user = userEvent.setup()
    render(<FilterHarness />)

    expect(screen.queryByLabelText("Data inicial")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Personalizado" }))
    expect(screen.getByLabelText("Data inicial")).toHaveTextContent("01/07/2026")
    expect(screen.getByLabelText("Data final")).toHaveTextContent("31/07/2026")
    expect(screen.getByText("Período inclusivo de 01/07/2026 a 31/07/2026.")).toBeInTheDocument()
  })
})

const emptyFacets: ReportingFacets = {
  paymentMethods: [],
  professionals: [],
  services: [],
  units: [],
}

function FilterHarness() {
  const [search, setSearch] = useState<ReportSearch>({
    from: "2026-07-01",
    scenario: "typical",
    to: "2026-07-31",
  })
  return (
    <ReportFiltersBar
      facets={emptyFacets}
      search={search}
      sourceDate="2026-07-24"
      onChange={(next) => setSearch((current) => ({ ...current, ...next }))}
    />
  )
}

function renderReport(scenarioId: ReportingScenarioId) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <StrictMode>
        <ReportingRepositoryProvider repository={repository}>
          <ReportingPage query={{ filters, scenarioId }} />
        </ReportingRepositoryProvider>
      </StrictMode>
    </QueryClientProvider>,
    { wrapper: ({ children }: { children: ReactNode }) => children },
  )
}
