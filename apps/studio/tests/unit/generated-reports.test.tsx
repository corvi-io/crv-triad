import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { GeneratedReport, ReportingRepository } from "@/modules/reporting/contracts"
import { GeneratedReports, reportCatalog } from "@/modules/reporting/generated-reports"
import { ReportingRepositoryProvider } from "@/modules/reporting/repository-context"

afterEach(() => vi.restoreAllMocks())

describe("generated reports catalog", () => {
  it("shows all six report choices without history or download actions", async () => {
    renderReports(baseRepository)
    expect(await screen.findAllByRole("button", { name: "Configurar relatório" })).toHaveLength(6)
    for (const item of reportCatalog) expect(screen.getByText(item.title)).toBeInTheDocument()
    expect(screen.queryByText(/histórico/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /baixar/i })).not.toBeInTheDocument()
  })

  it("uses contextual labels and keeps CSV as the only format", async () => {
    renderReports(baseRepository)
    fireEvent.click((await screen.findAllByRole("button", { name: "Configurar relatório" }))[0])
    expect(screen.getByRole("heading", { name: "Configurar relatório" })).toBeVisible()
    expect(screen.queryByText(/etapa 1 de 2/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText("Unidade")).toHaveTextContent("Todas as unidades")
    expect(screen.getByLabelText("Profissional")).toHaveTextContent("Todos os profissionais")
    expect(screen.getByLabelText("Serviço")).toHaveTextContent("Todos os serviços")
    expect(screen.getByLabelText("Forma de pagamento")).toHaveTextContent(
      "Todas as formas de pagamento",
    )
    expect(screen.queryByLabelText("Formato")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Revisar relatório" }))
    expect(await screen.findByRole("heading", { name: "Revisar relatório" })).toBeVisible()
    expect(screen.getByText("CSV")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }))
    expect(screen.getByLabelText("Profissional")).toHaveTextContent("Todos os profissionais")
  })

  it("submits CSV once and confirms email delivery", async () => {
    const createExport = vi.fn(async () => readyReport)
    renderReports({ ...baseRepository, createExport })
    fireEvent.click((await screen.findAllByRole("button", { name: "Configurar relatório" }))[0])
    fireEvent.click(screen.getByRole("button", { name: "Revisar relatório" }))
    const generate = screen.getByRole("button", { name: "Gerar relatório" })
    fireEvent.click(generate)
    fireEvent.click(generate)
    await waitFor(() => expect(createExport).toHaveBeenCalledTimes(1))
    expect(createExport).toHaveBeenCalledWith(
      expect.objectContaining({ format: "csv", reportType: "sales_revenue" }),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("blocks requests without a verified email", async () => {
    renderReports(baseRepository, { maskedEmail: "", verified: false })
    fireEvent.click((await screen.findAllByRole("button", { name: "Configurar relatório" }))[0])
    expect(screen.getByRole("alert")).toHaveTextContent("Confirme um e-mail verificado")
    expect(screen.getByRole("button", { name: "Revisar relatório" })).toBeDisabled()
  })

  it("keeps the review available when report submission fails", async () => {
    const createExport = vi.fn(async () => {
      throw new Error("Falha temporária ao solicitar o relatório.")
    })
    renderReports({ ...baseRepository, createExport })
    fireEvent.click((await screen.findAllByRole("button", { name: "Configurar relatório" }))[0])
    fireEvent.click(screen.getByRole("button", { name: "Revisar relatório" }))
    fireEvent.click(screen.getByRole("button", { name: "Gerar relatório" }))

    await waitFor(() => expect(createExport).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("heading", { name: "Revisar relatório" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Gerar relatório" })).toBeEnabled()
  })

  it("blocks review when the report period is inverted", async () => {
    renderReports(
      baseRepository,
      { maskedEmail: "ma••••@exemplo.com", verified: true },
      { from: "2026-09-08", to: "2026-09-07" },
    )
    fireEvent.click((await screen.findAllByRole("button", { name: "Configurar relatório" }))[0])

    expect(screen.getByRole("alert")).toHaveTextContent(
      "A data final deve ser igual ou posterior à data inicial.",
    )
    expect(screen.getByRole("button", { name: "Revisar relatório" })).toBeDisabled()
  })

  it("preserves selected facet labels in the review", async () => {
    const user = userEvent.setup()
    renderReports(baseRepository)
    await user.click((await screen.findAllByRole("button", { name: "Configurar relatório" }))[0])
    await user.click(screen.getByLabelText("Unidade"))
    await user.click(await screen.findByRole("option", { name: "Centro" }))
    await user.click(screen.getByLabelText("Profissional"))
    await user.click(await screen.findByRole("option", { name: "Ana" }))
    await user.click(screen.getByRole("button", { name: "Revisar relatório" }))

    expect(screen.getByText("Centro", { exact: true })).toBeVisible()
    expect(screen.getByText("Ana", { exact: true })).toBeVisible()
  })
})

const readyReport: GeneratedReport = {
  id: "ready",
  activeAttempt: 1,
  createdAt: "2026-09-07T10:00:00Z",
  emailDeliveryStatus: "pending",
  format: "csv",
  reportType: "sales_revenue",
  status: "queued",
}
const baseRepository: ReportingRepository = {
  createExport: async () => readyReport,
  getReport: async () => {
    throw new Error("unused")
  },
  reset: async () => {},
  retry() {},
  today: () => "2026-09-07",
}

function renderReports(
  repository: ReportingRepository,
  requester: { maskedEmail: string; verified: boolean } = {
    maskedEmail: "ma••••@exemplo.com",
    verified: true,
  },
  filters = { from: "2026-09-01", to: "2026-09-07" },
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const resolvedRepository = {
    getExportCatalog: async () => ({ items: reportCatalog, requester, schemaVersion: 1 as const }),
    ...repository,
  } as ReportingRepository
  return render(
    <GeneratedReports
      facets={{
        paymentMethods: [{ id: "pix", label: "Pix" }],
        professionals: [{ id: "professional-1", label: "Ana" }],
        services: [{ id: "service-1", label: "Corte" }],
        units: [{ id: "unit-1", label: "Centro" }],
      }}
      filters={filters}
    />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          <ReportingRepositoryProvider repository={resolvedRepository}>
            {children}
          </ReportingRepositoryProvider>
        </QueryClientProvider>
      ),
    },
  )
}
