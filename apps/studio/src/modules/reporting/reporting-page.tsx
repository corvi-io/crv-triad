import {
  AlertTriangleIcon,
  BarChart3Icon,
  CalendarX2Icon,
  CircleDollarSignIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  ScissorsIcon,
  UsersRoundIcon,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/modules/shared/components/ui/chart"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import type { RankedMoneyItem, ReportingQuery, ReportingResult } from "./contracts"
import { useReportingResult } from "./queries"
import { useReportingRepository } from "./repository-context"

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" })
const integer = new Intl.NumberFormat("pt-BR")
const reportChartConfig = {
  primary: { color: "var(--primary)", label: "Valor principal" },
  secondary: { color: "var(--muted-foreground)", label: "Valor secundário" },
} satisfies ChartConfig

export function ReportingPage({ query }: { query: ReportingQuery }) {
  const report = useReportingResult(query)
  return <ReportingPageContent report={report} />
}

export function ReportingPageContent({
  report,
}: {
  report: ReturnType<typeof useReportingResult>
}) {
  const repository = useReportingRepository()
  if (report.isPending) return <ReportingLoading />
  if (report.isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon aria-hidden="true" />
        <AlertTitle>Não foi possível carregar os relatórios</AlertTitle>
        <AlertDescription>
          <p>{report.error.message}</p>
          <Button
            className="mt-3"
            type="button"
            variant="outline"
            onClick={() => {
              repository.retry()
              report.refetch()
            }}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const result = report.data
  if (result.summary.paidSaleCount === 0 && result.cancellations.denominator === 0) {
    return (
      <EmptyState
        description="Altere o período ou os filtros para consultar outro recorte. Nenhum valor foi inventado para este estado."
        icon={BarChart3Icon}
        title="Nenhum dado encontrado"
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      <p aria-live="polite" className="sr-only">
        Relatórios atualizados com {result.summary.paidSaleCount} vendas pagas e{" "}
        {result.summary.performedServiceCount} serviços realizados.
      </p>
      <SummaryCards result={result} />
      <RevenueReport result={result} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <RankingReport
          description="Unidade: serviços realizados em vendas pagas."
          icon={UsersRoundIcon}
          items={result.professionalAttendance.items}
          title="Atendimentos por profissional"
          valueKind="quantity"
        />
        <RankingReport
          description="Quantidade de itens pagos, com desempate por receita, nome e identificador."
          icon={ScissorsIcon}
          items={result.topServices.items}
          title="Serviços mais vendidos"
          valueKind="revenue"
        />
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <AverageTicketReport result={result} />
        <RankingReport
          description={`Comissão exata sobre ${money(result.commissions.totalServiceRevenueCents)} em receita de serviços.`}
          icon={CircleDollarSignIcon}
          items={result.commissions.items}
          title="Comissões por profissional"
          valueKind="commission"
        />
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <CancellationReport result={result} />
        <CustomerReport result={result} />
      </div>
    </div>
  )
}

function SummaryCards({ result }: { result: ReportingResult }) {
  const values = [
    ["Faturamento", money(result.summary.totalRevenueCents)],
    ["Vendas pagas", integer.format(result.summary.paidSaleCount)],
    ["Serviços realizados", integer.format(result.summary.performedServiceCount)],
    ["Comissões", money(result.summary.totalCommissionCents)],
  ] as const
  return (
    <section aria-labelledby="report-summary-title">
      <h2 className="sr-only" id="report-summary-title">
        Resumo do período
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {values.map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}

function RevenueReport({ result }: { result: ReportingResult }) {
  const titleId = "revenue-report-title"
  const descriptionId = "revenue-report-description"
  return (
    <Card>
      <CardHeader>
        <CardTitle aria-level={2} id={titleId} role="heading">
          Faturamento por período
        </CardTitle>
        <CardDescription id={descriptionId}>
          {result.revenue.series.length === 0
            ? "Não houve vendas pagas no período."
            : `O faturamento líquido pago somou ${money(result.revenue.totalCents)} em ${result.revenue.series.length} dia(s) com movimento.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <figure aria-describedby={descriptionId} aria-labelledby={titleId}>
          <ChartContainer
            aria-describedby={descriptionId}
            aria-label="Gráfico de linha do faturamento líquido pago por dia"
            aria-labelledby={titleId}
            config={reportChartConfig}
            role="img"
          >
            <LineChart
              accessibilityLayer
              data={result.revenue.series}
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} />
              <YAxis
                tickFormatter={(value) => compactMoney(Number(value))}
                tickLine={false}
                width={58}
              />
              <Line
                dataKey="valueCents"
                dot={{ fill: "var(--color-primary)", r: 4 }}
                isAnimationActive={false}
                stroke="var(--color-primary)"
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ChartContainer>
        </figure>
        <AccessibleTable
          columns={["Data", "Faturamento líquido pago"]}
          rows={result.revenue.series.map(({ date, valueCents }) => [
            longDate(date),
            money(valueCents),
          ])}
          title="Valores do faturamento por período"
        />
      </CardContent>
    </Card>
  )
}

function RankingReport({
  description,
  icon: Icon,
  items,
  title,
  valueKind,
}: {
  description: string
  icon: typeof UsersRoundIcon
  items: readonly RankedMoneyItem[]
  title: string
  valueKind: "commission" | "quantity" | "revenue"
}) {
  const slug = title.toLocaleLowerCase("pt-BR").replace(/\W+/g, "-")
  const label =
    valueKind === "quantity"
      ? "Serviços realizados"
      : valueKind === "commission"
        ? "Comissão"
        : "Receita líquida"
  const chartData = items.map((item) => ({
    label: item.label,
    value: valueKind === "quantity" ? item.quantity : item.valueCents,
  }))
  const top = items[0]
  return (
    <Card>
      <CardHeader>
        <CardTitle
          aria-level={2}
          className="flex items-center gap-2"
          id={`${slug}-title`}
          role="heading"
        >
          <Icon aria-hidden="true" className="size-4" />
          {title}
        </CardTitle>
        <CardDescription id={`${slug}-description`}>
          {top
            ? `${top.label} lidera com ${valueKind === "quantity" ? `${top.quantity} serviço(s)` : money(top.valueCents)}. ${description}`
            : `Sem dados para este recorte. ${description}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <figure aria-describedby={`${slug}-description`} aria-labelledby={`${slug}-title`}>
          <ChartContainer
            aria-describedby={`${slug}-description`}
            aria-label={`Gráfico de barras: ${title}`}
            aria-labelledby={`${slug}-title`}
            config={reportChartConfig}
            role="img"
          >
            <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis
                tickFormatter={(value) =>
                  valueKind === "quantity"
                    ? integer.format(Number(value))
                    : compactMoney(Number(value))
                }
                type="number"
              />
              <YAxis dataKey="label" hide type="category" />
              <Bar
                dataKey="value"
                fill="var(--color-primary)"
                isAnimationActive={false}
                radius={4}
              />
            </BarChart>
          </ChartContainer>
        </figure>
        <AccessibleTable
          columns={[
            "Posição",
            title === "Serviços mais vendidos" ? "Serviço" : "Profissional",
            label,
          ]}
          rows={items.map((item, index) => [
            String(index + 1),
            item.label,
            valueKind === "quantity" ? integer.format(item.quantity) : money(item.valueCents),
          ])}
          title={`Valores de ${title.toLocaleLowerCase("pt-BR")}`}
        />
      </CardContent>
    </Card>
  )
}

function AverageTicketReport({ result }: { result: ReportingResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle aria-level={2} className="flex items-center gap-2" role="heading">
          <ReceiptTextIcon aria-hidden="true" className="size-4" />
          Ticket médio
        </CardTitle>
        <CardDescription>
          Receita líquida paga dividida pelo número de vendas pagas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">
          {result.averageTicket.ticketCents === null
            ? "Sem cálculo"
            : money(result.averageTicket.ticketCents)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {money(result.averageTicket.totalRevenueCents)} ÷{" "}
          {integer.format(result.averageTicket.paidSaleCount)} venda(s) paga(s).
        </p>
      </CardContent>
    </Card>
  )
}

function CancellationReport({ result }: { result: ReportingResult }) {
  const values = [
    {
      label: "Cancelamentos",
      rate: result.cancellations.cancellationRateBasisPoints,
      value: result.cancellations.cancellationCount,
    },
    {
      label: "Ausências",
      rate: result.cancellations.noShowRateBasisPoints,
      value: result.cancellations.noShowCount,
    },
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle
          aria-level={2}
          className="flex items-center gap-2"
          id="cancellation-title"
          role="heading"
        >
          <CalendarX2Icon aria-hidden="true" className="size-4" />
          Cancelamentos e ausências
        </CardTitle>
        <CardDescription id="cancellation-description">
          Denominador: {integer.format(result.cancellations.denominator)} agendamento(s) no recorte.
          Cancelamentos e ausências são taxas separadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <ChartContainer
          aria-describedby="cancellation-description"
          aria-label="Gráfico de barras de cancelamentos e ausências"
          aria-labelledby="cancellation-title"
          config={reportChartConfig}
          role="img"
        >
          <BarChart accessibilityLayer data={values}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Bar dataKey="value" fill="var(--color-primary)" isAnimationActive={false} radius={4} />
          </BarChart>
        </ChartContainer>
        <AccessibleTable
          columns={["Resultado", "Quantidade", "Taxa"]}
          rows={values.map(({ label, rate, value }) => [
            label,
            integer.format(value),
            percent(rate),
          ])}
          title="Valores de cancelamentos e ausências"
        />
      </CardContent>
    </Card>
  )
}

function CustomerReport({ result }: { result: ReportingResult }) {
  const identityUnavailable = Boolean(result.customers.unavailableReason)
  const values = identityUnavailable
    ? [{ label: "Identidade indisponível", value: result.customers.unknownCount }]
    : [
        { label: "Novos", value: result.customers.newCount },
        { label: "Recorrentes", value: result.customers.returningCount },
        { label: "Desconhecidos", value: result.customers.unknownCount },
      ]
  return (
    <Card>
      <CardHeader>
        <CardTitle
          aria-level={2}
          className="flex items-center gap-2"
          id="customer-title"
          role="heading"
        >
          <UsersRoundIcon aria-hidden="true" className="size-4" />
          Clientes novos e recorrentes
        </CardTitle>
        <CardDescription id="customer-description">
          {result.customers.unavailableReason ??
            `${result.customers.identifiableCount} cliente(s) identificável(is). ${result.customers.unknownCount} cliente(s) sem chave estável ficam fora das proporções.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <ChartContainer
          aria-describedby="customer-description"
          aria-label="Gráfico de barras de clientes novos, recorrentes e desconhecidos"
          aria-labelledby="customer-title"
          config={reportChartConfig}
          role="img"
        >
          <BarChart accessibilityLayer data={values}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Bar dataKey="value" fill="var(--color-primary)" isAnimationActive={false} radius={4} />
          </BarChart>
        </ChartContainer>
        <AccessibleTable
          columns={["Classificação", "Quantidade", "Proporção identificável"]}
          rows={
            identityUnavailable
              ? [
                  ["Novos", "Indisponível", "Indisponível"],
                  ["Recorrentes", "Indisponível", "Indisponível"],
                  [
                    "Identidade indisponível",
                    integer.format(result.customers.unknownCount),
                    "Excluídos da proporção",
                  ],
                ]
              : [
                  [
                    "Novos",
                    integer.format(result.customers.newCount),
                    percent(result.customers.newRateBasisPoints),
                  ],
                  [
                    "Recorrentes",
                    integer.format(result.customers.returningCount),
                    percent(result.customers.returningRateBasisPoints),
                  ],
                  [
                    "Desconhecidos",
                    integer.format(result.customers.unknownCount),
                    "Excluídos da proporção",
                  ],
                ]
          }
          title="Valores de clientes novos, recorrentes e desconhecidos"
        />
      </CardContent>
    </Card>
  )
}

function AccessibleTable({
  columns,
  rows,
  title,
}: {
  columns: readonly string[]
  rows: readonly (readonly string[])[]
  title: string
}) {
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border">
      <table className="w-full min-w-96 border-collapse text-left text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="bg-muted/60">
          <tr>
            {columns.map((column) => (
              <th className="px-3 py-2 font-medium" key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-muted-foreground" colSpan={columns.length}>
                Nenhum valor disponível.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr className="border-t" key={row.join("|")}>
                {row.map((value, cellIndex) => {
                  const column = columns[cellIndex] ?? value
                  return cellIndex === 0 ? (
                    <th className="px-3 py-2 font-normal" key={column} scope="row">
                      {value}
                    </th>
                  ) : (
                    <td className="px-3 py-2 tabular-nums" key={column}>
                      {value}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function ReportingLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-4" role="status">
      <span className="sr-only">Carregando relatórios</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton className="h-24" key={key} />
        ))}
      </div>
      <Skeleton className="h-80" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}

function money(cents: number) {
  return currency.format(cents / 100)
}

function compactMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency",
  }).format(cents / 100)
}

function percent(basisPoints: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(basisPoints / 100)}%`
}

function shortDate(value: string) {
  const [, month, day] = value.split("-")
  return `${day}/${month}`
}

function longDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}
