import { zodResolver } from "@hookform/resolvers/zod"
import {
  Building2Icon,
  Clock3Icon,
  MapPinIcon,
  PlusIcon,
  ScissorsIcon,
  Trash2Icon,
} from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import {
  FormField,
  FormSection,
  getFieldDescriptionIds,
} from "@/modules/shared/components/forms/form-layout"
import { MaskedInput } from "@/modules/shared/components/forms/masked-input"
import { TagInput } from "@/modules/shared/components/forms/tag-input"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { Button } from "@/modules/shared/components/ui/button"
import { Checkbox } from "@/modules/shared/components/ui/checkbox"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/modules/shared/components/ui/toggle-group"
import type {
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
      periods: z
        .array(
          z
            .object({
              days: z.array(
                z.enum([
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ]),
              ),
              start: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário inicial."),
              end: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário final."),
            })
            .refine(({ days }) => days.length > 0, "Selecione pelo menos um dia.")
            .refine(({ end, start }) => start < end, "O término deve ser posterior ao início."),
        )
        .min(1, "Adicione pelo menos um período de funcionamento."),
    })
    .refine(({ days }) => days.length > 0, {
      message: "Selecione pelo menos um dia de funcionamento.",
      path: ["days"],
    })
    .refine(({ end, start }) => start < end, {
      message: "O término deve ser posterior ao início.",
      path: ["end"],
    })
    .refine(
      ({ periods }) => {
        const days = periods.flatMap((period) => period.days)
        return new Set(days).size === days.length
      },
      {
        message: "Cada dia pode pertencer a apenas um período.",
        path: ["periods"],
      },
    ),
})

