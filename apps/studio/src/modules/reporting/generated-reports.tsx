import { Dialog } from "@base-ui/react/dialog"
import {
  BarChart3Icon,
  CalendarX2Icon,
  CircleDollarSignIcon,
  FileChartColumnIcon,
  MailCheckIcon,
  ScissorsIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { DatePicker } from "@/modules/shared/components/forms/date-picker"
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
import type {
  CreateReportExportInput,
  ReportCatalogItem,
  ReportFilters,
  ReportingFacets,
} from "./contracts"
import { useReportCatalog, useReportExportActions } from "./queries"

export const reportCatalog = [
  {
    id: "sales_revenue",
    title: "Vendas e faturamento",
    description:
      "Confira quanto a barbearia vendeu, o que foi estornado e como a receita foi formada.",
    formats: ["csv"],
    supportedFilters: ["dateRange", "unit", "professional", "service", "paymentMethod"],
    version: 1,
  },
  {
    id: "professional_performance",
    title: "Desempenho por profissional",
    description: "Compare atendimentos concluídos, receita e ticket médio para orientar a equipe.",
    formats: ["csv"],
    supportedFilters: ["dateRange", "unit", "professional", "service"],
    version: 1,
  },
  {
    id: "commissions",
    title: "Comissões por profissional",
    description: "Confira os valores de comissão, estornos e a participação líquida da barbearia.",
    formats: ["csv"],
    supportedFilters: ["dateRange", "unit", "professional"],
    version: 1,
  },
  {
    id: "new_returning_customers",
    title: "Clientes novos e recorrentes",
    description: "Entenda quantos clientes chegaram e quantos voltaram para um novo atendimento.",
    formats: ["csv"],
    supportedFilters: ["dateRange", "unit", "professional", "service"],
    version: 1,
  },
  {
    id: "cancellations_no_shows",
    title: "Cancelamentos e ausências",
    description: "Identifique onde cancelamentos e faltas estão deixando horários ociosos.",
    formats: ["csv"],
    supportedFilters: ["dateRange", "unit", "professional", "service"],
    version: 1,
  },
  {
    id: "cash_payments",
    title: "Recebimentos por forma de pagamento",
    description: "Concilie recebimentos e estornos por Pix, dinheiro, débito e crédito.",
    formats: ["csv"],
    supportedFilters: ["dateRange", "unit", "paymentMethod"],
    version: 1,
  },
] as const satisfies readonly ReportCatalogItem[]

const reportIcons = [
  FileChartColumnIcon,
  BarChart3Icon,
  UsersRoundIcon,
  ScissorsIcon,
  CircleDollarSignIcon,
  CalendarX2Icon,
] as const

export function GeneratedReports({
  facets,
  filters,
}: {
  facets: ReportingFacets
  filters: ReportFilters
}) {
  const catalogQuery = useReportCatalog()
  const actions = useReportExportActions()
  const [selected, setSelected] = useState<ReportCatalogItem | null>(null)
  const items = catalogQuery.data?.items.length ? catalogQuery.data.items : reportCatalog

  return (
    <section aria-labelledby="report-catalog-title" className="grid gap-5 pb-6">
      <header className="max-w-2xl">
        <h2 className="font-heading text-xl font-medium" id="report-catalog-title">
          Escolha um relatório
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Selecione o relatório que responde à sua dúvida. Você poderá definir o período e os
          filtros antes de solicitar.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => {
          const Icon = reportIcons[index % reportIcons.length] ?? FileChartColumnIcon
          return (
            <Card className="flex flex-col border-border/80" key={item.id}>
              <CardHeader className="flex-1">
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
          facets={facets}
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
              toast.success("Solicitação recebida. Você receberá o resultado por e-mail.")
              setSelected(null)
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Não foi possível solicitar o relatório.",
              )
            }
          }}
        />
      ) : null}
    </section>
  )
}

