import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { GeneratedReport, ReportingRepository } from "@/modules/reporting/contracts"
import { GeneratedReports, reportCatalog } from "@/modules/reporting/generated-reports"
import { ReportingRepositoryProvider } from "@/modules/reporting/repository-context"

afterEach(() => vi.restoreAllMocks())

describe("generated reports", () => {
  it("keeps all six catalog choices visible when the history is empty", async () => {
    renderReports({ ...baseRepository, listExports: async () => [] })

    expect(await screen.findAllByRole("button", { name: "Configurar relatório" })).toHaveLength(6)
    for (const item of reportCatalog) expect(screen.getByText(item.title)).toBeInTheDocument()
    expect(await screen.findByText(/Nenhum relatório foi solicitado ainda/)).toBeInTheDocument()
  })

  it("keeps the draft on Back and makes verified email delivery mandatory", async () => {
    renderReports({
      ...baseRepository,
      listExports: async () => [],
      createExport: async () => reports[2],
    })
    fireEvent.click((await screen.findAllByRole("button", { name: "Configurar relatório" }))[1])
    expect(screen.getByText("O link seguro será enviado para ma••••@exemplo.com.")).toBeVisible()
    expect(screen.getByLabelText("Profissional")).toBeVisible()
    expect(screen.getByLabelText("Serviço")).toBeVisible()
    expect(screen.queryByLabelText("Forma de pagamento")).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Formato"))
    const csv = screen.getByRole("option", { hidden: true, name: "CSV" })
    fireEvent.pointerDown(csv, { buttons: 1, pointerType: "mouse" })
    fireEvent.click(csv, { detail: 1 })
    fireEvent.click(screen.getByRole("button", { name: "Revisar relatório" }))
    expect(await screen.findByText("CSV")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }))
    expect(screen.getByLabelText("Formato")).toHaveTextContent("csv")
  })

  it("cancels without submitting and prevents duplicate confirmation", async () => {
    let resolveCreate: ((report: GeneratedReport) => void) | undefined
    const createExport = vi.fn(
      () => new Promise<GeneratedReport>((resolve) => (resolveCreate = resolve)),
    )
    renderReports({ ...baseRepository, listExports: async () => [], createExport })
    fireEvent.click((await screen.findAllByRole("button", { name: "Configurar relatório" }))[0])
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(createExport).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole("button", { name: "Configurar relatório" })[0])
    fireEvent.click(screen.getByRole("button", { name: "Revisar relatório" }))
    const confirm = screen.getByRole("button", { name: "Confirmar geração" })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    await waitFor(() => expect(createExport).toHaveBeenCalledTimes(1))
    resolveCreate?.(reports[2])
  })

  it("creates a selected format and retries failed or expired rows", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    const createExport = vi.fn(async () => reports[0])
    const retryExport = vi.fn(async () => reports[1])
    renderReports({
      ...baseRepository,
      createExport,
      retryExport,
      listExports: async () => reports,
    })
    expect(await screen.findByText(/Geração: Falhou.*tentativa 1/)).toBeInTheDocument()
    expect(screen.getByText(/Geração: Arquivo expirado.*tentativa 2/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "Configurar relatório" })[0])
    fireEvent.click(screen.getByRole("button", { name: "Revisar relatório" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirmar geração" }))
    await waitFor(() =>
      expect(createExport).toHaveBeenCalledWith(
        expect.objectContaining({
          format: "pdf",
          reportType: "sales_revenue",
        }),
      ),
    )
    const retries = screen.getAllByRole("button", { name: "Tentar novamente" })
    fireEvent.click(retries[0])
    await waitFor(() => expect(retryExport).toHaveBeenCalledWith("failed"))
  })

  it("retries only actionable email delivery while keeping the artifact downloadable", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    const retryExportDelivery = vi.fn(async () => ({
      ...reports[2],
      emailDeliveryStatus: "pending" as const,
    }))
    renderReports({
      ...baseRepository,
      listExports: async () => [reports[2]],
      retryExportDelivery,
      downloadExport: async () => "https://private.invalid/object",
    })
    expect(await screen.findByRole("button", { name: "Baixar" })).toBeEnabled()
    fireEvent.click(screen.getByRole("button", { name: "Reenviar e-mail" }))
    await waitFor(() => expect(retryExportDelivery).toHaveBeenCalledWith("ready"))
  })

  it("does not poll terminal legacy delivery marked not applicable", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
    const listExports = vi.fn(async () => [
      { ...reports[2], emailDeliveryStatus: "not_applicable" as const },
    ])
    renderReports({ ...baseRepository, listExports })

    expect(await screen.findByText(/E-mail não aplicável/)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 3_200))
    expect(listExports).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("button", { name: "Reenviar e-mail" })).not.toBeInTheDocument()
  }, 10_000)

  it("polls delivery only after generation is ready", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
    const listExports = vi.fn(async () => [
      { ...reports[0], emailDeliveryStatus: "pending" as const },
    ])
    const view = renderReports({ ...baseRepository, listExports })
    expect(await screen.findByText(/Geração: Falhou/)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 3_200))
    expect(listExports).toHaveBeenCalledTimes(1)

    view.unmount()
    const readyList = vi.fn(async () => [
      { ...reports[2], emailDeliveryStatus: "pending" as const },
    ])
    renderReports({ ...baseRepository, listExports: readyList })
    expect(await screen.findByText(/E-mail pendente/)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 3_200))
    expect(readyList.mock.calls.length).toBeGreaterThanOrEqual(2)
  }, 15_000)

  it("shows an empty history and recovers a failed list query", async () => {
    let failing = true
    renderReports({
      ...baseRepository,
      listExports: async () => {
        if (failing) {
          failing = false
          throw new Error("offline")
        }
        return []
      },
    })
    expect(await screen.findByText("Não foi possível carregar o histórico")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(
      await screen.findByText(
        "Nenhum relatório foi solicitado ainda. Escolha uma opção acima para começar.",
      ),
    ).toBeInTheDocument()
  })

  it("shows queued, running and ready without polling while hidden or offline", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    const listExports = vi.fn(async () => [reports[2], reports[3], reports[4]])
    renderReports({
      ...baseRepository,
      listExports,
      downloadExport: async () => "https://private.invalid",
    })
    expect(await screen.findByText(/Geração: Pronto.*tentativa 1/)).toBeInTheDocument()
    expect(screen.getByText(/Geração: Na fila.*tentativa 1/)).toBeInTheDocument()
    expect(screen.getByText(/Geração: Gerando.*tentativa 1/)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(listExports).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Baixar" })).toBeEnabled()
  })

  it("polls active rows only while visible and online, then downloads the ready artifact", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)
    const open = vi.spyOn(window, "open").mockImplementation(() => null)
    const listExports = vi.fn(async () => [reports[2], reports[3]])
    renderReports({
      ...baseRepository,
      listExports,
      downloadExport: async () => "https://private.invalid/object",
    })
    expect(await screen.findByText(/Geração: Na fila.*tentativa 1/)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 3_200))
    expect(listExports.mock.calls.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(screen.getByRole("button", { name: "Baixar" }))
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith("https://private.invalid/object", "_self", "noopener"),
    )
  }, 10_000)

  it("downloads an authenticated local fake artifact through a temporary object URL", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    const fetchArtifact = vi.fn(
      async () =>
        new Response(new Blob(["report"]), {
          headers: { "content-type": "application/pdf" },
          status: 200,
        }),
    )
    vi.stubGlobal("fetch", fetchArtifact)
    renderReports({
      ...baseRepository,
      listExports: async () => [reports[2]],
      downloadExport: async () => "http://localhost/api/reports/local-artifacts/report.pdf",
    })
    fireEvent.click(await screen.findByRole("button", { name: "Baixar" }))
    await waitFor(() =>
      expect(fetchArtifact).toHaveBeenCalledWith(expect.any(String), {
        credentials: "include",
      }),
    )
  })

  it("keeps ready history visible when a local artifact grant fails", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    )
    renderReports({
      ...baseRepository,
      listExports: async () => [reports[2]],
      downloadExport: async () => "http://localhost/api/reports/local-artifacts/missing.pdf",
    })
    fireEvent.click(await screen.findByRole("button", { name: "Baixar" }))
    expect(await screen.findByText(/Geração: Pronto.*tentativa 1/)).toBeInTheDocument()
  })

  it("announces action failures without losing the visible history", async () => {
    renderReports({
      ...baseRepository,
      listExports: async () => [reports[0], reports[2]],
      createExport: async () => {
        throw new Error("Provedor indisponível")
      },
      retryExport: async () => {
        throw new Error("Falha ao repetir")
      },
      downloadExport: async () => {
        throw new Error("Arquivo indisponível")
      },
    })
    expect(await screen.findByText(/Geração: Falhou.*tentativa 1/)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole("button", { name: "Configurar relatório" })[0])
    fireEvent.click(screen.getByRole("button", { name: "Revisar relatório" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirmar geração" }))
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    fireEvent.click(screen.getByRole("button", { name: "Baixar" }))
    expect(screen.getByText(/Geração: Pronto.*tentativa 1/)).toBeInTheDocument()
  })

  it("does not render the production history for a characterization repository", () => {
    const { container } = renderReports(baseRepository)
    expect(container).toBeEmptyDOMElement()
  })
})

const reports: GeneratedReport[] = [
  {
    id: "failed",
    activeAttempt: 1,
    createdAt: "2026-09-06T10:00:00Z",
    emailDeliveryStatus: "not_applicable",
    format: "pdf",
    reportType: "sales_revenue",
    status: "failed",
  },
  {
    id: "expired",
    activeAttempt: 2,
    createdAt: "2026-09-05T10:00:00Z",
    emailDeliveryStatus: "not_applicable",
    format: "csv",
    reportType: "sales_revenue",
    status: "expired",
  },
  {
    id: "ready",
    activeAttempt: 1,
    createdAt: "2026-09-04T10:00:00Z",
    format: "pdf",
    status: "ready",
    emailDeliveryStatus: "failed",
    reportType: "sales_revenue",
  },
  {
    id: "queued",
    activeAttempt: 1,
    createdAt: "2026-09-03T10:00:00Z",
    emailDeliveryStatus: "pending",
    format: "csv",
    reportType: "sales_revenue",
    status: "queued",
  },
  {
    id: "running",
    activeAttempt: 1,
    createdAt: "2026-09-03T11:00:00Z",
    emailDeliveryStatus: "pending",
    format: "csv",
    reportType: "sales_revenue",
    status: "running",
  },
]
const baseRepository: ReportingRepository = {
  getReport: async () => {
    throw new Error("unused")
  },
  reset: async () => {},
  retry() {},
  today: () => "2026-09-06",
}
function renderReports(repository: ReportingRepository) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const resolvedRepository = repository.listExports
    ? {
        getExportCatalog: async () => ({
          items: reportCatalog,
          requester: { maskedEmail: "ma••••@exemplo.com", verified: true as const },
          schemaVersion: 1 as const,
        }),
        ...repository,
      }
    : repository
  return render(<GeneratedReports filters={{ from: "2026-09-01", to: "2026-09-06" }} />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ReportingRepositoryProvider repository={resolvedRepository}>
          {children}
        </ReportingRepositoryProvider>
      </QueryClientProvider>
    ),
  })
}
