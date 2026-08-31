import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftIcon,
  BanknoteIcon,
  CircleCheckIcon,
  CreditCardIcon,
  LandmarkIcon,
  PlusIcon,
  ReceiptTextIcon,
  ScissorsIcon,
  WalletCardsIcon,
} from "lucide-react"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { Badge } from "@/modules/shared/components/ui/badge"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/modules/shared/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Separator } from "@/modules/shared/components/ui/separator"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import type { Checkout, PaymentTender, TenderMethod } from "./contracts"
import { RevenueOperationsError } from "./contracts"
import { formatMoney, REASON_MAX_LENGTH, tenderSummary } from "./money"
import {
  useCheckout,
  useCommissionPreview,
  useCompletePayment,
  useReplaceTenders,
  useUpdateCheckoutAdjustments,
  useUpdateCheckoutLine,
} from "./queries"

const moneyPattern = /^\d+(?:[,.]\d{1,2})?$/
const adjustmentSchema = z
  .object({
    discount: z.string().regex(moneyPattern, "Informe um valor em reais válido."),
    discountReason: z
      .string()
      .max(REASON_MAX_LENGTH, `Use no máximo ${REASON_MAX_LENGTH} caracteres.`),
    surcharge: z.string().regex(moneyPattern, "Informe um valor em reais válido."),
    surchargeReason: z
      .string()
      .max(REASON_MAX_LENGTH, `Use no máximo ${REASON_MAX_LENGTH} caracteres.`),
  })
  .superRefine((values, context) => {
    if (toCents(values.discount) > 0 && values.discountReason.trim().length < 3) {
      context.addIssue({
        code: "custom",
        message: "Informe o motivo do desconto.",
        path: ["discountReason"],
      })
    }
    if (toCents(values.surcharge) > 0 && values.surchargeReason.trim().length < 3) {
      context.addIssue({
        code: "custom",
        message: "Informe o motivo do acréscimo.",
        path: ["surchargeReason"],
      })
    }
  })

type AdjustmentValues = z.infer<typeof adjustmentSchema>

export function firstEnabledTenderMethod(methods: readonly TenderMethod[]) {
  const first = methods[0]
  if (!first) throw new Error("Nenhuma forma de pagamento está habilitada.")
  return first
}

const tenderSchema = z
  .object({
    applied: z.string().regex(moneyPattern, "Informe um valor em reais válido."),
    method: z.enum(["pix", "cash", "debit", "credit"]),
    received: z.string(),
  })
  .superRefine((values, context) => {
    if (toCents(values.applied) <= 0) {
      context.addIssue({
        code: "custom",
        message: "Informe um valor maior que zero.",
        path: ["applied"],
      })
    }
    if (
      values.method === "cash" &&
      (!moneyPattern.test(values.received) || toCents(values.received) < toCents(values.applied))
    ) {
      context.addIssue({
        code: "custom",
        message: "O valor recebido deve cobrir o valor aplicado.",
        path: ["received"],
      })
    }
  })

type TenderValues = z.infer<typeof tenderSchema>

export function CheckoutPage({ onBack, sessionId }: { onBack: () => void; sessionId: string }) {
  const query = useCheckout(sessionId)
  if (query.isPending) {
    return <Skeleton className="h-[32rem] w-full" aria-label="Carregando pagamento" />
  }
  if (
    query.error instanceof RevenueOperationsError &&
    ["not-found", "not-ready"].includes(query.error.code)
  ) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Pagamento indisponível</EmptyTitle>
          <EmptyDescription>
            O atendimento não existe ou ainda não está pronto para pagamento.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onBack}>
            Voltar para o atendimento
          </Button>
        </EmptyContent>
      </Empty>
    )
  }
  if (query.isError || !query.data) {
    return (
      <Alert>
        <AlertTitle>Não foi possível carregar o pagamento</AlertTitle>
        <AlertDescription>Tente novamente. Nenhum pagamento foi registrado.</AlertDescription>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </Alert>
    )
  }
  return (
    <CheckoutWorkspace
      key={`${query.data.id}-${query.data.status}`}
      checkout={query.data}
      onBack={onBack}
    />
  )
}