function ReportRequestDialog({
  facets,
  initialFilters,
  item,
  maskedEmail,
  pending,
  onCancel,
  onSubmit,
}: {
  facets: ReportingFacets
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
    idempotencyKey: crypto.randomUUID(),
  }))
  const filterSet = useMemo(() => new Set(item.supportedFilters), [item.supportedFilters])
  const invalidRange = draft.filters.from > draft.filters.to

  async function submit() {
    if (submitted || pending || invalidRange || !maskedEmail) return
    setSubmitted(true)
    try {
      await onSubmit({
        filters: draft.filters,
        format: "csv",
        idempotencyKey: draft.idempotencyKey,
        reportType: item.id,
      })
    } finally {
      setSubmitted(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !pending && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-(--layer-modal) bg-black/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-(--layer-modal) flex max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-lg ring-1 ring-border outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Dialog.Title className="text-xl font-semibold tracking-[-0.02em]">
                {step === "configure" ? "Configurar relatório" : "Revisar relatório"}
              </Dialog.Title>
              <Dialog.Description className="text-sm leading-6 text-muted-foreground">
                {step === "configure"
                  ? `Defina o período e os filtros de ${item.title}.`
                  : "Confira as informações antes de solicitar o envio."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              render={
                <Button
                  aria-label="Fechar"
                  disabled={pending}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <XIcon aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
            {step === "configure" ? (
              <div className="grid gap-5">
                {filterSet.has("dateRange") ? (
                  <DateRange
                    filters={draft.filters}
                    invalid={invalidRange}
                    onChange={(filters) => setDraft((current) => ({ ...current, filters }))}
                  />
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {filterSet.has("unit") ? (
                    <FilterSelect
                      id="unit"
                      label="Unidade"
                      allLabel="Todas as unidades"
                      options={facets.units}
                      value={draft.filters.unitId}
                      onChange={(unitId) =>
                        setDraft((current) => ({
                          ...current,
                          filters: { ...current.filters, unitId },
                        }))
                      }
                    />
                  ) : null}
                  {filterSet.has("professional") ? (
                    <FilterSelect
                      id="professional"
                      label="Profissional"
                      allLabel="Todos os profissionais"
                      options={facets.professionals}
                      value={draft.filters.professionalId}
                      onChange={(professionalId) =>
                        setDraft((current) => ({
                          ...current,
                          filters: { ...current.filters, professionalId },
                        }))
                      }
                    />
                  ) : null}
                  {filterSet.has("service") ? (
                    <FilterSelect
                      id="service"
                      label="Serviço"
                      allLabel="Todos os serviços"
                      options={facets.services}
                      value={draft.filters.serviceId}
                      onChange={(serviceId) =>
                        setDraft((current) => ({
                          ...current,
                          filters: { ...current.filters, serviceId },
                        }))
                      }
                    />
                  ) : null}
                  {filterSet.has("paymentMethod") ? (
                    <FilterSelect
                      id="payment"
                      label="Forma de pagamento"
                      allLabel="Todas as formas de pagamento"
                      options={facets.paymentMethods}
                      value={draft.filters.paymentMethod}
                      onChange={(paymentMethod) =>
                        setDraft((current) => ({
                          ...current,
                          filters: {
                            ...current.filters,
                            paymentMethod: paymentMethod as ReportFilters["paymentMethod"],
                          },
                        }))
                      }
                    />
                  ) : null}
                </div>
                <div
                  className="flex min-h-11 items-start gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-border"
                  role={maskedEmail ? "note" : "alert"}
                >
                  <MailCheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">Entrega por e-mail</p>
                    <p className="mt-1 text-muted-foreground">
                      {maskedEmail
                        ? `O arquivo CSV será enviado para ${maskedEmail}.`
                        : "Confirme um e-mail verificado na sua conta antes de solicitar o relatório."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <ReportSummary
                facets={facets}
                filters={draft.filters}
                item={item}
                maskedEmail={maskedEmail}
              />
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
            <Button
              disabled={pending || submitted}
              type="button"
              variant="outline"
              onClick={step === "configure" ? onCancel : () => setStep("configure")}
            >
              {step === "configure" ? "Cancelar" : "Voltar"}
            </Button>
            <Button
              disabled={invalidRange || !maskedEmail || submitted}
              isLoading={pending || submitted}
              type="button"
              onClick={() => (step === "configure" ? setStep("confirm") : void submit())}
            >
              {step === "configure" ? "Revisar relatório" : "Gerar relatório"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DateRange({
  filters,
  invalid,
  onChange,
}: {
  filters: ReportFilters
  invalid: boolean
  onChange: (filters: ReportFilters) => void
}) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="col-span-full text-sm font-medium">Período</legend>
      <label className="grid gap-1 text-sm" htmlFor="export-from">
        Data inicial
        <DatePicker
          id="export-from"
          placeholder="Selecione"
          value={filters.from}
          onValueChange={(from) => onChange({ ...filters, from })}
        />
      </label>
      <label className="grid gap-1 text-sm" htmlFor="export-to">
        Data final
        <DatePicker
          id="export-to"
          placeholder="Selecione"
          value={filters.to}
          onValueChange={(to) => onChange({ ...filters, to })}
        />
      </label>
      {invalid ? (
        <p className="col-span-full text-sm text-destructive" role="alert">
          A data final deve ser igual ou posterior à data inicial.
        </p>
      ) : null}
    </fieldset>
  )
}

function FilterSelect({
  id,
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  id: string
  label: string
  allLabel: string
  options: readonly { id: string; label: string }[]
  value?: string
  onChange: (value: string | undefined) => void
}) {
  const displayedValue = options.find((option) => option.id === value)?.label ?? allLabel
  return (
    <label className="grid gap-1 text-sm font-medium" htmlFor={`export-${id}`}>
      {label}
      <Select
        value={value ?? "all"}
        onValueChange={(next) => onChange(!next || next === "all" ? undefined : next)}
      >
        <SelectTrigger id={`export-${id}`}>
          <SelectValue>{displayedValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function ReportSummary({
  facets,
  filters,
  item,
  maskedEmail,
}: {
  facets: ReportingFacets
  filters: ReportFilters
  item: ReportCatalogItem
  maskedEmail: string | null
}) {
  const rows = [
    ["Relatório", item.title],
    ["Período", `${formatDate(filters.from)} a ${formatDate(filters.to)}`],
    ["Unidade", selectedLabel(facets.units, filters.unitId, "Todas as unidades")],
    [
      "Profissional",
      selectedLabel(facets.professionals, filters.professionalId, "Todos os profissionais"),
    ],
    ["Serviço", selectedLabel(facets.services, filters.serviceId, "Todos os serviços")],
    [
      "Forma de pagamento",
      selectedLabel(facets.paymentMethods, filters.paymentMethod, "Todas as formas de pagamento"),
    ],
    ["Formato", "CSV"],
    ["Entrega", maskedEmail ?? "E-mail verificado indisponível"],
    ["Validade do link", "7 dias"],
  ].filter(
    ([label]) =>
      label === "Relatório" ||
      label === "Período" ||
      label === "Formato" ||
      label === "Entrega" ||
      label === "Validade do link" ||
      item.supportedFilters.includes(
        (
          {
            Unidade: "unit",
            Profissional: "professional",
            Serviço: "service",
            "Forma de pagamento": "paymentMethod",
          } as const
        )[label as "Unidade" | "Profissional" | "Serviço" | "Forma de pagamento"],
      ),
  )
  return (
    <dl className="grid gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-border">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function selectedLabel(
  options: readonly { id: string; label: string }[],
  value: string | null | undefined,
  fallback: string,
) {
  return options.find((option) => option.id === value)?.label ?? fallback
}
function formatDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
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
