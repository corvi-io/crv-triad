import { DownloadIcon, FileTextIcon, RefreshCwIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import type { ReportFilters } from "./contracts"
import { useGeneratedReports, useReportExportActions } from "./queries"
import { useReportingRepository } from "./repository-context"

const labels = {
  queued: "Na fila",
  running: "Gerando",
  ready: "Pronto",
  failed: "Falhou",
  expired: "Arquivo expirado",
} as const

export function GeneratedReports({ filters }: { filters: ReportFilters }) {
  const repository = useReportingRepository()
  const reports = useGeneratedReports()
  const actions = useReportExportActions()
  const [format, setFormat] = useState<"pdf" | "csv">("pdf")
  if (!repository.listExports) return null
  async function download(id: string) {
    try {
      const url = await actions.download(id)
      if (!url.includes("/api/reports/local-artifacts/")) {
        window.open(url, "_self", "noopener")
        return
      }
      const response = await fetch(url, { credentials: "include" })
      if (!response.ok) throw new Error("Não foi possível baixar o relatório.")
      const objectUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = "relatorio"
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar o relatório.")
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon aria-hidden="true" className="size-4" />
          Relatórios gerados
        </CardTitle>
        <CardDescription>
          Os arquivos privados ficam disponíveis por 30 dias. A lista é atualizada enquanto houver
          geração em andamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="grid gap-1 text-sm font-medium" htmlFor="report-export-format">
            Formato
            <Select
              value={format}
              onValueChange={(value) => setFormat((value ?? "pdf") as "pdf" | "csv")}
            >
              <SelectTrigger id="report-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">Resumo em PDF</SelectItem>
                <SelectItem value="csv">Dados em CSV</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <Button
            type="button"
            isLoading={actions.create.isPending}
            onClick={() =>
              actions.create.mutate(
                { filters, format },
                {
                  onError: (error) => toast.error(error.message),
                  onSuccess: () => toast.success("Relatório enviado para geração."),
                },
              )
            }
          >
            Gerar relatório
          </Button>
        </div>
        {reports.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar os arquivos</AlertTitle>
            <AlertDescription>
              <Button variant="outline" onClick={() => reports.refetch()}>
                <RefreshCwIcon data-icon="inline-start" />
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {!reports.isPending && reports.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum relatório foi gerado com esta conta.
          </p>
        ) : null}
        <div aria-live="polite" className="grid gap-2">
          {reports.data?.map((report) => (
            <div
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              key={report.id}
            >
              <div>
                <p className="font-medium">
                  {report.format === "pdf" ? "Resumo em PDF" : "Dados em CSV"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {labels[report.status]} · tentativa {report.activeAttempt}
                </p>
              </div>
              <div className="flex gap-2">
                {report.status === "ready" ? (
                  <Button variant="outline" onClick={() => download(report.id)}>
                    <DownloadIcon data-icon="inline-start" />
                    Baixar
                  </Button>
                ) : null}
                {report.status === "failed" || report.status === "expired" ? (
                  <Button
                    variant="outline"
                    isLoading={actions.retry.isPending}
                    onClick={() => actions.retry.mutate(report.id)}
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    Tentar novamente
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
