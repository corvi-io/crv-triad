import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type ReactNode, StrictMode } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { createReportingRepository } from "@/dev/reporting/entry"
import type { ReportingScenarioId } from "@/modules/reporting/contracts"
import { ReportingPage } from "@/modules/reporting/reporting-page"
import { ReportingRepositoryProvider } from "@/modules/reporting/repository-context"

const repository = createReportingRepository()
const filters = { from: "2026-07-01", to: "2026-07-31" }

describe("ReportingPage", () => {
  beforeEach(async () => {
    await repository.reset()
  })

  it("renders all seven truthful reports with textual and table equivalents", async () => {
    renderReport("typical")

    expect(await screen.findByText("Faturamento por período")).toBeInTheDocument()
    for (const title of [
      "Atendimentos por profissional",
      "Serviços mais vendidos",
      "Ticket médio",
      "Comissões por profissional",
      "Cancelamentos e ausências",
      "Clientes novos e recorrentes",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.getByText(/Denominador:/)).toBeInTheDocument()
    expect(screen.getByText(/sem chave estável ficam fora das proporções/)).toBeInTheDocument()
    expect(screen.getAllByRole("table").length).toBeGreaterThanOrEqual(6)
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(5)
  })

  it("keeps labels stable and recovers from the deterministic fail-next state", async () => {
    const user = userEvent.setup()
    renderReport("next-failure")

    expect(await screen.findByText("Não foi possível carregar os relatórios")).toBeInTheDocument()
    const retry = screen.getByRole("button", { name: "Tentar novamente" })
    await user.click(retry)
    await waitFor(() => expect(screen.getByText("Faturamento por período")).toBeInTheDocument())
  })
})

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
