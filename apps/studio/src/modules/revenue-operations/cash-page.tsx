import { zodResolver } from "@hookform/resolvers/zod"
import { BanknoteIcon, CalendarDaysIcon, HistoryIcon, StoreIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useAuth } from "@/modules/auth/services/auth-provider"
import type { SchedulingUnitId } from "@/modules/scheduling/contracts"
import { MetricCard } from "@/modules/shared/components/data-display/metric-card"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { DatePicker } from "@/modules/shared/components/forms/date-picker"
import { FormField, getFieldDescriptionIds } from "@/modules/shared/components/forms/form-layout"
import { MaskedInput } from "@/modules/shared/components/forms/masked-input"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
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
import { Textarea } from "@/modules/shared/components/ui/textarea"
import { CLOSING_HISTORY_LIMIT } from "./cash"
import type {
  DailyClosingSnapshot,
  OpenDaySummary,
  OperationalDayQuery,
  TenderMethod,
} from "./contracts"
import { RevenueOperationsError } from "./contracts"
import { formatMoney } from "./money"
import { useCloseDay, useDailyClosing, useDailyClosings, useOpenDaySummary } from "./queries"

const cashFormSchema = z
  .object({
    countedCash: z.string().min(1, "Informe o valor contado em dinheiro."),
    reason: z.string().max(160, "O motivo deve ter no máximo 160 caracteres."),
  })
  .superRefine((values, context) => {
    const counted = moneyToCents(values.countedCash)
    if (counted == null) {
      context.addIssue({
        code: "custom",
        message: "Informe um valor contado válido.",
        path: ["countedCash"],
      })
    }
  })

type CashFormValues = z.infer<typeof cashFormSchema>

type CashPageProps = {
  closingId: string | null
  onContextChange: (context: { date?: string; unitId?: SchedulingUnitId }) => void
  onOpenClosing: (id: string | null) => void
  query: OperationalDayQuery
}

export function CashPage({ closingId, onContextChange, onOpenClosing, query }: CashPageProps) {
  const summaryQuery = useOpenDaySummary(query)
  const historyQuery = useDailyClosings({
    limit: CLOSING_HISTORY_LIMIT,
    scenarioId: query.scenarioId,
    unitId: query.unitId,
  })
  const detailQuery = useDailyClosing(closingId, query.unitId)

  if (summaryQuery.isPending || historyQuery.isPending) {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando caixa"
        className="grid gap-4 md:grid-cols-3"
        role="status"
      >
        {["Recebimentos", "Dinheiro esperado", "Histórico"].map((label) => (
          <MetricCard isLoading key={label} label={label} value={null} />
        ))}
      </div>
    )
  }
  if (summaryQuery.isError || historyQuery.isError) {
    return (
      <Alert>
        <AlertTitle>Não foi possível carregar o caixa</AlertTitle>
        <AlertDescription>
          Revise a unidade e a data ou tente novamente. Nenhum fechamento foi alterado.
        </AlertDescription>
      </Alert>
    )
  }

  const summary = summaryQuery.data
  return (
    <div className="space-y-6">
      <CashContext date={query.date} unitId={query.unitId} onContextChange={onContextChange} />
      {closingId ? (
        <ClosingDetail
          closing={detailQuery.data}
          isPending={detailQuery.isPending}
          onClose={() => onOpenClosing(null)}
        />
      ) : null}
      <OpenDay summary={summary} query={query} />
      <ClosingHistory closings={historyQuery.data} onOpenClosing={onOpenClosing} />
    </div>
  )
}

function CashContext({
  date,
  onContextChange,
  unitId,
}: {
  date: string
  onContextChange: CashPageProps["onContextChange"]
  unitId: SchedulingUnitId
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contexto operacional</CardTitle>
        <CardDescription>
          Todos os valores são limitados à unidade e à data escolhidas.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField id="cash-unit" icon={StoreIcon} label="Unidade">
          <Select
            value={unitId}
            onValueChange={(value) => value && onContextChange({ unitId: value })}
          >
            <SelectTrigger id="cash-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="centro">Centro</SelectItem>
              <SelectItem value="artesao">Artesão</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="cash-date" icon={CalendarDaysIcon} label="Data operacional">
          <DatePicker
            id="cash-date"
            placeholder="Selecione a data"
            value={date}
            onValueChange={(nextDate) => onContextChange({ date: nextDate })}
          />
        </FormField>
      </CardContent>
    </Card>
  )
}

