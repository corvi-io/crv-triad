import { zodResolver } from "@hookform/resolvers/zod"
import { Building2Icon, Clock3Icon, MapPinIcon, ScissorsIcon, UserRoundIcon } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import {
  FormField,
  FormSection,
  getFieldDescriptionIds,
} from "@/modules/shared/components/forms/form-layout"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { Button } from "@/modules/shared/components/ui/button"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Switch } from "@/modules/shared/components/ui/switch"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import { createDefaultAccessPolicy, normalizeAccessPolicy } from "./completion"
import type {
  AccountAccessStatus,
  ProfessionalInput,
  ServiceInput,
  SetupEntity,
  SetupEntityInput,
  SetupEntityKind,
  SetupProfessional,
  SetupService,
  SetupUnit,
  UnitInput,
  Weekday,
} from "./contracts"
import { professionalAccessChoices } from "./contracts"
import { useProfessionalOperationalSummary } from "./queries"

const baseSchema = {
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
}

export const unitFormSchema = z.object({
  kind: z.literal("unit"),
  ...baseSchema,
  code: z.string().trim().min(2, "Informe um código curto."),
  address: z.string().trim().min(5, "Informe um endereço válido."),
  businessHours: z
    .object({
      days: z.array(
        z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
      ),
      start: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário inicial."),
      end: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário final."),
    })
    .refine(({ days }) => days.length > 0, {
      message: "Selecione pelo menos um dia de funcionamento.",
      path: ["days"],
    })
    .refine(({ end, start }) => start < end, {
      message: "O término deve ser posterior ao início.",
      path: ["end"],
    }),
})

export const professionalFormSchema = z.object({
  kind: z.literal("professional"),
  ...baseSchema,
  role: z.string().trim().min(2, "Informe a função do profissional."),
  accountAccess: z.enum(["connected", "invited", "not-configured"]),
  contactEmail: z.string().email("Informe um e-mail válido.").or(z.literal("")),
  contactPhone: z.string().regex(/^\d{10,11}$/, "Informe um telefone válido."),
  commissionBasisPoints: z.preprocess(
    (value) => Math.round(Number(value) * 100),
    z.number().int().min(0).max(10_000),
  ),
  specialties: z.array(z.string()),
  accessPolicy: z.object({
    "own-schedule-only": z.boolean(),
    "create-appointments": z.boolean(),
    "change-prices": z.boolean(),
    "register-payments": z.boolean(),
    "view-revenue": z.boolean(),
    "view-commissions": z.boolean(),
    "access-other-professionals": z.boolean(),
  }),
  unitIds: z.array(z.string()).min(1, "Selecione pelo menos uma unidade."),
  serviceIds: z.array(z.string()),
})

export const serviceFormSchema = z.object({
  kind: z.literal("service"),
  ...baseSchema,
  category: z.string().trim().min(2, "Informe uma categoria."),
  description: z.string().trim().min(5, "Informe uma descrição."),
  durationMinutes: z
    .number({ error: "Informe a duração em minutos." })
    .int("Informe a duração em minutos inteiros.")
    .min(15, "Use duração mínima de 15 minutos."),
  price: z.number({ error: "Informe o preço do serviço." }).min(0, "Informe um preço válido."),
  unitIds: z.array(z.string()).min(1, "Selecione pelo menos uma unidade."),
  professionalIds: z.array(z.string()).min(1, "Selecione pelo menos um profissional."),
})

export const setupEntityFormSchema = z.discriminatedUnion("kind", [
  unitFormSchema,
  professionalFormSchema,
  serviceFormSchema,
])

export type SetupEntityFormValues = z.input<typeof setupEntityFormSchema>

type EntityDrawerState =
  | { kind: "create"; entityKind: SetupEntityKind }
  | { kind: "edit" | "view"; entity: SetupEntity }
  | null

