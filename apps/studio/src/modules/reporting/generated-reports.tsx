import { Dialog } from "@base-ui/react/dialog"
import {
  BarChart3Icon,
  CalendarX2Icon,
  CircleDollarSignIcon,
  DownloadIcon,
  FileChartColumnIcon,
  MailCheckIcon,
  RefreshCwIcon,
  ScissorsIcon,
  UsersRoundIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { DatePicker } from "@/modules/shared/components/forms/date-picker"
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
import type { CreateReportExportInput, ReportCatalogItem, ReportFilters } from "./contracts"
import { useGeneratedReports, useReportCatalog, useReportExportActions } from "./queries"
import { useReportingRepository } from "./repository-context"

export const reportCatalog = [
  {
    id: "sales_revenue",
    title: "Vendas e faturamento",
    description: "Acompanhe vendas, receita líquida, estornos e ticket médio do período.",
    formats: ["pdf", "csv"],
    supportedFilters: ["dateRange", "unit", "professional", "service", "paymentMethod"],
    version: 1,
  },
  {
    id: "professional_performance",
    title: "Desempenho por profissional",
    description: "Compare atendimentos concluídos, receita, ticket médio e ocorrências da equipe.",
    formats: ["pdf", "csv"],
    supportedFilters: ["dateRange", "unit", "professional", "service"],
    version: 1,
  },
  {
    id: "commissions",
    title: "Comissões por profissional",
    description: "Consulte comissões, estornos e a participação líquida da barbearia.",
    formats: ["pdf", "csv"],
    supportedFilters: ["dateRange", "unit", "professional"],
    version: 1,
  },
  {
    id: "new_returning_customers",
    title: "Clientes novos e recorrentes",
    description: "Entenda quantos clientes chegaram e quantos voltaram no período.",
    formats: ["pdf", "csv"],
    supportedFilters: ["dateRange", "unit", "professional", "service"],
    version: 1,
  },
  {
    id: "cancellations_no_shows",
    title: "Cancelamentos e ausências",
    description: "Identifique cancelamentos, faltas e perdas de agenda no período.",
    formats: ["pdf", "csv"],
    supportedFilters: ["dateRange", "unit", "professional", "service"],
    version: 1,
  },
  {
    id: "cash_payments",
    title: "Caixa e formas de pagamento",
    description: "Veja recebimentos, estornos e totais por forma de pagamento.",
    formats: ["pdf", "csv"],
    supportedFilters: ["dateRange", "unit", "paymentMethod"],
    version: 1,
  },
] as const satisfies readonly ReportCatalogItem[]

const lifecycleLabels = {
  queued: "Na fila",
  running: "Gerando",
  ready: "Pronto",
  failed: "Falhou",
  expired: "Arquivo expirado",
} as const
const deliveryLabels = {
  pending: "E-mail pendente",
  sending: "Enviando e-mail",
  sent: "E-mail enviado",
  failed: "Falha no e-mail",
} as const

export function GeneratedReports({ filters }: { filters: ReportFilters }) {
  const repository = useReportingRepository()
  const reports = useGeneratedReports()
  const catalogQuery = useReportCatalog()
  const actions = useReportExportActions()
  const [selected, setSelected] = useState<ReportCatalogItem | null>(null)
  const items = catalogQuery.data?.items.length ? catalogQuery.data.items : reportCatalog
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
    <section aria-labelledby="report-catalog-title" className="grid gap-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Central de relatórios
        </p>
        <h2 className="font-heading text-xl font-medium" id="report-catalog-title">
          Escolha o relatório
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure o recorte, revise os dados e acompanhe cada entrega.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => {
          const Icon =
            [
              FileChartColumnIcon,
              BarChart3Icon,
              UsersRoundIcon,
              ScissorsIcon,
              CircleDollarSignIcon,
              CalendarX2Icon,
            ][index % 6] ?? FileChartColumnIcon
          return (
            <Card
              className="group border-border/80 transition-colors hover:border-primary/50 motion-reduce:transition-none"
              key={item.id}
            >
              <CardHeader>
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" onClick={() => setSelected(item)}>
                  Configurar relatório
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selected ? (
        <ReportRequestDialog
          initialFilters={filters}
          item={selected}
          maskedEmail={
            catalogQuery.data?.requester.verified ? catalogQuery.data.requester.maskedEmail : null
          }
          pending={actions.create.isPending}
          onCancel={() => setSelected(null)}
          onSubmit={async (input) => {
            try {
              await actions.create.mutateAsync(input)
              toast.success("Relatório enviado para geração.")
              setSelected(null)
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Não foi possível gerar o relatório.",
              )
            }
          }}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de entregas</CardTitle>
          <CardDescription>
            Arquivos privados ficam disponíveis por 30 dias. Geração e envio por e-mail são
            acompanhados separadamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {reports.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível carregar o histórico</AlertTitle>
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
              Nenhum relatório foi solicitado ainda. Escolha uma opção acima para começar.
            </p>
          ) : null}
          <div aria-live="polite" className="grid gap-2">
            {reports.data?.map((report) => (
              <article
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={report.id}
              >
                <div>
                  <p className="font-medium">
                    {items.find(({ id }) => id === report.reportType)?.title ??
                      (report.format === "pdf" ? "Relatório em PDF" : "Relatório em CSV")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Geração: {lifecycleLabels[report.status]} ·{" "}
                    {deliveryLabels[report.emailDeliveryStatus ?? "pending"]} · tentativa{" "}
                    {report.activeAttempt}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                  {report.status === "ready" && report.emailDeliveryStatus === "failed" ? (
                    <Button
                      variant="outline"
                      isLoading={actions.retryDelivery.isPending}
                      onClick={() => actions.retryDelivery.mutate(report.id)}
                    >
                      <MailCheckIcon data-icon="inline-start" />
                      Reenviar e-mail
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function ReportRequestDialog({
  initialFilters,
  item,
  maskedEmail,
  pending,
  onCancel,
  onSubmit,
}: {
  initialFilters: ReportFilters
  item: ReportCatalogItem
  maskedEmail: string | null
  pending: boolean
  onCancel: () => void
  onSubmit: (input: CreateReportExportInput) => Promise<void>
}) {
  const [step, setStep] = useState<"configure" | "confirm">("configure")
  const [submitted, setSubmitted] = useState(false)
  const [draft, setDraft] = useState(() => ({
    filters: filterReportFilters(initialFilters, item),
    format: item.formats[0] ?? "pdf",
    idempotencyKey: crypto.randomUUID(),
  }))
  const filterSet = useMemo(() => new Set(item.supportedFilters), [item.supportedFilters])
  const invalidRange = draft.filters.from > draft.filters.to

  async function submit() {
    if (submitted || pending || invalidRange || !maskedEmail) return
    setSubmitted(true)
    try {
      await onSubmit({
        ...draft,
        reportType: item.id,
      })
    } finally {
      setSubmitted(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !pending && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[70] bg-black/55 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[71] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Etapa {step === "configure" ? "1 de 2 · Configurar" : "2 de 2 · Confirmar"}
          </p>
          <Dialog.Title className="mt-1 font-heading text-xl font-medium">
            {item.title}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {step === "configure"
              ? "Defina o recorte e o formato do arquivo."
              : "Revise antes de enviar para geração."}
          </Dialog.Description>

          {step === "configure" ? (
            <div className="mt-6 grid gap-5">
              {filterSet.has("dateRange") ? (
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="col-span-full text-sm font-medium">Período</legend>
                  <label className="grid gap-1 text-sm" htmlFor="export-from">
                    Data inicial
                    <DatePicker
                      id="export-from"
                      placeholder="Selecione"
                      value={draft.filters.from}
                      onValueChange={(from) =>
                        setDraft((current) => ({
                          ...current,
                          filters: { ...current.filters, from },
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm" htmlFor="export-to">
                    Data final
                    <DatePicker
                      id="export-to"
                      placeholder="Selecione"
                      value={draft.filters.to}
                      onValueChange={(to) =>
                        setDraft((current) => ({
                          ...current,
                          filters: { ...current.filters, to },
                        }))
                      }
                    />
                  </label>
                  {invalidRange ? (
                    <p className="col-span-full text-sm text-destructive" role="alert">
                      A data final deve ser igual ou posterior à data inicial.
                    </p>
                  ) : null}
                </fieldset>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {(["unit", "professional", "service", "paymentMethod"] as const)
                  .filter((filter) => filterSet.has(filter))
                  .map((filter) => (
                    <OptionalReportFilter
                      filter={filter}
                      hasCurrentValue={Boolean(draft.filters[filterKey[filter]])}
                      key={filter}
                      onClear={() =>
                        setDraft((current) => ({
                          ...current,
                          filters: { ...current.filters, [filterKey[filter]]: undefined },
                        }))
                      }
                    />
                  ))}
              </div>
              <label className="grid gap-1 text-sm font-medium" htmlFor="report-export-format">
                Formato
                <Select
                  value={draft.format}
                  onValueChange={(format) =>
                    setDraft((current) => ({
                      ...current,
                      format: (format ?? "pdf") as "pdf" | "csv",
                    }))
                  }
                >
                  <SelectTrigger id="report-export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {item.formats.includes("pdf") ? <SelectItem value="pdf">PDF</SelectItem> : null}
                    {item.formats.includes("csv") ? <SelectItem value="csv">CSV</SelectItem> : null}
                  </SelectContent>
                </Select>
              </label>
              <div
                className="flex min-h-11 items-start gap-3 rounded-lg border p-3 text-sm"
                role={maskedEmail ? "note" : "alert"}
              >
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    <MailCheckIcon aria-hidden="true" className="size-4" />
                    Entrega por e-mail
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    {maskedEmail
                      ? `O link seguro será enviado para ${maskedEmail}.`
                      : "Confirme um e-mail verificado na sua conta antes de solicitar o relatório."}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <dl className="mt-6 grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Relatório</dt>
                <dd className="font-medium">{item.title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Período</dt>
                <dd>
                  {draft.filters.from} a {draft.filters.to}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Formato</dt>
                <dd>{draft.format.toUpperCase()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Entrega</dt>
                <dd>Link seguro para {maskedEmail ?? "e-mail verificado indisponível"}</dd>
              </div>
            </dl>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              disabled={pending || submitted}
              variant="outline"
              onClick={step === "configure" ? onCancel : () => setStep("configure")}
            >
              {step === "configure" ? "Cancelar" : "Voltar"}
            </Button>
            <Button
              disabled={invalidRange || !maskedEmail || submitted}
              isLoading={pending || submitted}
              onClick={() => (step === "configure" ? setStep("confirm") : void submit())}
            >
              {step === "configure" ? "Revisar relatório" : "Confirmar geração"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const filterKey = {
  unit: "unitId",
  professional: "professionalId",
  service: "serviceId",
  paymentMethod: "paymentMethod",
} as const

const filterLabel = {
  unit: "Unidade",
  professional: "Profissional",
  service: "Serviço",
  paymentMethod: "Forma de pagamento",
} as const

function OptionalReportFilter({
  filter,
  hasCurrentValue,
  onClear,
}: {
  filter: keyof typeof filterKey
  hasCurrentValue: boolean
  onClear: () => void
}) {
  return (
    <label className="grid gap-1 text-sm font-medium" htmlFor={`export-${filter}`}>
      {filterLabel[filter]}
      <Select
        value={hasCurrentValue ? "current" : "all"}
        onValueChange={(value) => value === "all" && onClear()}
      >
        <SelectTrigger id={`export-${filter}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hasCurrentValue ? <SelectItem value="current">Manter filtro atual</SelectItem> : null}
          <SelectItem value="all">Todos</SelectItem>
        </SelectContent>
      </Select>
    </label>
  )
}

function filterReportFilters(filters: ReportFilters, item: ReportCatalogItem): ReportFilters {
  const supported = new Set(item.supportedFilters)
  return {
    from: filters.from,
    to: filters.to,
    paymentMethod: supported.has("paymentMethod") ? filters.paymentMethod : undefined,
    professionalId: supported.has("professional") ? filters.professionalId : undefined,
    serviceId: supported.has("service") ? filters.serviceId : undefined,
    unitId: supported.has("unit") ? filters.unitId : undefined,
  }
}