function CheckoutWorkspace({ checkout, onBack }: { checkout: Checkout; onBack: () => void }) {
  const commissions = useCommissionPreview(checkout.id)
  const completePayment = useCompletePayment(checkout.id)
  const [confirming, setConfirming] = useState(false)
  const operationId = useRef("")
  const summary = tenderSummary(checkout.tenders, checkout.totalCents)
  const paid = checkout.status === "paid"

  async function complete() {
    operationId.current ||= createOperationId()
    try {
      await completePayment.mutateAsync({
        operationId: operationId.current,
        sessionId: checkout.id,
      })
      operationId.current = ""
      setConfirming(false)
      toast.success("Pagamento concluído.")
    } catch (error) {
      toast.error(
        error instanceof RevenueOperationsError
          ? error.message
          : "Não foi possível concluir o pagamento.",
      )
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Button type="button" variant="ghost" className="w-fit" onClick={onBack}>
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        Voltar para o atendimento
      </Button>
      <header className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {checkout.source === "scheduled"
              ? "Atendimento agendado"
              : "Atendimento sem agendamento"}
          </p>
          <h1 className="break-words font-heading text-2xl font-semibold">
            {checkout.customerName}
          </h1>
          <p className="text-sm text-muted-foreground">{checkout.unitName}</p>
        </div>
        <Badge variant={paid ? "outline" : "secondary"}>
          {paid ? "Concluído · Pago" : "Pronto para pagamento"}
        </Badge>
      </header>

      {paid ? (
        <Alert>
          <CircleCheckIcon aria-hidden="true" />
          <AlertTitle>Pagamento concluído</AlertTitle>
          <AlertDescription>
            Este registro é somente leitura e não é um comprovante fiscal.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <ReceiptTextIcon aria-hidden="true" />
          <AlertTitle>Registro de demonstração</AlertTitle>
          <AlertDescription>
            Nenhum valor real será processado. Não informe dados de cartão, credenciais ou
            informações pessoais.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ServiceLines checkout={checkout} readOnly={paid} />
          {!paid ? <AdjustmentForm checkout={checkout} /> : null}
          <CommissionPreview checkout={checkout} commissions={commissions.data ?? []} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <PaymentSection checkout={checkout} readOnly={paid} />
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Resumo exato</h2>
              </CardTitle>
              <CardDescription>Valores calculados em centavos inteiros.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3" aria-live="polite">
              <SummaryRow
                label="Subtotal"
                value={formatMoney(checkout.lines.reduce((sum, line) => sum + line.priceCents, 0))}
              />
              <SummaryRow
                label="Desconto"
                value={`− ${formatMoney(checkout.adjustments.discountCents)}`}
              />
              <SummaryRow
                label="Acréscimo"
                value={`+ ${formatMoney(checkout.adjustments.surchargeCents)}`}
              />
              <Separator />
              <SummaryRow label="Total" value={formatMoney(checkout.totalCents)} strong />
              <SummaryRow label="Restante" value={formatMoney(summary.remainingCents)} strong />
              {summary.changeCents > 0 ? (
                <SummaryRow label="Troco" value={formatMoney(summary.changeCents)} />
              ) : null}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              {!paid ? (
                <Button
                  type="button"
                  disabled={!summary.reconciled}
                  isLoading={completePayment.isPending}
                  onClick={() => setConfirming(true)}
                >
                  Concluir pagamento
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pagamento concluído e bloqueado para alterações.
                </p>
              )}
              {!paid && !summary.reconciled ? (
                <p className="text-sm text-muted-foreground">
                  Registre pagamentos que cubram o total exatamente.
                </p>
              ) : null}
            </CardFooter>
          </Card>
        </div>
      </div>
      <ConfirmationDialog
        cancelLabel="Revisar pagamento"
        confirmLabel="Concluir pagamento"
        confirmVariant="default"
        description={`Confirme o registro de ${formatMoney(checkout.totalCents)}. Depois de concluído, este pagamento ficará somente para leitura.`}
        isLoading={completePayment.isPending}
        isOpen={confirming}
        title="Concluir pagamento?"
        onCancel={() => setConfirming(false)}
        onConfirm={() => void complete()}
      />
    </div>
  )
}

function ServiceLines({ checkout, readOnly }: { checkout: Checkout; readOnly: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Serviços realizados</h2>
        </CardTitle>
        <CardDescription>Valores e profissionais aceitos no atendimento.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!readOnly && !checkout.adjustmentAuthorized ? (
          <Alert>
            <AlertTitle>Alteração de preço não autorizada</AlertTitle>
            <AlertDescription>
              A permissão desta demonstração não permite alterar os valores dos serviços. Isso não
              representa uma regra de acesso em produção.
            </AlertDescription>
          </Alert>
        ) : null}
        {checkout.lines.map((line) => (
          <div key={line.id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <ScissorsIcon aria-hidden="true" />
                  <span className="break-words">{line.serviceName}</span>
                </p>
                <p className="text-sm text-muted-foreground">{line.professionalName}</p>
              </div>
              <p className="shrink-0 font-medium">{formatMoney(line.netCents)}</p>
            </div>
            {line.priceOverrideReason ? (
              <p className="text-sm text-muted-foreground">
                Preço ajustado: {formatMoney(line.priceCents)} · {line.priceOverrideReason}
              </p>
            ) : null}
            {!readOnly && checkout.adjustmentAuthorized ? (
              <PriceOverrideForm checkout={checkout} line={line} />
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function PriceOverrideForm({
  checkout,
  line,
}: {
  checkout: Checkout
  line: Checkout["lines"][number]
}) {
  const mutation = useUpdateCheckoutLine(checkout.id)
  const [price, setPrice] = useState((line.priceCents / 100).toFixed(2).replace(".", ","))
  const [reason, setReason] = useState(line.priceOverrideReason ?? "")
  const invalid =
    !moneyPattern.test(price) || reason.trim().length < 3 || reason.length > REASON_MAX_LENGTH
  return (
    <form
      noValidate
      className="grid gap-2 lg:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto]"
      onSubmit={async (event) => {
        event.preventDefault()
        if (invalid) return
        try {
          await mutation.mutateAsync({
            lineId: line.id,
            operationId: createOperationId(),
            priceCents: toCents(price),
            reason,
            sessionId: checkout.id,
          })
          toast.success("Preço do serviço atualizado.")
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Não foi possível atualizar o preço.",
          )
        }
      }}
    >
      <Input
        aria-label={`Novo preço de ${line.serviceName}`}
        value={price}
        onChange={(event) => setPrice(event.target.value)}
      />
      <Input
        aria-label={`Motivo do novo preço de ${line.serviceName}`}
        maxLength={REASON_MAX_LENGTH}
        placeholder="Motivo do ajuste"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button type="submit" variant="outline" disabled={invalid} isLoading={mutation.isPending}>
        Atualizar preço
      </Button>
    </form>
  )
}

function AdjustmentForm({ checkout }: { checkout: Checkout }) {
  const mutation = useUpdateCheckoutAdjustments(checkout.id)
  const form = useForm<AdjustmentValues>({
    defaultValues: {
      discount: centsInput(checkout.adjustments.discountCents),
      discountReason: checkout.adjustments.discountReason ?? "",
      surcharge: centsInput(checkout.adjustments.surchargeCents),
      surchargeReason: checkout.adjustments.surchargeReason ?? "",
    },
    resolver: zodResolver(adjustmentSchema),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Ajustes da comanda</h2>
        </CardTitle>
        <CardDescription>
          Informe valores fixos e motivos operacionais sem dados pessoais ou sensíveis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await mutation.mutateAsync({
                discountCents: toCents(values.discount),
                discountReason: values.discountReason,
                operationId: createOperationId(),
                sessionId: checkout.id,
                surchargeCents: toCents(values.surcharge),
                surchargeReason: values.surchargeReason,
              })
              toast.success("Ajustes atualizados. Revise os pagamentos.")
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Não foi possível atualizar os ajustes.",
              )
            }
          })}
        >
          <FieldGroup>
            <div className="grid gap-3 lg:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.discount)}>
                <FieldLabel htmlFor="checkout-discount">Desconto (R$)</FieldLabel>
                <Input
                  id="checkout-discount"
                  inputMode="decimal"
                  aria-invalid={Boolean(form.formState.errors.discount)}
                  {...form.register("discount")}
                />
                <FieldError errors={[form.formState.errors.discount]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.discountReason)}>
                <FieldLabel htmlFor="checkout-discount-reason">Motivo do desconto</FieldLabel>
                <Input
                  id="checkout-discount-reason"
                  maxLength={REASON_MAX_LENGTH}
                  aria-invalid={Boolean(form.formState.errors.discountReason)}
                  {...form.register("discountReason")}
                />
                <FieldError errors={[form.formState.errors.discountReason]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.surcharge)}>
                <FieldLabel htmlFor="checkout-surcharge">Acréscimo (R$)</FieldLabel>
                <Input
                  id="checkout-surcharge"
                  inputMode="decimal"
                  aria-invalid={Boolean(form.formState.errors.surcharge)}
                  {...form.register("surcharge")}
                />
                <FieldError errors={[form.formState.errors.surcharge]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.surchargeReason)}>
                <FieldLabel htmlFor="checkout-surcharge-reason">Motivo do acréscimo</FieldLabel>
                <Input
                  id="checkout-surcharge-reason"
                  maxLength={REASON_MAX_LENGTH}
                  aria-invalid={Boolean(form.formState.errors.surchargeReason)}
                  {...form.register("surchargeReason")}
                />
                <FieldError errors={[form.formState.errors.surchargeReason]} />
              </Field>
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-fit"
              isLoading={mutation.isPending}
            >
              Atualizar ajustes
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function CommissionPreview({
  checkout,
  commissions,
}: {
  checkout: Checkout
  commissions: Awaited<
    ReturnType<ReturnType<typeof useCommissionPreview>["refetch"]>
  >["data"] extends infer T
    ? NonNullable<T>
    : never
}) {
  const values = commissions as readonly {
    barbershopCents: number
    commissionCents: number
    lineId: string
    professionalName: string
    rule: { kind: "fixed" | "none" | "percentage"; rateBasisPoints?: number; fixedCents?: number }
  }[]
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Prévia de comissões</h2>
        </CardTitle>
        <CardDescription>
          Cálculo por serviço. O repasse ao profissional não faz parte deste protótipo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {values.map((commission) => {
          const line = checkout.lines.find(({ id }) => id === commission.lineId)
          return (
            <div
              key={commission.lineId}
              className="grid gap-1 rounded-lg border p-3 lg:grid-cols-3"
            >
              <div>
                <p className="font-medium">{line?.serviceName}</p>
                <p className="text-sm text-muted-foreground">{commission.professionalName}</p>
              </div>
              <p>
                Comissão <strong>{formatMoney(commission.commissionCents)}</strong>
              </p>
              <p>
                Barbearia <strong>{formatMoney(commission.barbershopCents)}</strong>
              </p>
              <p className="text-sm text-muted-foreground lg:col-span-3">
                {commission.rule.kind === "percentage"
                  ? `${(commission.rule.rateBasisPoints ?? 0) / 100}% sobre o valor líquido`
                  : commission.rule.kind === "fixed"
                    ? `Valor fixo de ${formatMoney(commission.rule.fixedCents ?? 0)}`
                    : "Sem comissão"}
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function PaymentSection({ checkout, readOnly }: { checkout: Checkout; readOnly: boolean }) {
  const firstEnabledMethod = firstEnabledTenderMethod(checkout.availableTenderMethods)
  const mutation = useReplaceTenders(checkout.id)
  const form = useForm<TenderValues>({
    defaultValues: {
      applied: centsInput(checkout.totalCents),
      method: firstEnabledMethod,
      received: "",
    },
    resolver: zodResolver(tenderSchema),
  })
  const method = form.watch("method")
  const summary = tenderSummary(checkout.tenders, checkout.totalCents)
  async function save(tenders: readonly PaymentTender[]) {
    try {
      await mutation.mutateAsync({
        operationId: createOperationId(),
        sessionId: checkout.id,
        tenders,
      })
      toast.success("Pagamentos atualizados.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar os pagamentos.",
      )
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Formas de pagamento</h2>
        </CardTitle>
        <CardDescription>
          Pix, dinheiro, débito, crédito ou dois ou mais pagamentos internos.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {checkout.tenders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {checkout.tenders.map((tender) => (
              <li
                key={tender.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <span className="flex items-center gap-2">
                  {tenderIcon(tender.method)}
                  {tenderLabel(tender.method)}
                </span>
                <span className="text-right">
                  <strong>{formatMoney(tender.appliedCents)}</strong>
                  {tender.method === "cash" ? (
                    <small className="block text-muted-foreground">
                      Recebido {formatMoney(tender.receivedCents ?? 0)}
                    </small>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!readOnly ? (
          <>
            <Separator />
            <form
              noValidate
              onSubmit={form.handleSubmit(async (values) => {
                const tender: PaymentTender = {
                  appliedCents: toCents(values.applied),
                  id: `tender-${createOperationId()}`,
                  method: values.method,
                  receivedCents: values.method === "cash" ? toCents(values.received) : undefined,
                }
                await save([...checkout.tenders, tender])
                form.reset({
                  applied: centsInput(Math.max(0, summary.remainingCents)),
                  method: firstEnabledMethod,
                  received: "",
                })
              })}
            >
              <FieldGroup>
                <Field data-invalid={Boolean(form.formState.errors.method)}>
                  <FieldLabel htmlFor="tender-method">Forma de pagamento</FieldLabel>
                  <Select
                    value={method}
                    onValueChange={(value) =>
                      form.setValue("method", (value ?? firstEnabledMethod) as TenderMethod, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger
                      id="tender-method"
                      aria-invalid={Boolean(form.formState.errors.method)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {checkout.availableTenderMethods.map((value) => (
                          <SelectItem key={value} value={value}>
                            {tenderLabel(value)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.method]} />
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.applied)}>
                  <FieldLabel htmlFor="tender-applied" required>
                    Valor aplicado (R$)
                  </FieldLabel>
                  <Input
                    id="tender-applied"
                    inputMode="decimal"
                    aria-invalid={Boolean(form.formState.errors.applied)}
                    {...form.register("applied")}
                  />
                  <FieldDescription>
                    Restante atual: {formatMoney(summary.remainingCents)}
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.applied]} />
                </Field>
                {method === "cash" ? (
                  <Field data-invalid={Boolean(form.formState.errors.received)}>
                    <FieldLabel htmlFor="tender-received" required>
                      Valor recebido (R$)
                    </FieldLabel>
                    <Input
                      id="tender-received"
                      inputMode="decimal"
                      aria-invalid={Boolean(form.formState.errors.received)}
                      {...form.register("received")}
                    />
                    <FieldError errors={[form.formState.errors.received]} />
                  </Field>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="outline" isLoading={mutation.isPending}>
                    <PlusIcon data-icon="inline-start" aria-hidden="true" />
                    Adicionar pagamento
                  </Button>
                  {checkout.tenders.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={mutation.isPending}
                      onClick={() => void save([])}
                    >
                      Limpar pagamentos
                    </Button>
                  ) : null}
                </div>
              </FieldGroup>
            </form>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SummaryRow({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {strong ? <strong>{value}</strong> : <span>{value}</span>}
    </p>
  )
}

function tenderLabel(method: TenderMethod) {
  return { cash: "Dinheiro", credit: "Crédito", debit: "Débito", pix: "Pix" }[method]
}

function tenderIcon(method: TenderMethod) {
  const Icon =
    method === "cash"
      ? BanknoteIcon
      : method === "pix"
        ? LandmarkIcon
        : method === "credit"
          ? CreditCardIcon
          : WalletCardsIcon
  return <Icon aria-hidden="true" />
}

function toCents(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".")
  return Math.round(Number(normalized) * 100)
}

function centsInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",")
}

function createOperationId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}