export function SetupEntityDrawer({
  isSaving,
  onClose,
  onCloseComplete,
  onSave,
  professionals,
  services,
  state,
  units,
}: {
  isSaving: boolean
  onClose: () => void
  onCloseComplete: () => void
  onSave: (kind: SetupEntityKind, input: SetupEntityInput) => Promise<void>
  professionals: readonly SetupProfessional[]
  services: readonly SetupService[]
  state: EntityDrawerState
  units: readonly SetupUnit[]
}) {
  const [renderedState, setRenderedState] = useState<EntityDrawerState>(state)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!state) {
      setIsOpen(false)
      return
    }
    setRenderedState(state)
  }, [state])

  useEffect(() => {
    if (!state || !renderedState) return
    const frame = requestAnimationFrame(() => setIsOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [renderedState, state])

  function handleOpenChangeComplete(open: boolean) {
    if (open || state) return
    setRenderedState(null)
    onCloseComplete()
  }

  if (!renderedState) return null
  const entity = renderedState.kind === "create" ? undefined : renderedState.entity
  const entityKind =
    renderedState.kind === "create" ? renderedState.entityKind : renderedState.entity.kind
  if (renderedState.kind === "view" && entity) {
    return (
      <EntityDetails
        entity={entity}
        isOpen={isOpen}
        onClose={onClose}
        onOpenChangeComplete={handleOpenChangeComplete}
        professionals={professionals}
        services={services}
        units={units}
      />
    )
  }
  return (
    <EntityForm
      key={entity?.id ?? `new-${entityKind}`}
      entity={entity}
      entityKind={entityKind}
      isOpen={isOpen}
      isSaving={isSaving}
      onClose={onClose}
      onOpenChangeComplete={handleOpenChangeComplete}
      onSave={onSave}
      professionals={professionals}
      services={services}
      units={units}
    />
  )
}

function EntityForm({
  entity,
  entityKind,
  isOpen,
  isSaving,
  onClose,
  onOpenChangeComplete,
  onSave,
  professionals,
  services,
  units,
}: {
  entity?: SetupEntity
  entityKind: SetupEntityKind
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onOpenChangeComplete: (isOpen: boolean) => void
  onSave: (kind: SetupEntityKind, input: SetupEntityInput) => Promise<void>
  professionals: readonly SetupProfessional[]
  services: readonly SetupService[]
  units: readonly SetupUnit[]
}) {
  const formId = `setup-${entityKind}-form`
  const form = useForm<SetupEntityFormValues>({
    resolver: zodResolver(setupEntityFormSchema),
    defaultValues: getDefaultValues(entityKind, entity),
  })
  const watchedUnitIds = form.watch("unitIds")
  const selectedUnitIds = Array.isArray(watchedUnitIds) ? watchedUnitIds : []
  const eligibleProfessionals = professionals.filter((professional) =>
    professional.unitIds.some((unitId) => selectedUnitIds.includes(unitId)),
  )

  function handleServiceUnitsChange(nextUnitIds: readonly string[]) {
    if (entityKind !== "service") return
    const eligibleIds = new Set(
      professionals
        .filter((professional) =>
          professional.unitIds.some((unitId) => nextUnitIds.includes(unitId)),
        )
        .map(({ id }) => id),
    )
    const selectedProfessionalIds = form.getValues("professionalIds")
    if (!Array.isArray(selectedProfessionalIds)) return
    const compatibleProfessionalIds = selectedProfessionalIds.filter((id) => eligibleIds.has(id))
    if (compatibleProfessionalIds.length === selectedProfessionalIds.length) return
    form.setValue("professionalIds", compatibleProfessionalIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: form.formState.isSubmitted,
    })
  }

  async function submit(values: SetupEntityFormValues) {
    const parsed = setupEntityFormSchema.parse(values)
    if (parsed.kind === "unit") {
      const { kind: _kind, ...input } = parsed
      await onSave("unit", input satisfies UnitInput)
    } else if (parsed.kind === "professional") {
      const { kind: _kind, ...input } = parsed
      await onSave("professional", input satisfies ProfessionalInput)
    } else {
      const { kind: _kind, price, ...rest } = parsed
      await onSave("service", {
        ...rest,
        priceCents: Math.round(price * 100),
      } satisfies ServiceInput)
    }
  }

  return (
    <ActionDrawer
      isOpen={isOpen}
      size="form"
      onOpenChange={(open) => !open && onClose()}
      onOpenChangeComplete={onOpenChangeComplete}
      context={entityLabels[entityKind].plural}
      title={
        entity ? `Editar ${entityLabels[entityKind].singular}` : entityLabels[entityKind].newLabel
      }
      description="Preencha os dados da configuração."
      secondaryActions={
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      }
      primaryAction={
        <Button type="submit" form={formId} isLoading={isSaving}>
          Salvar
        </Button>
      }
    >
      <form
        id={formId}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(submit)}
      >
        <FormSection title="Identificação">
          <FormField
            id={`${formId}-name`}
            label="Nome"
            icon={
              entityKind === "unit"
                ? Building2Icon
                : entityKind === "professional"
                  ? UserRoundIcon
                  : ScissorsIcon
            }
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              id={`${formId}-name`}
              autoFocus
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby={getFieldDescriptionIds(
                `${formId}-name`,
                false,
                Boolean(form.formState.errors.name),
              )}
              {...form.register("name")}
            />
          </FormField>
          {entityKind === "unit" ? <UnitFields formId={formId} form={form} /> : null}
          {entityKind === "professional" ? (
            <ProfessionalFields formId={formId} form={form} />
          ) : null}
          {entityKind === "service" ? <ServiceFields formId={formId} form={form} /> : null}
        </FormSection>
        {entityKind === "professional" ? (
          <FormSection title="Vínculos">
            <RelationField
              control={form.control}
              formId={formId}
              name="unitIds"
              label="Unidades"
              options={units}
            />
            <RelationField
              control={form.control}
              formId={formId}
              name="serviceIds"
              label="Serviços oferecidos"
              options={services}
            />
          </FormSection>
        ) : null}
        {entityKind === "service" ? (
          <FormSection title="Disponibilidade do catálogo">
            <RelationField
              control={form.control}
              formId={formId}
              name="unitIds"
              label="Unidades"
              options={units}
              onValuesChange={handleServiceUnitsChange}
            />
            <RelationField
              control={form.control}
              formId={formId}
              name="professionalIds"
              label="Profissionais elegíveis"
              description="Mostramos somente profissionais que atendem a pelo menos uma unidade selecionada."
              options={eligibleProfessionals}
            />
          </FormSection>
        ) : null}
      </form>
    </ActionDrawer>
  )
}

