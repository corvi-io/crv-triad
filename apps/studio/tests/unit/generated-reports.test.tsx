import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { GeneratedReport, ReportingRepository } from "@/modules/reporting/contracts"
import { GeneratedReports } from "@/modules/reporting/generated-reports"
import { ReportingRepositoryProvider } from "@/modules/reporting/repository-context"

afterEach(() => vi.restoreAllMocks())

describe("generated reports", () => {
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
    expect(await screen.findByText("Falhou · tentativa 1")).toBeInTheDocument()
    expect(screen.getByText("Arquivo expirado · tentativa 2")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Gerar relatório" }))
    await waitFor(() =>
      expect(createExport).toHaveBeenCalledWith(expect.objectContaining({ format: "pdf" })),
    )
    const retries = screen.getAllByRole("button", { name: "Tentar novamente" })
    fireEvent.click(retries[0])
    await waitFor(() => expect(retryExport).toHaveBeenCalledWith("failed"))
  })

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
    expect(await screen.findByText("Não foi possível carregar os arquivos")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(
      await screen.findByText("Nenhum relatório foi gerado com esta conta."),
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
    expect(await screen.findByText("Pronto · tentativa 1")).toBeInTheDocument()
    expect(screen.getByText("Na fila · tentativa 1")).toBeInTheDocument()
    expect(screen.getByText("Gerando · tentativa 1")).toBeInTheDocument()
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
    expect(await screen.findByText("Na fila · tentativa 1")).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 3_200))
    expect(listExports.mock.calls.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(screen.getByRole("button", { name: "Baixar" }))
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith("https://private.invalid/object", "_self", "noopener"),
    )
  }, 10_000)

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
    expect(await screen.findByText("Falhou · tentativa 1")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Gerar relatório" }))
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))
    fireEvent.click(screen.getByRole("button", { name: "Baixar" }))
    expect(screen.getByText("Pronto · tentativa 1")).toBeInTheDocument()
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
    format: "pdf",
    status: "failed",
  },
  {
    id: "expired",
    activeAttempt: 2,
    createdAt: "2026-09-05T10:00:00Z",
    format: "csv",
    status: "expired",
  },
  {
    id: "ready",
    activeAttempt: 1,
    createdAt: "2026-09-04T10:00:00Z",
    format: "pdf",
    status: "ready",
  },
  {
    id: "queued",
    activeAttempt: 1,
    createdAt: "2026-09-03T10:00:00Z",
    format: "csv",
    status: "queued",
  },
  {
    id: "running",
    activeAttempt: 1,
    createdAt: "2026-09-03T11:00:00Z",
    format: "csv",
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
  return render(<GeneratedReports filters={{ from: "2026-09-01", to: "2026-09-06" }} />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ReportingRepositoryProvider repository={repository}>
          {children}
        </ReportingRepositoryProvider>
      </QueryClientProvider>
    ),
  })
}