export const professionalFormSchema = z.object({
  kind: z.literal("professional"),
  role: z.string().trim().min(2, "Informe a função do profissional."),
  invitationEmail: z.string().email("Informe um e-mail válido.").or(z.literal("")),
  commissionBasisPoints: z.preprocess((value) => {
    const numericValue = Number(value)
    return Math.round(numericValue <= 100 ? numericValue * 100 : numericValue)
  }, z.number().int().min(0).max(10_000)),
  specialties: z.array(
    z.string().trim().min(2, "Informe especialidades com pelo menos 2 caracteres."),
  ),
  unitIds: z.array(z.string()),
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
    .min(15, "Use duração mínima de 15 minutos.")
    .max(300, "Use duração máxima de 5 horas.")
    .multipleOf(15, "Use intervalos de 15 minutos."),
  price: z.number({ error: "Informe o preço do serviço." }).min(0, "Informe um preço válido."),
  unitIds: z.array(z.string()),
  professionalIds: z.array(z.string()),
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
      const firstPeriod = input.businessHours.periods[0]
      await onSave("unit", {
        ...input,
        businessHours: { ...firstPeriod, periods: input.businessHours.periods },
      } satisfies UnitInput)
    } else if (parsed.kind === "professional") {
      if (!entity && !parsed.invitationEmail) {
        form.setError(
          "invitationEmail",
          { message: "Informe o e-mail do convite." },
          { shouldFocus: true },
        )
        return
      }
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
          {entityKind !== "professional" ? (
            <FormField
              id={`${formId}-name`}
              label="Nome"
              icon={entityKind === "unit" ? Building2Icon : ScissorsIcon}
              required
              error={fieldMessage(form.formState.errors, "name")}
            >
              <Input
                id={`${formId}-name`}
                autoFocus
                placeholder={entityPlaceholders[entityKind].name}
                aria-invalid={Boolean(fieldMessage(form.formState.errors, "name"))}
                aria-describedby={getFieldDescriptionIds(
                  `${formId}-name`,
                  false,
                  Boolean(fieldMessage(form.formState.errors, "name")),
                )}
                {...form.register("name")}
              />
            </FormField>
          ) : entity?.kind === "professional" ? (
            <div className="grid gap-1">
              <span className="text-sm font-medium">Identidade</span>
              <span className="text-sm text-muted-foreground">{entity.name}</span>
            </div>
          ) : null}
          {entityKind === "unit" ? <UnitFields formId={formId} form={form} /> : null}
          {entityKind === "professional" ? (
            <ProfessionalFields formId={formId} form={form} isCreate={!entity} />
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
  const periods = useFieldArray({ control: form.control, name: "businessHours.periods" })
  const businessHoursErrors = form.formState.errors as {
    businessHours?: {
      days?: { message?: string }
      end?: { message?: string }
      periods?:
        | { message?: string; root?: { message?: string } }
        | Array<{
            days?: { message?: string }
            end?: { message?: string }
            start?: { message?: string }
          }>
      start?: { message?: string }
    }
  }
  const periodErrors = businessHoursErrors.businessHours?.periods
  const periodError = Array.isArray(periodErrors)
    ? (periodErrors.find(Boolean)?.days?.message ??
      periodErrors.find(Boolean)?.start?.message ??
      periodErrors.find(Boolean)?.end?.message)
    : (periodErrors?.message ?? periodErrors?.root?.message)
  const businessHoursError =
    businessHoursErrors.businessHours?.days?.message ??
    businessHoursErrors.businessHours?.start?.message ??
    businessHoursErrors.businessHours?.end?.message ??
    periodError

  function handlePeriodDaysChange(index: number, nextDays: Weekday[]) {
    const newlySelectedDays = nextDays.filter(
      (day) => !form.getValues(`businessHours.periods.${index}.days`).includes(day),
    )

    for (let otherIndex = 0; otherIndex < periods.fields.length; otherIndex += 1) {
      if (otherIndex === index) continue
      const otherDays = form.getValues(`businessHours.periods.${otherIndex}.days`)
      const remainingDays = otherDays.filter((day) => !newlySelectedDays.includes(day))
      if (remainingDays.length !== otherDays.length) {
        form.setValue(`businessHours.periods.${otherIndex}.days`, remainingDays, {
          shouldDirty: true,
          shouldValidate: form.formState.isSubmitted,
        })
      }
    }

    form.setValue(`businessHours.periods.${index}.days`, nextDays, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
  }
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
          placeholder="Ex.: CENTRO"
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
          placeholder="Ex.: Rua do Sol, 120, Centro"
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "address"))}
          aria-describedby={getFieldDescriptionIds(
            `${formId}-address`,
            false,
            Boolean(fieldMessage(form.formState.errors, "address")),
          )}
          {...form.register("address")}
        />
      </FormField>
      <FieldSet data-invalid={Boolean(businessHoursError)}>
        <FieldLegend variant="label" className="flex items-center gap-2">
          <Clock3Icon aria-hidden="true" className="size-4" />
          Funcionamento *
        </FieldLegend>
        <p className="text-sm text-muted-foreground">
          Crie períodos diferentes para cada grupo de dias.
        </p>
        <div className="grid gap-3">
          {periods.fields.map((period, index) => (
            <div key={period.id} className="grid gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Período {index + 1}</p>
                {periods.fields.length > 1 ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remover período ${index + 1}`}
                    onClick={() => periods.remove(index)}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name={`businessHours.periods.${index}.start`}
                  render={({ field }) => (
                    <TimePicker
                      id={`${formId}-period-${index}-start`}
                      label="Início"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`businessHours.periods.${index}.end`}
                  render={({ field }) => (
                    <TimePicker
                      id={`${formId}-period-${index}-end`}
                      label="Fim"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </div>
              <Controller
                control={form.control}
                name={`businessHours.periods.${index}.days`}
                render={({ field }) => (
                  <ToggleGroup
                    aria-label={`Dias do período ${index + 1}`}
                    className="flex-wrap"
                    multiple
                    value={field.value}
                    variant="outline"
                    onValueChange={(value) => handlePeriodDaysChange(index, value as Weekday[])}
                  >
                    {weekdayOptions.map(({ label, value }) => (
                      <ToggleGroupItem key={value} value={value} aria-label={label}>
                        {label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => {
            const assignedDays = new Set(
              form.getValues("businessHours.periods").flatMap((period) => period.days),
            )
            const firstAvailableDay = weekdayOptions.find(({ value }) => !assignedDays.has(value))
            periods.append({
              days: firstAvailableDay ? [firstAvailableDay.value] : [],
              start: "09:00",
              end: "12:00",
            })
          }}
        >
          <PlusIcon aria-hidden="true" />
          Adicionar período
        </Button>
        {businessHoursError ? (
          <p role="alert" className="text-sm text-destructive">
            {businessHoursError}
          </p>
        ) : null}
      </FieldSet>
    </>
  )
}

const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4)
  const minute = (index % 4) * 15
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
})

function TimePicker({
  id,
  label,
  onValueChange,
  value,
}: {
  id: string
  label: string
  onValueChange: (value: string) => void
  value: string
}) {
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(next) => next && onValueChange(next)}>
        <SelectTrigger id={id}>
          <SelectValue>{value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {timeOptions.map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}

function ProfessionalFields({ formId, form, isCreate }: FormFieldsProps & { isCreate: boolean }) {
  return (
    <>
      {isCreate ? (
        <FormField
          id={`${formId}-email`}
          label="E-mail do convite"
          required
          error={fieldMessage(form.formState.errors, "invitationEmail")}
        >
          <Input
            id={`${formId}-email`}
            type="email"
            placeholder="Ex.: profissional@email.com"
            aria-invalid={Boolean(fieldMessage(form.formState.errors, "invitationEmail"))}
            {...form.register("invitationEmail")}
          />
        </FormField>
      ) : null}
      <FormField
        id={`${formId}-role`}
        label="Função"
        required
        error={fieldMessage(form.formState.errors, "role")}
      >
        <Input
          id={`${formId}-role`}
          placeholder="Ex.: Barbeiro"
          aria-invalid={Boolean(fieldMessage(form.formState.errors, "role"))}
          {...form.register("role")}
        />
      </FormField>
      <FormField
        id={`${formId}-commission`}
        label="Comissão padrão (%)"
        required
        error={fieldMessage(form.formState.errors, "commissionBasisPoints")}
      >
        <Controller
          control={form.control}
          name="commissionBasisPoints"
          render={({ field }) => (
            <div className="relative">
              <MaskedInput
                id={`${formId}-commission`}
                className="pr-9"
                mask="brPercent"
                placeholder="40,00"
                value={String(field.value ?? "")}
                onBlur={field.onBlur}
                onValueChange={(value) => field.onChange(value ? Number(value) : 0)}
                aria-invalid={Boolean(fieldMessage(form.formState.errors, "commissionBasisPoints"))}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
              >
                %
              </span>
            </div>
          )}
        />
      </FormField>
      <FormField
        id={`${formId}-specialties`}
        label="Especialidades"
        error={fieldMessage(form.formState.errors, "specialties")}
      >
        <Controller
          control={form.control}
          name="specialties"
          render={({ field, fieldState }) => (
            <TagInput
              id={`${formId}-specialties`}
              aria-describedby={getFieldDescriptionIds(
                `${formId}-specialties`,
                false,
                fieldState.invalid,
              )}
              aria-invalid={fieldState.invalid}
              placeholder="Ex.: Corte clássico"
              value={field.value.join(", ")}
              onValueChange={(value) =>
                field.onChange(
                  value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
              }
            />
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
          placeholder="Ex.: Cabelo"
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
          placeholder="Ex.: Corte masculino com acabamento e finalização"
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
        <Controller
          control={form.control}
          name="durationMinutes"
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(value) => value && field.onChange(Number(value))}
            >
              <SelectTrigger
                id={`${formId}-duration`}
                aria-invalid={fieldMessage(form.formState.errors, "durationMinutes") !== undefined}
              >
                <SelectValue>{formatDuration(Number(field.value))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {durationOptions.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {formatDuration(minutes)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <FormField
        id={`${formId}-price`}
        label="Preço (R$)"
        required
        error={fieldMessage(form.formState.errors, "price")}
      >
        <Controller
          control={form.control}
          name="price"
          render={({ field }) => (
            <MaskedInput
              id={`${formId}-price`}
              mask="brMoney"
              placeholder="R$ 55,00"
              value={String(field.value ?? "")}
              onBlur={field.onBlur}
              onValueChange={(value) => field.onChange(Number(value))}
              aria-invalid={Boolean(fieldMessage(form.formState.errors, "price"))}
            />
          )}
        />
      </FormField>
    </>
  )
}

type RelationName = "professionalIds" | "serviceIds" | "unitIds"

const durationOptions = Array.from({ length: 20 }, (_, index) => (index + 1) * 15)

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`
}

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
                      <Checkbox
                        id={id}
                        ref={index === 0 ? field.ref : undefined}
                        name={field.name}
                        checked={values.includes(option.id)}
                        aria-describedby={describedBy || undefined}
                        aria-invalid={fieldState.invalid}
                        onBlur={field.onBlur}
                        onCheckedChange={(checked) => {
                          const nextValues = checked
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
            ["Especialidades", entity.specialties?.join(", ") || "-"],
            ["Comissão", `${(entity.commissionBasisPoints ?? 0) / 100}%`],
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
      businessHours: unit
        ? {
            ...unit.businessHours,
            days: [...unit.businessHours.days],
            periods: (unit.businessHours.periods ?? [unit.businessHours]).map((period) => ({
              ...period,
              days: [...period.days],
            })),
          }
        : {
            days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
            start: "09:00",
            end: "18:00",
            periods: [
              {
                days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
                start: "09:00",
                end: "18:00",
              },
              { days: ["saturday"], start: "09:00", end: "12:00" },
            ],
          },
    }
  }
  if (kind === "professional") {
    const professional = entity?.kind === "professional" ? entity : undefined
    return {
      kind,
      invitationEmail: "",
      role: professional?.role ?? "Barbeiro",
      commissionBasisPoints: (professional?.commissionBasisPoints ?? 5000) / 100,
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
  return (hours.periods ?? [hours])
    .map((period) => {
      const labels = period.days.map(
        (day) => weekdayOptions.find(({ value }) => value === day)?.label ?? day,
      )
      return `${labels.join(", ")} · ${period.start}–${period.end}`
    })
    .join("; ")
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

const entityPlaceholders: Record<SetupEntityKind, { name: string }> = {
  unit: { name: "Ex.: Unidade Centro" },
  professional: { name: "Ex.: Gabriel Silva" },
  service: { name: "Ex.: Corte masculino" },
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
    newLabel: "Convidar profissional",
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

export type { EntityDrawerState }