function UnitFields({ formId, form }: FormFieldsProps) {
  const businessHoursErrors = form.formState.errors as {
    businessHours?: {
      days?: { message?: string }
      end?: { message?: string }
      start?: { message?: string }
    }
  }
  const businessHoursError =
    businessHoursErrors.businessHours?.days?.message ??
    businessHoursErrors.businessHours?.start?.message ??
    businessHoursErrors.businessHours?.end?.message
  return (
    <>
      <FormField
        id={`${formId}-code`}
        label="Código"
        required
        error={fieldMessage(form.formState.errors, "code")}
      >
        <Input
          id={`${formId}-code`}
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "code"))}
          aria-describedby={getFieldDescriptionIds(
            `${formId}-code`,
            false,
            Boolean(fieldMessage(form.formState.errors, "code")),
          )}
          {...form.register("code")}
        />
      </FormField>
      <FormField
        id={`${formId}-address`}
        label="Endereço"
        icon={MapPinIcon}
        required
        error={fieldMessage(form.formState.errors, "address")}
      >
        <Input
          id={`${formId}-address`}
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "address"))}
          aria-describedby={getFieldDescriptionIds(
            `${formId}-address`,
            false,
            Boolean(fieldMessage(form.formState.errors, "address")),
          )}
          {...form.register("address")}
        />
      </FormField>
      <FormField
        id={`${formId}-business-hours-start`}
        label="Funcionamento"
        icon={Clock3Icon}
        required
        description="Escolha um único período e os dias em que ele se aplica."
        error={businessHoursError}
      >
        <div className="grid gap-2">
          <fieldset className="grid grid-cols-[1fr_auto_1fr] items-center overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
            <legend className="sr-only">Período de funcionamento</legend>
            <label className="grid gap-0.5 px-3 py-1.5" htmlFor={`${formId}-business-hours-start`}>
              <span className="text-xs text-muted-foreground">Início</span>
              <input
                id={`${formId}-business-hours-start`}
                type="time"
                step={900}
                className="min-w-0 bg-transparent text-sm outline-none"
                aria-invalid={Boolean(businessHoursError)}
                aria-describedby={getFieldDescriptionIds(
                  `${formId}-business-hours-start`,
                  true,
                  Boolean(businessHoursError),
                )}
                {...form.register("businessHours.start")}
              />
            </label>
            <span aria-hidden="true" className="text-muted-foreground">
              —
            </span>
            <label className="grid gap-0.5 px-3 py-1.5" htmlFor={`${formId}-business-hours-end`}>
              <span className="text-xs text-muted-foreground">Fim</span>
              <input
                id={`${formId}-business-hours-end`}
                type="time"
                step={900}
                className="min-w-0 bg-transparent text-sm outline-none"
                aria-invalid={Boolean(businessHoursError)}
                aria-describedby={getFieldDescriptionIds(
                  `${formId}-business-hours-start`,
                  true,
                  Boolean(businessHoursError),
                )}
                {...form.register("businessHours.end")}
              />
            </label>
          </fieldset>
          <Controller
            control={form.control}
            name="businessHours.days"
            render={({ field }) => (
              <fieldset>
                <legend className="sr-only">Dias de funcionamento</legend>
                <div className="flex flex-wrap gap-1.5">
                  {weekdayOptions.map(({ label, value }) => {
                    const checked = field.value.includes(value)
                    return (
                      <label
                        key={value}
                        className="cursor-pointer rounded-md border px-2.5 py-1.5 text-xs transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
                      >
                        <input
                          className="sr-only"
                          type="checkbox"
                          value={value}
                          checked={checked}
                          onBlur={field.onBlur}
                          onChange={(event) =>
                            field.onChange(
                              event.currentTarget.checked
                                ? [...field.value, value]
                                : field.value.filter((day) => day !== value),
                            )
                          }
                        />
                        {label}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )}
          />
        </div>
      </FormField>
    </>
  )
}

function ProfessionalFields({ formId, form }: FormFieldsProps) {
  return (
    <>
      <FormField
        id={`${formId}-role`}
        label="Função"
        required
        error={fieldMessage(form.formState.errors, "role")}
      >
        <Input
          id={`${formId}-role`}
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "role"))}
          aria-describedby={getFieldDescriptionIds(
            `${formId}-role`,
            false,
            Boolean(fieldMessage(form.formState.errors, "role")),
          )}
          {...form.register("role")}
        />
      </FormField>
      <FormField
        id={`${formId}-phone`}
        label="Telefone"
        required
        error={fieldMessage(form.formState.errors, "contactPhone")}
      >
        <Input
          id={`${formId}-phone`}
          inputMode="tel"
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "contactPhone"))}
          {...form.register("contactPhone")}
        />
      </FormField>
      <FormField
        id={`${formId}-email`}
        label="E-mail"
        error={fieldMessage(form.formState.errors, "contactEmail")}
      >
        <Input
          id={`${formId}-email`}
          type="email"
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "contactEmail"))}
          {...form.register("contactEmail")}
        />
      </FormField>
      <FormField
        id={`${formId}-commission`}
        label="Comissão padrão (%)"
        required
        error={fieldMessage(form.formState.errors, "commissionBasisPoints")}
      >
        <Input
          id={`${formId}-commission`}
          type="number"
          min={0}
          max={100}
          step="0.01"
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "commissionBasisPoints"))}
          {...form.register("commissionBasisPoints", { valueAsNumber: true })}
        />
      </FormField>
      <FormField
        id={`${formId}-access`}
        label="Acesso à conta"
        description="Situação atual do acesso deste profissional."
      >
        <Controller
          control={form.control}
          name="accountAccess"
          render={({ field }) => (
            <Select value={field.value as AccountAccessStatus} onValueChange={field.onChange}>
              <SelectTrigger
                id={`${formId}-access`}
                ref={field.ref}
                aria-describedby={getFieldDescriptionIds(`${formId}-access`, true, false)}
              >
                <SelectValue>{accessLabels[field.value as AccountAccessStatus]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connected">Conectado</SelectItem>
                <SelectItem value="invited">Convite pendente</SelectItem>
                <SelectItem value="not-configured">Não configurado</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <FieldSet>
        <FieldLegend variant="label">Acesso demonstrativo</FieldLegend>
        <p className="text-sm text-muted-foreground">
          Estas escolhas descrevem política de negócio. Elas não alteram login, rotas nem
          autorização do servidor.
        </p>
        <div className="grid gap-2">
          {professionalAccessChoices.map((choice) => (
            <Controller
              control={form.control}
              key={choice}
              name={`accessPolicy.${choice}`}
              render={({ field }) => (
                <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <span>{professionalAccessLabels[choice]}</span>
                  <Switch
                    checked={field.value}
                    aria-label={professionalAccessLabels[choice]}
                    onCheckedChange={(checked) => {
                      const normalized = normalizeAccessPolicy({
                        ...form.getValues("accessPolicy"),
                        [choice]: checked,
                      })
                      for (const accessChoice of professionalAccessChoices) {
                        form.setValue(`accessPolicy.${accessChoice}`, normalized[accessChoice], {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    }}
                  />
                </div>
              )}
            />
          ))}
        </div>
      </FieldSet>
    </>
  )
}

function ServiceFields({ formId, form }: FormFieldsProps) {
  return (
    <>
      <FormField
        id={`${formId}-category`}
        label="Categoria"
        required
        error={fieldMessage(form.formState.errors, "category")}
      >
        <Input
          id={`${formId}-category`}
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "category"))}
          aria-describedby={getFieldDescriptionIds(
            `${formId}-category`,
            false,
            Boolean(fieldMessage(form.formState.errors, "category")),
          )}
          {...form.register("category")}
        />
      </FormField>
      <FormField
        id={`${formId}-description`}
        label="Descrição"
        required
        error={fieldMessage(form.formState.errors, "description")}
      >
        <Textarea
          id={`${formId}-description`}
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "description"))}
          aria-describedby={getFieldDescriptionIds(
            `${formId}-description`,
            false,
            Boolean(fieldMessage(form.formState.errors, "description")),
          )}
          {...form.register("description")}
        />
      </FormField>
      <FormField
        id={`${formId}-duration`}
        label="Duração (min)"
        required
        error={fieldMessage(form.formState.errors, "durationMinutes")}
      >
        <Input
          id={`${formId}-duration`}
          type="number"
          min={15}
          step={15}
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "durationMinutes"))}
          aria-describedby={getFieldDescriptionIds(
            `${formId}-duration`,
            false,
            Boolean(fieldMessage(form.formState.errors, "durationMinutes")),
          )}
          {...form.register("durationMinutes", { valueAsNumber: true })}
        />
      </FormField>
      <FormField
        id={`${formId}-price`}
        label="Preço (R$)"
        required
        error={fieldMessage(form.formState.errors, "price")}
      >
        <Input
          id={`${formId}-price`}
          type="number"
          min={0}
          step="0.50"
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "price"))}
          aria-describedby={getFieldDescriptionIds(
            `${formId}-price`,
            false,
            Boolean(fieldMessage(form.formState.errors, "price")),
          )}
          {...form.register("price", { valueAsNumber: true })}
        />
      </FormField>
    </>
  )
}

