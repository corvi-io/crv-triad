import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { BanknoteIcon, CalendarDaysIcon, HistoryIcon, StoreIcon } from "lucide-react"
import { useRef, useState } from "react"
import { ptBR } from "react-day-picker/locale"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { SchedulingUnitId } from "@/modules/scheduling/contracts"
import { FilterTrigger } from "@/modules/shared/components/data-display/filter-trigger"
import { SingleSelectListFilter } from "@/modules/shared/components/data-display/list-filter"
import { MetricCard } from "@/modules/shared/components/data-display/metric-card"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { formatDateOnly, parseDateOnly } from "@/modules/shared/components/forms/date-picker"
import { FormField, getFieldDescriptionIds } from "@/modules/shared/components/forms/form-layout"
import { MaskedInput } from "@/modules/shared/components/forms/masked-input"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { Button } from "@/modules/shared/components/ui/button"
import { Calendar } from "@/modules/shared/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/modules/shared/components/ui/popover"
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
import {
  useCashMovement,
  useCloseDay,
  useDailyClosing,
  useDailyClosings,
  useOpenCashDay,
  useOpenDaySummary,
  useReopenCashDay,
  useRevenueUnits,
} from "./queries"
import { useRevenueOperationsRepository } from "./repository-context"

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
type CashContextChangeHandler = (context: { date?: string; unitId?: SchedulingUnitId }) => void

type CashPageProps = {
  closingId: string | null
  onOpenClosing: (id: string | null) => void
  query: OperationalDayQuery
}

export function CashPage({ closingId, onOpenClosing, query }: CashPageProps) {
  const repository = useRevenueOperationsRepository()
  const summaryQuery = useOpenDaySummary(query)
  const historyQuery = useDailyClosings({
    date: query.date,
    limit: CLOSING_HISTORY_LIMIT,
    scenarioId: query.scenarioId,
    unitId: query.unitId,
  })
  const detailQuery = useDailyClosing(closingId, query)

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
  if (!summary.id && repository.openCashDay) {
    return <CashOpening query={query} />
  }
  return (
    <div className="space-y-6">
      {closingId ? (
        <ClosingDetail
          closing={detailQuery.data}
          isPending={detailQuery.isPending}
          onClose={() => onOpenClosing(null)}
        />
      ) : null}
      <OpenDay canReopen={Boolean(repository.reopenDay)} summary={summary} query={query} />
      <ClosingHistory closings={historyQuery.data} onOpenClosing={onOpenClosing} />
    </div>
  )
}

