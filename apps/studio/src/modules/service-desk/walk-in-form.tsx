import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { Professional, Service } from "@/modules/scheduling/contracts"
import { MaskedInput } from "@/modules/shared/components/forms/masked-input"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/modules/shared/components/ui/toggle-group"
import type { WalkInInput } from "./contracts"
import {
  createWalkInFormDefaults,
  type WalkInFormValues,
  walkInFormSchema,
  walkInFormValuesToInput,
} from "./walk-in-schema"

export function WalkInForm({
  formId,
  now,
  onSubmit,
  professionals,
  services,
  unitId,
}: {
  formId: string
  now: Date
  onSubmit: (input: WalkInInput) => Promise<void>
  professionals: readonly Professional[]
  services: readonly Service[]
  unitId: "centro" | "artesao"
}) {
  const form = useForm<WalkInFormValues>({
    defaultValues: createWalkInFormDefaults(now),
    resolver: zodResolver(walkInFormSchema),
    shouldFocusError: true,
  })
  const [preferenceKind, serviceId] = useWatch({
    control: form.control,
    name: ["preferenceKind", "serviceId"],
  })
  const service = services.find(({ id }) => id === serviceId)
  const eligibleProfessionals = professionals.filter(({ id }) =>
    service?.eligibleProfessionalIds.includes(id),
  )
  const serviceItems = services.map(({ id, name }) => ({ label: name, value: id }))
  const professionalItems = eligibleProfessionals.map(({ id, name }) => ({
    label: name,
    value: id,
  }))

  const submit = form.handleSubmit(
    async (values) => onSubmit(walkInFormValuesToInput(values, now, unitId)),
    (errors) => {
      const order: (keyof WalkInFormValues)[] = [
        "customerName",
        "customerPhone",
        "serviceId",
        "preferenceKind",
        "professionalId",
        "arrivalTime",
        "priority",
        "notes",
      ]
      const first = order.find((name) => errors[name])
      if (first) form.setFocus(first)
    },
  )

  return (
    <form id={formId} noValidate onSubmit={submit}>
      <FieldGroup>
        <FormField
          error={form.formState.errors.customerName?.message}
          id={`${formId}-customer-name`}
          label="Nome do cliente"
          required
        >
          <Input
            id={`${formId}-customer-name`}
            autoComplete="name"
            aria-invalid={Boolean(form.formState.errors.customerName)}
            aria-describedby={
              form.formState.errors.customerName ? `${formId}-customer-name-error` : undefined
            }
            {...form.register("customerName")}
          />
        </FormField>

        <FormField
          error={form.formState.errors.customerPhone?.message}
          id={`${formId}-customer-phone`}
          label="Telefone"
        >
          <Controller
            control={form.control}
            name="customerPhone"
            render={({ field }) => (
              <MaskedInput
                id={`${formId}-customer-phone`}
                mask="brPhone"
                ref={field.ref}
                value={field.value}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
                aria-invalid={Boolean(form.formState.errors.customerPhone)}
                aria-describedby={
                  form.formState.errors.customerPhone ? `${formId}-customer-phone-error` : undefined
                }
              />
            )}
          />
        </FormField>

        <FormField
          error={form.formState.errors.serviceId?.message}
          id={`${formId}-service`}
          label="Serviço"
          required
        >
          <Controller
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <Select
                items={serviceItems}
                value={field.value || null}
                onValueChange={(value) => {
                  field.onChange(value ?? "")
                  form.setValue("professionalId", "", { shouldValidate: true })
                }}
              >
                <SelectTrigger
                  id={`${formId}-service`}
                  ref={field.ref}
                  aria-invalid={Boolean(form.formState.errors.serviceId)}
                  aria-describedby={
                    form.formState.errors.serviceId ? `${formId}-service-error` : undefined
                  }
                >
                  <SelectValue>
                    {services.find(({ id }) => id === field.value)?.name ?? "Escolha um serviço"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {services.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FieldSet>
          <FieldLegend variant="label">Preferência de profissional *</FieldLegend>
          <Controller
            control={form.control}
            name="preferenceKind"
            render={({ field }) => (
              <ToggleGroup
                value={[field.value]}
                onValueChange={(values) => {
                  const value = values[0]
                  if (!value) return
                  field.onChange(value)
                  if (value === "first-available") {
                    form.setValue("professionalId", "", { shouldValidate: true })
                  }
                }}
                aria-invalid={Boolean(form.formState.errors.preferenceKind)}
                aria-describedby={
                  form.formState.errors.preferenceKind
                    ? `${formId}-preference-kind-error`
                    : undefined
                }
                className="flex w-full flex-wrap"
              >
                <ToggleGroupItem value="specific" variant="outline">
                  Profissional específico
                </ToggleGroupItem>
                <ToggleGroupItem value="first-available" variant="outline">
                  Primeiro disponível
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          />
          <FieldError id={`${formId}-preference-kind-error`}>
            {form.formState.errors.preferenceKind?.message}
          </FieldError>
        </FieldSet>

        {preferenceKind === "specific" ? (
          <FormField
            error={form.formState.errors.professionalId?.message}
            id={`${formId}-professional`}
            label="Profissional"
            required
          >
            <Controller
              control={form.control}
              name="professionalId"
              render={({ field }) => (
                <Select
                  items={professionalItems}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger
                    id={`${formId}-professional`}
                    ref={field.ref}
                    aria-invalid={Boolean(form.formState.errors.professionalId)}
                    aria-describedby={
                      form.formState.errors.professionalId
                        ? `${formId}-professional-error`
                        : undefined
                    }
                  >
                    <SelectValue>
                      {eligibleProfessionals.find(({ id }) => id === field.value)?.name ??
                        (serviceId ? "Escolha um profissional" : "Escolha primeiro o serviço")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleProfessionals.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        ) : null}

        <FormField
          error={form.formState.errors.arrivalTime?.message}
          id={`${formId}-arrival-time`}
          label="Horário de chegada"
          required
        >
          <Input
            id={`${formId}-arrival-time`}
            type="time"
            aria-invalid={Boolean(form.formState.errors.arrivalTime)}
            aria-describedby={
              form.formState.errors.arrivalTime ? `${formId}-arrival-time-error` : undefined
            }
            {...form.register("arrivalTime")}
          />
        </FormField>

        <FieldSet>
          <FieldLegend variant="label">Prioridade *</FieldLegend>
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <ToggleGroup
                value={[field.value]}
                onValueChange={(values) => values[0] && field.onChange(values[0])}
                aria-invalid={Boolean(form.formState.errors.priority)}
                aria-describedby={
                  form.formState.errors.priority ? `${formId}-priority-error` : undefined
                }
              >
                <ToggleGroupItem value="normal" variant="outline">
                  Normal
                </ToggleGroupItem>
                <ToggleGroupItem value="fit-in" variant="outline">
                  Encaixe
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          />
          <FieldError id={`${formId}-priority-error`}>
            {form.formState.errors.priority?.message}
          </FieldError>
        </FieldSet>

        <FormField
          error={form.formState.errors.notes?.message}
          id={`${formId}-notes`}
          label="Observações"
          description="Não informe senhas, cartões, documentos, dados de saúde ou outros dados sensíveis."
        >
          <Textarea
            id={`${formId}-notes`}
            maxLength={300}
            aria-invalid={Boolean(form.formState.errors.notes)}
            aria-describedby={`${formId}-notes-description${form.formState.errors.notes ? ` ${formId}-notes-error` : ""}`}
            {...form.register("notes")}
          />
        </FormField>
      </FieldGroup>
    </form>
  )
}

function FormField({
  children,
  description,
  error,
  id,
  label,
  required,
}: {
  children: React.ReactNode
  description?: string
  error?: string
  id: string
  label: string
  required?: boolean
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {children}
      {description ? (
        <p className="text-sm text-muted-foreground" id={`${id}-description`}>
          {description}
        </p>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  )
}
