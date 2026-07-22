import { zodResolver } from "@hookform/resolvers/zod"
import { Building2Icon, Clock3Icon, MapPinIcon, ScissorsIcon, UserRoundIcon } from "lucide-react"
import type { ReactNode } from "react"
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
  address: z.string().trim().min(5, "Informe um endereço sintético para a apresentação."),
  businessHours: z.string().trim().min(5, "Informe o resumo dos horários."),
})

export const professionalFormSchema = z.object({
  kind: z.literal("professional"),
  ...baseSchema,
  role: z.string().trim().min(2, "Informe a função de apresentação."),
  accountAccess: z.enum(["connected", "invited", "not-configured"]),
  unitIds: z.array(z.string()).min(1, "Selecione pelo menos uma unidade."),
  serviceIds: z.array(z.string()),
})

export const serviceFormSchema = z.object({
  kind: z.literal("service"),
  ...baseSchema,
  category: z.string().trim().min(2, "Informe uma categoria."),
  description: z.string().trim().min(5, "Informe uma descrição."),
  durationMinutes: z.coerce.number().int().min(15, "Use duração mínima de 15 minutos."),
  price: z.coerce.number().min(0, "Informe um preço válido."),
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
  onSave,
  professionals,
  services,
  state,
  units,
}: {
  isSaving: boolean
  onClose: () => void
  onSave: (kind: SetupEntityKind, input: SetupEntityInput) => Promise<void>
  professionals: readonly SetupProfessional[]
  services: readonly SetupService[]
  state: EntityDrawerState
  units: readonly SetupUnit[]
}) {
  if (!state) return null
  const entity = state.kind === "create" ? undefined : state.entity
  const entityKind = state.kind === "create" ? state.entityKind : state.entity.kind
  if (state.kind === "view" && entity) {
    return (
      <EntityDetails
        entity={entity}
        onClose={onClose}
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
      isSaving={isSaving}
      onClose={onClose}
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
  isSaving,
  onClose,
  onSave,
  professionals,
  services,
  units,
}: {
  entity?: SetupEntity
  entityKind: SetupEntityKind
  isSaving: boolean
  onClose: () => void
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
      isOpen
      size="form"
      onOpenChange={(open) => !open && onClose()}
      context={entityLabels[entityKind].plural}
      title={
        entity ? `Editar ${entityLabels[entityKind].singular}` : entityLabels[entityKind].newLabel
      }
      description="Dados sintéticos e válidos somente nesta apresentação local."
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
            <RelationField control={form.control} name="unitIds" label="Unidades" options={units} />
            <RelationField
              control={form.control}
              name="serviceIds"
              label="Serviços oferecidos"
              options={services}
            />
          </FormSection>
        ) : null}
        {entityKind === "service" ? (
          <FormSection title="Disponibilidade do catálogo">
            <RelationField control={form.control} name="unitIds" label="Unidades" options={units} />
            <RelationField
              control={form.control}
              name="professionalIds"
              label="Profissionais elegíveis"
              options={professionals}
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
          {...form.register("role")}
        />
      </FormField>
      <FormField
        id={`${formId}-access`}
        label="Acesso à conta"
        description="Estado visual e somente leitura de identidade; não envia convites."
      >
        <Controller
          control={form.control}
          name="accountAccess"
          render={({ field }) => (
            <Select value={field.value as AccountAccessStatus} onValueChange={field.onChange}>
              <SelectTrigger id={`${formId}-access`}>
                <SelectValue>{accessLabels[field.value as AccountAccessStatus]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connected">Conectado (visual)</SelectItem>
                <SelectItem value="invited">Convite pendente (visual)</SelectItem>
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
          {...form.register("price", { valueAsNumber: true })}
        />
      </FormField>
    </>
  )
}

type RelationName = "professionalIds" | "serviceIds" | "unitIds"

function RelationField({
  control,
  label,
  name,
  options,
}: {
  control: ReturnType<typeof useForm<SetupEntityFormValues>>["control"]
  label: string
  name: RelationName
  options: readonly SetupEntity[]
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldSet data-invalid={fieldState.invalid}>
          <FieldLegend variant="label">{label}</FieldLegend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma opção ativa neste cenário.</p>
            ) : (
              options.map((option) => {
                const values = Array.isArray(field.value) ? field.value : []
                const id = `${name}-${option.id}`
                return (
                  <Field key={option.id} orientation="horizontal">
                    <input
                      id={id}
                      type="checkbox"
                      className="size-5 accent-primary"
                      checked={values.includes(option.id)}
                      onChange={(event) =>
                        field.onChange(
                          event.currentTarget.checked
                            ? [...values, option.id]
                            : values.filter((value) => value !== option.id),
                        )
                      }
                    />
                    <FieldLabel htmlFor={id}>{option.name}</FieldLabel>
                  </Field>
                )
              })
            )}
          </div>
          {fieldState.error ? (
            <p role="alert" className="text-sm text-destructive">
              {fieldState.error.message}
            </p>
          ) : null}
        </FieldSet>
      )}
    />
  )
}

function EntityDetails({
  entity,
  onClose,
  professionals,
  services,
  units,
}: {
  entity: SetupEntity
  onClose: () => void
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
      isOpen
      onOpenChange={(open) => !open && onClose()}
      context={entityLabels[entity.kind].plural}
      title="Visualizar"
      description="Detalhes sintéticos da apresentação."
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
  connected: "Conectado (apresentação)",
  invited: "Convite pendente (apresentação)",
  "not-configured": "Não configurado",
}

export type { EntityDrawerState }