function OpenDay({
  query,
  summary,
}: {
  query: OperationalDayQuery
  summary: OpenDaySummary | DailyClosingSnapshot
}) {
  const paymentTotal = summary.paymentMethods.reduce((sum, item) => sum + item.totalCents, 0)
  return (
    <section aria-labelledby="cash-day-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl" id="cash-day-title">
            Resumo do dia
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(summary.date)} · Unidade {summary.unitName}
          </p>
        </div>
        <StatusBadge tone={summary.status === "closed" ? "success" : "info"}>
          {summary.status === "closed" ? "Dia fechado" : "Dia aberto"}
        </StatusBadge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Recebido"
          value={formatMoney(summary.receivedCents)}
          description={`${summary.paidSaleCount} venda${summary.paidSaleCount === 1 ? "" : "s"} paga${summary.paidSaleCount === 1 ? "" : "s"}`}
        />
        <MetricCard
          label="Dinheiro esperado"
          value={formatMoney(summary.expectedCashCents)}
          description="Somente pagamentos registrados em dinheiro."
        />
        <MetricCard
          label="Comissões"
          value={formatMoney(summary.commissionCents)}
          description={`Barbearia: ${formatMoney(summary.barbershopCents)}`}
        />
        <MetricCard
          label="Ocorrências"
          value={summary.cancellationCount + summary.noShowCount}
          description={`${summary.cancellationCount} cancelamento(s) · ${summary.noShowCount} falta(s)`}
        />
      </div>
      {summary.paidSaleCount === 0 ? (
        <Alert>
          <AlertTitle>Nenhuma venda paga nesta data</AlertTitle>
          <AlertDescription>
            Os totais estão zerados. Este cenário ainda permite registrar a conferência e fechar o
            dia.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryCard title="Formas de pagamento">
          {summary.paymentMethods.length ? (
            <SummaryList
              rows={summary.paymentMethods.map(({ method, totalCents }) => ({
                label: paymentMethodLabel[method],
                value: formatMoney(totalCents),
              }))}
            />
          ) : (
            <p className="text-muted-foreground">Nenhum pagamento registrado.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Total conciliado: {formatMoney(paymentTotal)}
          </p>
        </SummaryCard>
        <SummaryCard title="Ajustes e resultado">
          <SummaryList
            rows={[
              { label: "Descontos", value: `− ${formatMoney(summary.discountCents)}` },
              { label: "Acréscimos", value: `+ ${formatMoney(summary.surchargeCents)}` },
              { label: "Comissões", value: formatMoney(summary.commissionCents) },
              { label: "Valor da barbearia", value: formatMoney(summary.barbershopCents) },
            ]}
          />
        </SummaryCard>
        <SummaryCard title="Valores por profissional" className="lg:col-span-2">
          {summary.professionals.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.professionals.map((professional) => (
                <div className="rounded-lg border p-3" key={professional.professionalId}>
                  <p className="font-medium">{professional.professionalName}</p>
                  <p className="mt-1 text-sm tabular-nums">
                    Receita {formatMoney(professional.revenueCents)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Comissão {formatMoney(professional.commissionCents)} · Barbearia{" "}
                    {formatMoney(professional.barbershopCents)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum valor profissional nesta data.</p>
          )}
        </SummaryCard>
      </div>
      {summary.status === "closed" ? (
        <ClosedCashSummary closing={summary} />
      ) : (
        <CashClosingForm query={query} summary={summary} />
      )}
    </section>
  )
}

function CashClosingForm({
  query,
  summary,
}: {
  query: OperationalDayQuery
  summary: OpenDaySummary
}) {
  const { session } = useAuth()
  const closeDay = useCloseDay(query)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const form = useForm<CashFormValues>({
    defaultValues: {
      countedCash:
        query.scenarioId === "cash-positive-difference"
          ? centsToMoney(summary.expectedCashCents + 500)
          : query.scenarioId === "cash-negative-difference"
            ? centsToMoney(Math.max(0, summary.expectedCashCents - 500))
            : centsToMoney(summary.expectedCashCents),
      reason: query.scenarioId === "cash-long-reason" ? "Conferência detalhada do caixa." : "",
    },
    resolver: zodResolver(cashFormSchema),
  })
  const countedCashCents = moneyToCents(form.watch("countedCash")) ?? 0
  const differenceCents = countedCashCents - summary.expectedCashCents
  const reasonError = form.formState.errors.reason?.message
  const countedError = form.formState.errors.countedCash?.message

  function reviewClose(values: CashFormValues) {
    if (differenceCents !== 0 && values.reason.trim().length < 3) {
      form.setError("reason", { message: "Explique a diferença com pelo menos 3 caracteres." })
      requestAnimationFrame(() => form.setFocus("reason"))
      return
    }
    setConfirmationOpen(true)
  }

  async function confirmClose() {
    const values = form.getValues()
    if (differenceCents !== 0 && values.reason.trim().length < 3) {
      form.setError("reason", { message: "Explique a diferença com pelo menos 3 caracteres." })
      setConfirmationOpen(false)
      form.setFocus("reason")
      return
    }
    try {
      await closeDay.mutateAsync({
        countedCashCents,
        date: query.date,
        operationId: crypto.randomUUID(),
        reason: values.reason,
        responsiblePersonName: session?.user.name || "Responsável do turno",
        scenarioId: query.scenarioId,
        unitId: query.unitId,
      })
      setConfirmationOpen(false)
    } catch (error) {
      setConfirmationOpen(false)
      form.setError("root", {
        message:
          error instanceof RevenueOperationsError
            ? error.message
            : "Não foi possível fechar o dia. Tente novamente.",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conferência e fechamento</CardTitle>
        <CardDescription>
          Conte o dinheiro físico. O fechamento cria um registro imutável e não poderá ser reaberto
          nesta experiência.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate className="space-y-5" onSubmit={form.handleSubmit(reviewClose)}>
          {form.formState.errors.root?.message ? (
            <Alert role="alert">
              <AlertTitle>Fechamento não realizado</AlertTitle>
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          ) : null}
          <FormField
            required
            description={`Esperado em dinheiro: ${formatMoney(summary.expectedCashCents)}`}
            error={countedError}
            icon={BanknoteIcon}
            id="counted-cash"
            label="Dinheiro contado"
          >
            <MaskedInput
              {...form.register("countedCash")}
              aria-describedby={getFieldDescriptionIds("counted-cash", true, Boolean(countedError))}
              aria-invalid={Boolean(countedError)}
              id="counted-cash"
              mask="brMoney"
              value={form.watch("countedCash")}
              onValueChange={(value) =>
                form.setValue("countedCash", value, { shouldDirty: true, shouldValidate: true })
              }
            />
          </FormField>
          <div aria-live="polite" className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Diferença calculada</p>
            <p className="mt-1 font-semibold text-xl tabular-nums">
              {differenceCents > 0 ? "+" : ""}
              {formatMoney(differenceCents)}
            </p>
            <p className="text-xs text-muted-foreground">
              Dinheiro contado menos dinheiro esperado.
            </p>
          </div>
          <FormField
            required={differenceCents !== 0}
            description="Não informe dados de clientes, cartões, credenciais ou outras informações sensíveis."
            error={reasonError}
            id="cash-reason"
            label="Motivo da diferença"
          >
            <Textarea
              {...form.register("reason")}
              aria-describedby={getFieldDescriptionIds("cash-reason", true, Boolean(reasonError))}
              aria-invalid={Boolean(reasonError)}
              id="cash-reason"
              maxLength={160}
              placeholder={
                differenceCents === 0
                  ? "Opcional quando não há diferença"
                  : "Explique a diferença encontrada"
              }
            />
            <p className="text-right text-xs text-muted-foreground">
              {form.watch("reason").length}/160
            </p>
          </FormField>
          <div className="flex justify-end">
            <Button type="submit">Fechar dia</Button>
          </div>
        </form>
      </CardContent>
      <ConfirmationDialog
        cancelLabel="Revisar conferência"
        confirmLabel="Confirmar fechamento"
        description={`Esperado ${formatMoney(summary.expectedCashCents)}, contado ${formatMoney(countedCashCents)} e diferença ${formatMoney(differenceCents)}. O fechamento será imutável.`}
        isLoading={closeDay.isPending}
        isOpen={confirmationOpen}
        title="Confirmar fechamento do dia?"
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={confirmClose}
      />
    </Card>
  )
}

function ClosedCashSummary({ closing }: { closing: DailyClosingSnapshot }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Fechamento registrado</h3>
        </CardTitle>
        <CardDescription>
          Fechado por {closing.responsiblePersonName} em {formatInstant(closing.closedAt)}. Este
          registro é somente para leitura.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SummaryList
          rows={[
            { label: "Dinheiro esperado", value: formatMoney(closing.expectedCashCents) },
            { label: "Dinheiro contado", value: formatMoney(closing.countedCashCents) },
            {
              label: "Diferença",
              value: `${closing.differenceCents > 0 ? "+" : ""}${formatMoney(closing.differenceCents)}`,
            },
            { label: "Motivo", value: closing.reason || "Sem diferença informada" },
          ]}
        />
      </CardContent>
    </Card>
  )
}

function ClosingHistory({
  closings,
  onOpenClosing,
}: {
  closings: readonly DailyClosingSnapshot[]
  onOpenClosing: (id: string | null) => void
}) {
  return (
    <section aria-labelledby="closing-history-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <HistoryIcon aria-hidden="true" className="size-5" />
        <h2 className="font-heading text-xl" id="closing-history-title">
          Histórico de fechamentos
        </h2>
      </div>
      {closings.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {closings.map((closing) => (
            <li key={closing.id}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{formatDate(closing.date)}</CardTitle>
                  <CardDescription>
                    {closing.unitName} · {closing.responsiblePersonName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 items-end justify-between gap-3">
                  <div>
                    <p className="font-semibold tabular-nums">
                      {formatMoney(closing.receivedCents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Diferença {formatMoney(closing.differenceCents)}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => onOpenClosing(closing.id)}>
                    Visualizar
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Alert>
          <AlertTitle>Nenhum fechamento anterior</AlertTitle>
          <AlertDescription>
            O primeiro fechamento desta unidade aparecerá aqui, sempre somente para leitura.
          </AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-muted-foreground">
        Exibindo no máximo {CLOSING_HISTORY_LIMIT} fechamentos desta unidade.
      </p>
    </section>
  )
}

function ClosingDetail({
  closing,
  isPending,
  onClose,
}: {
  closing: DailyClosingSnapshot | undefined
  isPending: boolean
  onClose: () => void
}) {
  if (isPending)
    return (
      <Alert aria-busy="true">
        <AlertTitle>Carregando fechamento</AlertTitle>
      </Alert>
    )
  if (!closing) {
    return (
      <Alert>
        <AlertTitle>Fechamento não encontrado</AlertTitle>
        <AlertDescription>
          O registro solicitado não está disponível nesta unidade.
          <Button className="mt-3" type="button" variant="outline" onClick={onClose}>
            Voltar ao caixa
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <section aria-labelledby="closing-detail-title" className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl" id="closing-detail-title">
            Fechamento de {formatDate(closing.date)}
          </h2>
          <p className="text-sm text-muted-foreground">
            Somente leitura · {closing.unitName} · {formatInstant(closing.closedAt)}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>
          Fechar detalhe
        </Button>
      </div>
      <div className="mt-4">
        <ClosedCashSummary closing={closing} />
      </div>
    </section>
  )
}

function SummaryCard({
  children,
  className,
  title,
}: {
  children: React.ReactNode
  className?: string
  title: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function SummaryList({ rows }: { rows: readonly { label: string; value: string }[] }) {
  return (
    <dl className="divide-y">
      {rows.map((row) => (
        <div
          className="flex flex-wrap justify-between gap-2 py-2 first:pt-0 last:pb-0"
          key={row.label}
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="max-w-full text-right font-medium tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const paymentMethodLabel: Record<TenderMethod, string> = {
  cash: "Dinheiro",
  credit: "Crédito",
  debit: "Débito",
  pix: "Pix",
}

function moneyToCents(value: string) {
  if (!/^\d+\.\d{2}$/.test(value)) return null
  const [integer, fraction] = value.split(".")
  const cents = Number(integer) * 100 + Number(fraction)
  return Number.isSafeInteger(cents) ? cents : null
}

function centsToMoney(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  )
}

function formatInstant(instant: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(instant))
}
