import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleAlertIcon, SaveIcon, Trash2Icon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
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
  Field,
  FieldDescription,
  FieldError,
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
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { Switch } from "@/modules/shared/components/ui/switch"
import type {
  BarbershopProfile,
  PaymentMethodSetting,
  ProfessionalServiceOverride,
  SetupScenarioId,
} from "./contracts"
import {
  useSetProfessionalServiceOverride,
  useSetupAvailability,
  useSetupCompletion,
  useUpdateBarbershopProfile,
  useUpdatePaymentMethods,
} from "./queries"
import { useBarbershopSetupRepository } from "./repository-context"

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" })

export function BusinessProfileSection({ scenarioId }: { scenarioId: SetupScenarioId }) {
  const completion = useSetupCompletion(scenarioId)
  const relations = useSetupAvailability({ scenarioId })
  if (completion.isPending || relations.isPending) return <CompletionLoading />
  if (completion.isError || relations.isError)
    return (
      <CompletionError onRetry={() => Promise.all([completion.refetch(), relations.refetch()])} />
    )
  return (
    <BusinessProfileForm
      key={`${scenarioId}-${completion.data.profile.displayName}`}
      initial={completion.data.profile}
      units={relations.data.units}
    />
  )
}

function BusinessProfileForm({
  initial,
  units,
}: {
  initial: BarbershopProfile
  units: readonly { address: string; id: string; name: string }[]
}) {
  const mutation = useUpdateBarbershopProfile()
  const repository = useBarbershopSetupRepository()
  const [values, setValues] = useState(initial)
  const [error, setError] = useState("")
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [logoBusy, setLogoBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const displayInvalid = values.displayName.trim().length < 2
  const phoneInvalid = !/^\d{10,11}$/.test(values.phone.replace(/\D/g, ""))
  const emailInvalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
  const unitInvalid = !values.primaryUnitId || !units.some(({ id }) => id === values.primaryUnitId)

  useEffect(() => {
    if (focusRequest === 0) return
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus()
  }, [focusRequest])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setAttempted(true)
    if (displayInvalid || phoneInvalid || emailInvalid || unitInvalid) {
      setError("Preencha todos os campos obrigatórios com dados válidos.")
      setFocusRequest((current) => current + 1)
      return
    }
    try {
      await mutation.mutateAsync(values)
      toast.success("Dados da barbearia atualizados.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar os dados.")
      setFocusRequest((current) => current + 1)
    }
  }

  return (
    <form ref={formRef} noValidate className="grid gap-4 pb-4" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Dados da barbearia</h3>
          </CardTitle>
          <CardDescription>
            Identidade de exibição, contato e marca da operação. Dados legais e documentos não fazem
            parte desta etapa.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={(attempted && displayInvalid) || undefined}>
            <FieldLabel htmlFor="barbershop-display-name" required>
              Nome de exibição
            </FieldLabel>
            <Input
              id="barbershop-display-name"
              value={values.displayName}
              aria-invalid={attempted && displayInvalid}
              aria-describedby={
                attempted && displayInvalid ? "barbershop-display-name-error" : undefined
              }
              onChange={(event) =>
                setValues((current) => ({ ...current, displayName: event.target.value }))
              }
            />
            {attempted && displayInvalid ? (
              <FieldError id="barbershop-display-name-error">
                Informe o nome de exibição da barbearia.
              </FieldError>
            ) : null}
          </Field>
          <Field data-invalid={(attempted && phoneInvalid) || undefined}>
            <FieldLabel htmlFor="barbershop-phone" required>
              Telefone
            </FieldLabel>
            <Input
              id="barbershop-phone"
              inputMode="tel"
              value={values.phone}
              aria-invalid={attempted && phoneInvalid}
              aria-describedby={attempted && phoneInvalid ? "barbershop-phone-error" : undefined}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  phone: event.target.value.replace(/\D/g, "").slice(0, 11),
                }))
              }
            />
            {attempted && phoneInvalid ? (
              <FieldError id="barbershop-phone-error">Informe um telefone válido.</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={(attempted && emailInvalid) || undefined}>
            <FieldLabel htmlFor="barbershop-email" required>
              E-mail
            </FieldLabel>
            <Input
              id="barbershop-email"
              type="email"
              value={values.email}
              aria-invalid={attempted && emailInvalid}
              aria-describedby={attempted && emailInvalid ? "barbershop-email-error" : undefined}
              onChange={(event) =>
                setValues((current) => ({ ...current, email: event.target.value }))
              }
            />
            {attempted && emailInvalid ? (
              <FieldError id="barbershop-email-error">Informe um e-mail válido.</FieldError>
            ) : null}
          </Field>
          <Field data-invalid={(attempted && unitInvalid) || undefined}>
            <FieldLabel htmlFor="barbershop-primary-unit" required>
              Unidade principal
            </FieldLabel>
            <Select
              value={values.primaryUnitId}
              onValueChange={(primaryUnitId) =>
                setValues((current) => ({
                  ...current,
                  primaryUnitId: primaryUnitId ?? undefined,
                }))
              }
            >
              <SelectTrigger
                id="barbershop-primary-unit"
                aria-invalid={attempted && unitInvalid}
                aria-describedby={
                  attempted && unitInvalid
                    ? "barbershop-primary-unit-description barbershop-primary-unit-error"
                    : "barbershop-primary-unit-description"
                }
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription id="barbershop-primary-unit-description">
              {units.find(({ id }) => id === values.primaryUnitId)?.address ??
                "Cadastre uma unidade para definir o endereço."}
            </FieldDescription>
            {attempted && unitInvalid ? (
              <FieldError id="barbershop-primary-unit-error">
                Selecione uma unidade principal válida.
              </FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="barbershop-whatsapp">WhatsApp</FieldLabel>
            <Input
              id="barbershop-whatsapp"
              inputMode="tel"
              value={values.whatsapp ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  whatsapp: event.target.value.replace(/\D/g, "").slice(0, 11),
                }))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="barbershop-website">Site</FieldLabel>
            <Input
              id="barbershop-website"
              type="url"
              placeholder="https://"
              value={values.website ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, website: event.target.value }))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="barbershop-instagram">Instagram</FieldLabel>
            <Input
              id="barbershop-instagram"
              placeholder="@barbearia"
              value={values.instagram ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, instagram: event.target.value }))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="barbershop-description">Descrição</FieldLabel>
            <Input
              id="barbershop-description"
              maxLength={500}
              value={values.description ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, description: event.target.value }))
              }
            />
          </Field>
          {repository.uploadBusinessLogo ? (
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="barbershop-logo">Logotipo</FieldLabel>
              <Input
                accept="image/jpeg,image/png,image/webp"
                disabled={logoBusy || !values.version}
                id="barbershop-logo"
                type="file"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file || !values.version) return
                  setLogoBusy(true)
                  try {
                    const next = await repository.uploadBusinessLogo?.(file, values.version)
                    if (next) setValues(next)
                    toast.success("Logotipo atualizado.")
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Não foi possível enviar o logotipo.",
                    )
                  } finally {
                    setLogoBusy(false)
                    event.target.value = ""
                  }
                }}
              />
              <FieldDescription>JPEG, PNG ou WebP, até 5 MB e 4096 × 4096 px.</FieldDescription>
              {values.logoAvailable ? (
                <Button
                  className="w-fit"
                  disabled={logoBusy}
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!values.version) return
                    setLogoBusy(true)
                    try {
                      const next = await repository.removeBusinessLogo?.(values.version)
                      if (next) setValues(next)
                      toast.success("Logotipo removido.")
                    } finally {
                      setLogoBusy(false)
                    }
                  }}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Remover logotipo
                </Button>
              ) : null}
            </Field>
          ) : null}
          {error ? (
            <Alert className="md:col-span-2" variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Revise os dados</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" isLoading={mutation.isPending}>
            <SaveIcon data-icon="inline-start" />
            Salvar dados
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export function PaymentsSection({ scenarioId }: { scenarioId: SetupScenarioId }) {
  const repository = useBarbershopSetupRepository()
  const production = repository.catalogSource === "http"
  const completion = useSetupCompletion(scenarioId)
  const relations = useSetupAvailability({ scenarioId })
  if (completion.isPending || relations.isPending) return <CompletionLoading />
  if (completion.isError || relations.isError)
    return (
      <CompletionError onRetry={() => Promise.all([completion.refetch(), relations.refetch()])} />
    )
  return (
    <div className="grid gap-4 pb-4 lg:grid-cols-2">
      <PaymentSettingsForm
        key={`${scenarioId}-payments`}
        initial={completion.data.paymentMethods}
      />
      {production && relations.data ? (
        <CommissionSettings
          professionals={relations.data.professionals}
          services={relations.data.services}
        />
      ) : null}
      {!production && relations.data ? (
        <ServiceOverrideForm
          key={`${scenarioId}-overrides`}
          overrides={completion.data.serviceOverrides}
          professionals={relations.data.professionals}
          services={relations.data.services}
        />
      ) : null}
    </div>
  )
}

function CommissionSettings({
  professionals,
  services,
}: {
  professionals: readonly { id: string; name: string }[]
  services: readonly { id: string; name: string }[]
}) {
  const repository = useBarbershopSetupRepository()
  const client = useQueryClient()
  const policies = useQuery({
    enabled: Boolean(repository.getCommissionPolicies),
    queryKey: ["barbershop-setup", "commission-policies"],
    queryFn: () => repository.getCommissionPolicies?.() ?? [],
  })
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const to = now.toISOString().slice(0, 10)
  const detail = useQuery({
    enabled: Boolean(repository.getCommissionDetail),
    queryKey: ["barbershop-setup", "commission-detail", from, to],
    queryFn: () => repository.getCommissionDetail?.({ from, to }),
  })
  const [professionalId, setProfessionalId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [kind, setKind] = useState<"fixed" | "none" | "percentage">("percentage")
  const [amount, setAmount] = useState("40")
  const save = useMutation({
    mutationFn: async () => {
      if (!repository.saveCommissionPolicy) throw new Error("Configuração indisponível.")
      const current = policies.data?.find(
        (item) => item.professionalId === professionalId && (item.serviceId ?? "") === serviceId,
      )
      return repository.saveCommissionPolicy({
        professionalId,
        serviceId: serviceId || null,
        kind,
        basisPoints: kind === "percentage" ? Math.round(Number(amount) * 100) : null,
        fixedCents: kind === "fixed" ? Math.round(Number(amount.replace(",", ".")) * 100) : null,
        expectedVersion: current?.version ?? null,
      })
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["barbershop-setup", "commission-policies"] })
      toast.success("Regra de comissão salva para vendas futuras.")
    },
    onError: (error) => toast.error(error.message),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Comissões</h3>
        </CardTitle>
        <CardDescription>
          Defina a regra padrão ou uma exceção por serviço. Alterações valem apenas para novas
          vendas.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Select value={professionalId} onValueChange={(value) => setProfessionalId(value ?? "")}>
          <SelectTrigger aria-label="Profissional da comissão">
            <SelectValue placeholder="Selecione o profissional" />
          </SelectTrigger>
          <SelectContent>
            {professionals.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={serviceId || "default"}
          onValueChange={(value) => setServiceId(value === "default" ? "" : (value ?? ""))}
        >
          <SelectTrigger aria-label="Serviço da comissão">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Regra padrão</SelectItem>
            {services.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={(value) => setKind((value ?? "none") as typeof kind)}>
          <SelectTrigger aria-label="Tipo de comissão">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Percentual</SelectItem>
            <SelectItem value="fixed" disabled={!serviceId}>
              Valor fixo por serviço
            </SelectItem>
            <SelectItem value="none">Sem comissão</SelectItem>
          </SelectContent>
        </Select>
        {kind !== "none" ? (
          <Input
            aria-label={kind === "percentage" ? "Percentual da comissão" : "Valor fixo da comissão"}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        ) : null}
        <div aria-live="polite" className="rounded-lg bg-muted p-3 text-sm">
          No mês:{" "}
          <strong>{currency.format((detail.data?.totals.commissionCents ?? 0) / 100)}</strong> em
          comissões e {currency.format((detail.data?.totals.barbershopShareCents ?? 0) / 100)} para
          a barbearia.
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button disabled={!professionalId} isLoading={save.isPending} onClick={() => save.mutate()}>
          <SaveIcon data-icon="inline-start" />
          Salvar regra
        </Button>
      </CardFooter>
    </Card>
  )
}

function PaymentSettingsForm({
  className,
  initial,
}: {
  className?: string
  initial: readonly PaymentMethodSetting[]
}) {
  const mutation = useUpdatePaymentMethods()
  const [settings, setSettings] = useState(initial)
  const [error, setError] = useState("")
  async function save() {
    setError("")
    try {
      await mutation.mutateAsync(settings)
      toast.success("Formas de pagamento atualizadas.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.")
    }
  }
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          <h3>Formas de pagamento</h3>
        </CardTitle>
        <CardDescription>
          O Studio registra a forma escolhida; não processa pagamentos nem armazena dados de cartão.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {settings.map((setting) => {
          const activeBaseCount = settings.filter(
            ({ active, id }) => active && id !== "mixed",
          ).length
          const mixedDisabled = setting.id === "mixed" && activeBaseCount < 2
          return (
            <div
              className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border p-3"
              key={setting.id}
            >
              <span>
                <span className="block font-medium">{setting.label}</span>
                {setting.id === "mixed" ? (
                  <span className="text-xs text-muted-foreground">
                    Exige duas formas base ativas.
                  </span>
                ) : null}
              </span>
              <Switch
                checked={setting.active && !mixedDisabled}
                disabled={mixedDisabled}
                aria-label={`Aceitar ${setting.label}`}
                onCheckedChange={(active) =>
                  setSettings((current) =>
                    current.map((item) => (item.id === setting.id ? { ...item, active } : item)),
                  )
                }
              />
            </div>
          )
        })}
        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Configuração inválida</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="button" isLoading={mutation.isPending} onClick={save}>
          Salvar formas
        </Button>
      </CardFooter>
    </Card>
  )
}

function ServiceOverrideForm({
  overrides,
  professionals,
  services,
}: {
  overrides: readonly ProfessionalServiceOverride[]
  professionals: readonly { id: string; name: string; status: string }[]
  services: readonly {
    durationMinutes: number
    id: string
    name: string
    priceCents: number
    professionalIds: readonly string[]
    status: string
  }[]
}) {
  const eligibleServices = services.filter(({ status }) => status === "active")
  const [serviceId, setServiceId] = useState(eligibleServices[0]?.id ?? "")
  const selectedService = eligibleServices.find(({ id }) => id === serviceId)
  const eligibleProfessionals = professionals.filter(
    ({ id, status }) => status === "active" && selectedService?.professionalIds.includes(id),
  )
  const [professionalId, setProfessionalId] = useState(eligibleProfessionals[0]?.id ?? "")
  const current = overrides.find(
    (item) => item.serviceId === serviceId && item.professionalId === professionalId,
  )
  const [price, setPrice] = useState(
    current?.priceCents !== undefined ? String(current.priceCents / 100) : "",
  )
  const [duration, setDuration] = useState(
    current?.durationMinutes !== undefined ? String(current.durationMinutes) : "",
  )
  const mutation = useSetProfessionalServiceOverride()

  function hydrate(nextServiceId: string, nextProfessionalId: string) {
    const draft = professionalServiceOverrideDraft(overrides, nextServiceId, nextProfessionalId)
    setPrice(draft.price)
    setDuration(draft.duration)
  }

  async function save(clear = false) {
    if (!serviceId || !professionalId) return
    try {
      await mutation.mutateAsync({
        serviceId,
        professionalId,
        priceCents: clear || price === "" ? undefined : Math.round(Number(price) * 100),
        durationMinutes: clear || duration === "" ? undefined : Number(duration),
      })
      if (clear) {
        setPrice("")
        setDuration("")
      }
      toast.success(
        clear ? "Exceção removida; o padrão foi restaurado." : "Exceção profissional atualizada.",
      )
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Não foi possível salvar a exceção.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Exceção por profissional</h3>
        </CardTitle>
        <CardDescription>
          Use somente quando preço ou duração diferirem do padrão do serviço. Vendas e comissões já
          pagas preservam seus snapshots.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field>
          <FieldLabel htmlFor="override-service">Serviço</FieldLabel>
          <Select
            value={serviceId}
            onValueChange={(value) => {
              const nextServiceId = value ?? ""
              const nextService = eligibleServices.find(({ id }) => id === nextServiceId)
              const nextProfessionalId =
                professionals.find(
                  ({ id, status }) =>
                    status === "active" && nextService?.professionalIds.includes(id),
                )?.id ?? ""
              setServiceId(nextServiceId)
              setProfessionalId(nextProfessionalId)
              hydrate(nextServiceId, nextProfessionalId)
            }}
          >
            <SelectTrigger id="override-service">
              <SelectValue>{selectedService?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {eligibleServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="override-professional">Profissional elegível</FieldLabel>
          <Select
            value={professionalId}
            onValueChange={(value) => {
              const nextProfessionalId = value ?? ""
              setProfessionalId(nextProfessionalId)
              hydrate(serviceId, nextProfessionalId)
            }}
          >
            <SelectTrigger id="override-professional">
              <SelectValue placeholder="Selecione">
                {eligibleProfessionals.find(({ id }) => id === professionalId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {eligibleProfessionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <p className="rounded-md bg-muted p-3 text-sm">
          Padrão:{" "}
          {selectedService
            ? `${selectedService.durationMinutes} min · ${formatMoney(selectedService.priceCents)}`
            : "indisponível"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="override-price">Preço (R$), opcional</FieldLabel>
            <Input
              id="override-price"
              min="0"
              step="0.5"
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="override-duration">Duração (min), opcional</FieldLabel>
            <Input
              id="override-duration"
              min="15"
              step="15"
              type="number"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </Field>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <Button type="button" variant="outline" disabled={!current} onClick={() => save(true)}>
          <Trash2Icon data-icon="inline-start" />
          Restaurar padrão
        </Button>
        <Button
          type="button"
          isLoading={mutation.isPending}
          disabled={!professionalId}
          onClick={() => save(false)}
        >
          Salvar exceção
        </Button>
      </CardFooter>
    </Card>
  )
}

export function professionalServiceOverrideDraft(
  overrides: readonly ProfessionalServiceOverride[],
  serviceId: string,
  professionalId: string,
) {
  const override = overrides.find(
    (item) => item.serviceId === serviceId && item.professionalId === professionalId,
  )
  return {
    duration: override?.durationMinutes !== undefined ? String(override.durationMinutes) : "",
    price: override?.priceCents !== undefined ? String(override.priceCents / 100) : "",
  }
}

function CompletionLoading() {
  return (
    <div aria-label="Carregando configuração" className="grid gap-3" role="status">
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
    </div>
  )
}

function CompletionError({ onRetry }: { onRetry: () => unknown }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>Não foi possível carregar esta etapa</AlertTitle>
      <AlertDescription>
        <Button className="mt-2" type="button" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value / 100)
}