export function CashFilters({
  date,
  onContextChange,
  unitId,
}: {
  date: string
  onContextChange: CashContextChangeHandler
  unitId: SchedulingUnitId
}) {
  const units = useRevenueUnits()
  const selectedDate = parseDateOnly(date)
  const [dateMenuOpen, setDateMenuOpen] = useState(false)
  const [displayedMonth, setDisplayedMonth] = useState(() => selectedDate ?? new Date())
  const dateLabel = selectedDate
    ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
    : "Escolher data"

  return (
    <fieldset
      className="flex min-w-0 items-center gap-1.5 overflow-x-auto rounded-lg border bg-card p-2"
      data-slot="cash-filters"
    >
      <legend className="sr-only">Filtros do caixa</legend>
      <SingleSelectListFilter
        showSelectedLabel
        icon={StoreIcon}
        id="cash-unit-filter"
        inactiveValue="centro"
        label="Unidade"
        options={
          units.data?.length
            ? units.data.map((unit) => ({ label: unit.name, value: unit.id }))
            : [
                { label: "Centro", value: "centro" },
                { label: "Artesão", value: "artesao" },
              ]
        }
        value={unitId}
        onValueChange={(nextUnitId) => onContextChange({ unitId: nextUnitId })}
      />
      <Popover
        open={dateMenuOpen}
        onOpenChange={(open) => {
          if (open) setDisplayedMonth(selectedDate ?? new Date())
          setDateMenuOpen(open)
        }}
      >
        <PopoverTrigger
          render={
            <FilterTrigger
              active={!isToday(date)}
              aria-label={`Data operacional: ${dateLabel}`}
              icon={CalendarDaysIcon}
              id="cash-date-filter"
              label={dateLabel}
            />
          }
        />
        <PopoverContent align="start" className="w-auto p-0">
          <PopoverTitle className="sr-only">Data operacional</PopoverTitle>
          <Calendar
            autoFocus
            captionLayout="dropdown"
            endMonth={new Date(2100, 11)}
            locale={ptBR}
            mode="single"
            month={displayedMonth}
            selected={selectedDate}
            startMonth={new Date(1900, 0)}
            onMonthChange={setDisplayedMonth}
            onSelect={(nextDate) => {
              if (!nextDate) return
              onContextChange({ date: formatDateOnly(nextDate) })
              setDateMenuOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </fieldset>
  )
}

function CashOpening({ query }: { query: OperationalDayQuery }) {
  const mutation = useOpenCashDay(query)
  const [openingCash, setOpeningCash] = useState("")
  const operationId = useRef("")
  const value = moneyToCents(openingCash)
  const canOpen = isToday(query.date)

  async function open() {
    if (value === null) return
    operationId.current ||= crypto.randomUUID()
    try {
      await mutation.mutateAsync({ openingCashCents: value, operationId: operationId.current })
      operationId.current = ""
    } catch {
      // The retained key lets an unknown outcome be reconciled by an exact retry.
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Abrir caixa operacional</CardTitle>
        <CardDescription>
          Informe o dinheiro físico contado no início. Nenhum saldo anterior será carregado
          automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canOpen ? (
          <Alert>
            <AlertTitle>Nenhum caixa nesta data</AlertTitle>
            <AlertDescription>
              A abertura usa sempre a data operacional atual definida pelo servidor.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <FormField
              required
              description="Use o valor efetivamente contado, inclusive quando for zero."
              error={openingCash && value === null ? "Informe um valor válido." : undefined}
              icon={BanknoteIcon}
              id="opening-cash"
              label="Dinheiro inicial"
            >
              <MaskedInput
                aria-invalid={Boolean(openingCash && value === null)}
                id="opening-cash"
                mask="brMoney"
                value={openingCash}
                onValueChange={setOpeningCash}
              />
            </FormField>
            {mutation.isError ? (
              <Alert>
                <AlertTitle>Caixa não aberto</AlertTitle>
                <AlertDescription>
                  Não foi possível confirmar a abertura. Seus dados foram mantidos; tente novamente.
                </AlertDescription>
              </Alert>
            ) : null}
            <Button
              type="button"
              disabled={value === null}
              isLoading={mutation.isPending}
              onClick={() => void open()}
            >
              Abrir caixa
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function OpenDay({
  canReopen,
  query,
  summary,
}: {
  canReopen: boolean
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
          label="Receita líquida registrada"
          value={formatMoney(summary.receivedCents)}
          description={`${summary.paidSaleCount} registro${summary.paidSaleCount === 1 ? "" : "s"} ativo${summary.paidSaleCount === 1 ? "" : "s"}`}
        />
        <MetricCard
          label="Dinheiro esperado"
          value={formatMoney(summary.expectedCashCents)}
          description="Somente pagamentos registrados em dinheiro."
        />
        <MetricCard
          label="Registros cancelados"
          value={formatMoney(summary.reversedReceiptCents ?? 0)}
          description={`${summary.reversalCount ?? summary.cancellationCount} cancelamento(s) financeiro(s)`}
        />
        <MetricCard
          label="Comandas pendentes"
          value={summary.pendingCheckoutCount ?? 0}
          description="Serviços concluídos ainda não são receita."
        />
      </div>
      {summary.paidSaleCount === 0 ? (
        <Alert>
          <AlertTitle>Nenhum pagamento registrado nesta data</AlertTitle>
          <AlertDescription>
            Comandas pendentes não entram na receita. O dia ainda pode ser conferido e fechado.
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
        <SummaryCard title="Conciliação física">
          <SummaryList
            rows={[
              { label: "Dinheiro inicial", value: formatMoney(summary.openingCashCents ?? 0) },
              { label: "Suprimentos", value: `+ ${formatMoney(summary.supplyCents ?? 0)}` },
              { label: "Retiradas", value: `− ${formatMoney(summary.withdrawalCents ?? 0)}` },
              {
                label: "Estornos em dinheiro",
                value: `− ${formatMoney(summary.receiptReversalCents ?? 0)}`,
              },
              { label: "Descontos", value: `− ${formatMoney(summary.discountCents)}` },
              { label: "Acréscimos", value: `+ ${formatMoney(summary.surchargeCents)}` },
            ]}
          />
        </SummaryCard>
      </div>
      {summary.status === "closed" ? (
        <>
          <ClosedCashSummary closing={summary} />
          {summary.id && canReopen ? <ReopenCashDay query={query} summary={summary} /> : null}
        </>
      ) : (
        <>
          {summary.id ? <CashMovementForm query={query} summary={summary} /> : null}
          <CashClosingForm
            key={`${query.scenarioId}:${query.unitId}:${query.date}:${summary.expectedCashCents}`}
            query={query}
            summary={summary}
          />
        </>
      )}
    </section>
  )
}

function CashMovementForm({
  query,
  summary,
}: {
  query: OperationalDayQuery
  summary: OpenDaySummary
}) {
  const mutation = useCashMovement(query)
  const [kind, setKind] = useState<"supply" | "withdrawal">("supply")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const operationId = useRef("")
  const amountCents = moneyToCents(amount)
  const valid = amountCents !== null && amountCents > 0 && reason.trim().length >= 3

  async function submit() {
    if (!summary.id || !valid || amountCents === null) return
    operationId.current ||= crypto.randomUUID()
    try {
      await mutation.mutateAsync({
        cashDayId: summary.id,
        kind,
        amountCents,
        reason,
        operationId: operationId.current,
      })
      operationId.current = ""
      setAmount("")
      setReason("")
    } catch {
      // Keep the draft and command key for safe retry after an unknown outcome.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimento de dinheiro</CardTitle>
        <CardDescription>
          Suprimentos e retiradas não alteram a receita de serviços e ficam no histórico imutável.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <FormField id="movement-kind" label="Tipo" required>
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            id="movement-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as "supply" | "withdrawal")}
          >
            <option value="supply">Suprimento</option>
            <option value="withdrawal">Retirada</option>
          </select>
        </FormField>
        <FormField
          id="movement-amount"
          label="Valor"
          required
          error={
            amount && (amountCents === null || amountCents <= 0)
              ? "Informe um valor maior que zero."
              : undefined
          }
        >
          <MaskedInput
            id="movement-amount"
            mask="brMoney"
            value={amount}
            onValueChange={setAmount}
          />
        </FormField>
        <FormField
          id="movement-reason"
          label="Motivo"
          required
          error={reason && reason.trim().length < 3 ? "Use pelo menos 3 caracteres." : undefined}
        >
          <Textarea
            id="movement-reason"
            maxLength={160}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
        {mutation.isError ? (
          <Alert className="md:col-span-3">
            <AlertTitle>Movimento não registrado</AlertTitle>
            <AlertDescription>
              Revise o caixa atual e tente novamente. O rascunho foi mantido.
            </AlertDescription>
          </Alert>
        ) : null}
        <Button
          className="w-fit md:col-span-3"
          type="button"
          disabled={!valid}
          isLoading={mutation.isPending}
          onClick={() => void submit()}
        >
          Registrar {kind === "supply" ? "suprimento" : "retirada"}
        </Button>
      </CardContent>
    </Card>
  )
}

function ReopenCashDay({
  query,
  summary,
}: {
  query: OperationalDayQuery
  summary: DailyClosingSnapshot
}) {
  const mutation = useReopenCashDay(query)
  const [reason, setReason] = useState("")
  const operationId = useRef("")

  async function reopen() {
    if (!summary.id || reason.trim().length < 3) return
    operationId.current ||= crypto.randomUUID()
    try {
      await mutation.mutateAsync({
        cashDayId: summary.id,
        operationId: operationId.current,
        reason,
      })
      operationId.current = ""
    } catch {
      // Preserve the correction reason and key for an exact retry.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reabrir caixa de hoje</CardTitle>
        <CardDescription>
          A revisão de fechamento permanece preservada. Apenas o dia operacional atual, sem dia
          posterior, pode ser reaberto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField id="reopen-reason" label="Motivo da reabertura" required>
          <Textarea
            id="reopen-reason"
            maxLength={160}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </FormField>
        {mutation.isError ? (
          <Alert>
            <AlertTitle>Reabertura não realizada</AlertTitle>
            <AlertDescription>
              Verifique se este é o caixa atual e se não existe um dia posterior.
            </AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={reason.trim().length < 3}
          isLoading={mutation.isPending}
          onClick={() => void reopen()}
        >
          Reabrir caixa
        </Button>
      </CardContent>
    </Card>
  )
}

function CashClosingForm({
  query,
  summary,
}: {
  query: OperationalDayQuery
  summary: OpenDaySummary
}) {
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
          Conte o dinheiro físico. O fechamento cria uma revisão imutável; uma reabertura autorizada
          preserva esta revisão no histórico.
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

function isToday(date: string) {
  return date === formatDateOnly(new Date())
}
