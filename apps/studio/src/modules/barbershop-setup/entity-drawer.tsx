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
import { Textarea } from "@/modules/shared/components/ui/textarea"
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
} from "./contracts"

const baseSchema = {
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
}

export const unitFormSchema = z.object({
  kind: z.literal("unit"),
  ...baseSchema,
  code: z.string().trim().min(2, "Informe um código curto."),
  address: z.string().trim().min(5, "Informe um endereço válido."),
  businessHours: z.string().trim().min(5, "Informe o resumo dos horários."),
})

export const professionalFormSchema = z.object({
  kind: z.literal("professional"),
  ...baseSchema,
  role: z.string().trim().min(2, "Informe a função do profissional."),
  accountAccess: z.enum(["connected", "invited", "not-configured"]),
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
        id={`${formId}-business-hours`}
        label="Funcionamento"
        icon={Clock3Icon}
        required
        error={fieldMessage(form.formState.errors, "businessHours")}
      >
        <Input
          id={`${formId}-business-hours`}
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "businessHours"))}
          aria-describedby={getFieldDescriptionIds(
            `${formId}-business-hours`,
            false,
            Boolean(fieldMessage(form.formState.errors, "businessHours")),
          )}
          {...form.register("businessHours")}
        />
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
          ["Funcionamento", entity.businessHours],
        ]
      : entity.kind === "professional"
        ? [
            ["Função", entity.role],
            ["Unidades", namesFor(entity.unitIds, units)],
            ["Serviços", namesFor(entity.serviceIds, services)],
            ["Acesso", accessLabels[entity.accountAccess]],
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
    </ActionDrawer>
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
      businessHours: unit?.businessHours ?? "Seg–Sex, 09:00–18:00",
    }
  }
  if (kind === "professional") {
    const professional = entity?.kind === "professional" ? entity : undefined
    return {
      kind,
      name: professional?.name ?? "",
      role: professional?.role ?? "Profissional de atendimento",
      accountAccess: professional?.accountAccess ?? "not-configured",
      unitIds: [...(professional?.unitIds ?? [])],
      serviceIds: [...(professional?.serviceIds ?? [])],
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

export type { EntityDrawerState }