type RelationName = "professionalIds" | "serviceIds" | "unitIds"

function RelationField({
  control,
  formId,
  label,
  name,
  description,
  onValuesChange,
  options,
}: {
  control: ReturnType<typeof useForm<SetupEntityFormValues>>["control"]
  description?: string
  formId: string
  label: string
  name: RelationName
  onValuesChange?: (values: readonly string[]) => void
  options: readonly SetupEntity[]
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const errorId = `${formId}-${name}-error`
        const descriptionId = `${formId}-${name}-description`
        const groupId = `${formId}-${name}`
        const isRequired = name !== "serviceIds"
        const describedBy = [
          description ? descriptionId : undefined,
          fieldState.invalid ? errorId : undefined,
        ]
          .filter(Boolean)
          .join(" ")
        return (
          <FieldSet
            ref={options.length === 0 ? field.ref : undefined}
            tabIndex={options.length === 0 ? -1 : undefined}
            data-invalid={fieldState.invalid}
            aria-describedby={describedBy || undefined}
            aria-invalid={fieldState.invalid}
            aria-required={isRequired}
          >
            <FieldLegend id={`${groupId}-label`} variant="label">
              {label}
              {isRequired ? " *" : ""}
            </FieldLegend>
            {description ? (
              <p id={descriptionId} className="text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma opção ativa disponível.</p>
              ) : (
                options.map((option, index) => {
                  const values = Array.isArray(field.value) ? field.value : []
                  const id = `${groupId}-${option.id}`
                  return (
                    <Field key={option.id} orientation="horizontal">
                      <input
                        id={id}
                        ref={index === 0 ? field.ref : undefined}
                        name={field.name}
                        type="checkbox"
                        className="size-5 accent-primary"
                        checked={values.includes(option.id)}
                        aria-describedby={describedBy || undefined}
                        aria-invalid={fieldState.invalid}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const nextValues = event.currentTarget.checked
                            ? [...values, option.id]
                            : values.filter((value) => value !== option.id)
                          field.onChange(nextValues)
                          onValuesChange?.(nextValues)
                        }}
                      />
                      <FieldLabel htmlFor={id}>{option.name}</FieldLabel>
                    </Field>
                  )
                })
              )}
            </div>
            {fieldState.error ? (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {fieldState.error.message}
              </p>
            ) : null}
          </FieldSet>
        )
      }}
    />
  )
}

function EntityDetails({
  entity,
  isOpen,
  onClose,
  onOpenChangeComplete,
  professionals,
  services,
  units,
}: {
  entity: SetupEntity
  isOpen: boolean
  onClose: () => void
  onOpenChangeComplete: (isOpen: boolean) => void
  professionals: readonly SetupProfessional[]
  services: readonly SetupService[]
  units: readonly SetupUnit[]
}) {
  const rows: Array<[string, ReactNode]> =
    entity.kind === "unit"
      ? [
          ["Código", entity.code],
          ["Endereço", entity.address],
          ["Funcionamento", formatBusinessHours(entity.businessHours)],
        ]
      : entity.kind === "professional"
        ? [
            ["Função", entity.role],
            ["Unidades", namesFor(entity.unitIds, units)],
            ["Serviços", namesFor(entity.serviceIds, services)],
            ["Acesso", accessLabels[entity.accountAccess]],
            [
              "Contato",
              [entity.contactPhone, entity.contactEmail].filter(Boolean).join(" · ") || "-",
            ],
            ["Especialidades", entity.specialties?.join(", ") || "-"],
            ["Comissão", `${(entity.commissionBasisPoints ?? 0) / 100}%`],
            ["Política de acesso", "Demonstrativa; não concede autorização real."],
          ]
        : [
            ["Categoria", entity.category],
            ["Descrição", entity.description],
            ["Duração", `${entity.durationMinutes} min`],
            ["Preço", formatMoney(entity.priceCents)],
            ["Unidades", namesFor(entity.unitIds, units)],
            ["Profissionais", namesFor(entity.professionalIds, professionals)],
          ]
  return (
    <ActionDrawer
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      onOpenChangeComplete={onOpenChangeComplete}
      context={entityLabels[entity.kind].plural}
      title="Visualizar"
      description="Detalhes do registro selecionado."
      secondaryActions={
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <dl className="grid gap-4 text-sm">
        <Detail label="Nome">{entity.name}</Detail>
        {rows.map(([label, value]) => (
          <Detail key={label} label={label}>
            {value}
          </Detail>
        ))}
      </dl>
      {entity.kind === "professional" ? (
        <ProfessionalOperationDetails professional={entity} services={services} />
      ) : null}
    </ActionDrawer>
  )
}

function ProfessionalOperationDetails({
  professional,
  services,
}: {
  professional: SetupProfessional
  services: readonly SetupService[]
}) {
  const today = new Intl.DateTimeFormat("en-CA").format(new Date())
  const summary = useProfessionalOperationalSummary(professional.id, today)
  return (
    <div className="mt-5 grid gap-4 border-t pt-4">
      <section aria-labelledby="professional-operation-title" className="grid gap-2">
        <h3 id="professional-operation-title" className="font-heading font-medium">
          Operação de hoje
        </h3>
        {summary.isPending ? (
          <p className="text-sm text-muted-foreground">Carregando Agenda e disponibilidade…</p>
        ) : summary.isError ? (
          <p className="text-sm text-destructive">
            Não foi possível carregar o resumo operacional.
          </p>
        ) : (
          <>
            <p className="text-sm">
              {summary.data.availabilityLabel} · {summary.data.commissionLabel}
            </p>
            {summary.data.unavailableReason ? (
              <p className="text-sm text-muted-foreground">{summary.data.unavailableReason}</p>
            ) : summary.data.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {summary.data.appointments.slice(0, 5).map((appointment) => (
                  <li key={appointment.id}>
                    {appointment.start} · {appointment.customerName} · {appointment.status}
                  </li>
                ))}
              </ul>
            )}
            <a
              className="w-fit rounded-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/agenda?date=${today}&period=today&scope=day&view=board&unit=centro&professional=${summary.data.agendaProfessionalId ?? professional.id}`}
            >
              Abrir Agenda deste profissional
            </a>
          </>
        )}
      </section>
      <section aria-labelledby="professional-services-title" className="grid gap-2">
        <h3 id="professional-services-title" className="font-heading font-medium">
          Serviços e exceções
        </h3>
        <ul className="grid gap-1 text-sm text-muted-foreground">
          {(summary.data?.serviceAssignments ?? []).map((assignment) => (
            <li key={assignment.serviceId}>
              {services.find(({ id }) => id === assignment.serviceId)?.name ?? assignment.serviceId}
              : {assignment.durationMinutes} min · {formatMoney(assignment.priceCents)}
              {assignment.source === "professional-override" ? " · Exceção" : " · Padrão"}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="professional-access-title" className="grid gap-2">
        <h3 id="professional-access-title" className="font-heading font-medium">
          Acesso demonstrativo
        </h3>
        <p className="text-sm text-muted-foreground">
          Esta apresentação não concede acesso real, não altera sessões e não substitui autorização
          no servidor.
        </p>
        <ul className="grid gap-1 text-sm">
          {professionalAccessChoices.map((choice) => (
            <li key={choice}>
              {professional.accessPolicy?.[choice] ? "Permitido" : "Não permitido"} ·{" "}
              {professionalAccessLabels[choice]}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Detail({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1">
      <dt className="font-medium">{label}</dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  )
}

function getDefaultValues(kind: SetupEntityKind, entity?: SetupEntity): SetupEntityFormValues {
  if (kind === "unit") {
    const unit = entity?.kind === "unit" ? entity : undefined
    return {
      kind,
      name: unit?.name ?? "",
      code: unit?.code ?? "",
      address: unit?.address ?? "",
      businessHours: unit
        ? { ...unit.businessHours, days: [...unit.businessHours.days] }
        : {
            days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
            start: "09:00",
            end: "18:00",
          },
    }
  }
  if (kind === "professional") {
    const professional = entity?.kind === "professional" ? entity : undefined
    return {
      kind,
      name: professional?.name ?? "",
      role: professional?.role ?? "Profissional de atendimento",
      accountAccess: professional?.accountAccess ?? "not-configured",
      accessPolicy: professional?.accessPolicy ?? createDefaultAccessPolicy(),
      commissionBasisPoints: (professional?.commissionBasisPoints ?? 5000) / 100,
      contactEmail: professional?.contactEmail ?? "",
      contactPhone: professional?.contactPhone ?? "",
      unitIds: [...(professional?.unitIds ?? [])],
      serviceIds: [...(professional?.serviceIds ?? [])],
      specialties: [...(professional?.specialties ?? [])],
    }
  }
  const service = entity?.kind === "service" ? entity : undefined
  return {
    kind,
    name: service?.name ?? "",
    category: service?.category ?? "",
    description: service?.description ?? "",
    durationMinutes: service?.durationMinutes ?? 30,
    price: (service?.priceCents ?? 0) / 100,
    unitIds: [...(service?.unitIds ?? [])],
    professionalIds: [...(service?.professionalIds ?? [])],
  }
}

type FormFieldsProps = { formId: string; form: ReturnType<typeof useForm<SetupEntityFormValues>> }
function fieldMessage(errors: FormFieldsProps["form"]["formState"]["errors"], name: string) {
  const error = errors[name as keyof typeof errors]
  return typeof error?.message === "string" ? error.message : undefined
}

function namesFor(ids: readonly string[], options: readonly SetupEntity[]) {
  return (
    ids.map((id) => options.find((option) => option.id === id)?.name ?? id).join(", ") ||
    "Nenhum vínculo"
  )
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

export function formatBusinessHours(hours: SetupUnit["businessHours"]) {
  const labels = hours.days.map(
    (day) => weekdayOptions.find(({ value }) => value === day)?.label ?? day,
  )
  return `${labels.join(", ")} · ${hours.start}–${hours.end}`
}

const weekdayOptions: ReadonlyArray<{ label: string; value: Weekday }> = [
  { label: "Seg", value: "monday" },
  { label: "Ter", value: "tuesday" },
  { label: "Qua", value: "wednesday" },
  { label: "Qui", value: "thursday" },
  { label: "Sex", value: "friday" },
  { label: "Sáb", value: "saturday" },
  { label: "Dom", value: "sunday" },
]

export const entityLabels = {
  unit: {
    emptyLabel: "Nenhuma unidade configurada",
    newLabel: "Nova unidade",
    plural: "Unidades",
    singular: "unidade",
  },
  professional: {
    emptyLabel: "Nenhum profissional configurado",
    newLabel: "Novo profissional",
    plural: "Profissionais",
    singular: "profissional",
  },
  service: {
    emptyLabel: "Nenhum serviço configurado",
    newLabel: "Novo serviço",
    plural: "Serviços",
    singular: "serviço",
  },
} as const

const accessLabels: Record<AccountAccessStatus, string> = {
  connected: "Conectado",
  invited: "Convite pendente",
  "not-configured": "Não configurado",
}

const professionalAccessLabels = {
  "own-schedule-only": "Visualizar apenas a própria Agenda",
  "create-appointments": "Criar agendamentos",
  "change-prices": "Alterar preços",
  "register-payments": "Registrar pagamentos",
  "view-revenue": "Visualizar faturamento",
  "view-commissions": "Visualizar comissões",
  "access-other-professionals": "Acessar dados de outros profissionais",
} as const

export type { EntityDrawerState }
