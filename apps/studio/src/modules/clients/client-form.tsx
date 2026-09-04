import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useId, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { MaskedInput } from "@/modules/shared/components/forms/masked-input"
import { Button } from "@/modules/shared/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import {
  type ClientFormValues,
  clientFormSchema,
  clientFormValuesToInput,
  createClientFormDefaults,
} from "./client-schema"
import { ClientTagInput } from "./client-tag-input"
import type { ClientInput } from "./contracts"
import { useClientRepository } from "./repository-context"

export function ClientForm({
  client,
  clientId,
  formId,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  client?: ClientInput
  clientId?: string
  formId: string
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: (input: ClientInput) => Promise<void>
}) {
  const fieldPrefix = useId()
  const form = useForm<ClientFormValues>({
    defaultValues: createClientFormDefaults(client),
    resolver: zodResolver(clientFormSchema),
  })
  const repository = useClientRepository()
  const [email, phone] = useWatch({ control: form.control, name: ["email", "phone"] })
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([])

  useEffect(() => form.reset(createClientFormDefaults(client)), [client, form])
  useEffect(() => {
    let active = true
    repository
      .findDuplicates({ email, phone }, clientId)
      .then((warnings) => {
        if (active) {
          setDuplicateWarnings(
            warnings.map(({ candidateName, label }) => `${label}: ${candidateName}`),
          )
        }
      })
      .catch(() => {
        if (active) setDuplicateWarnings([])
      })
    return () => {
      active = false
    }
  }, [clientId, email, phone, repository])

  return (
    <form
      id={formId}
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit(async (values) => onSubmit(clientFormValuesToInput(values)))}
    >
      <FormField
        error={form.formState.errors.name?.message}
        id={`${fieldPrefix}-name`}
        label="Nome"
        required
      >
        <Input
          id={`${fieldPrefix}-name`}
          autoComplete="name"
          aria-invalid={Boolean(form.formState.errors.name)}
          aria-describedby={form.formState.errors.name ? `${fieldPrefix}-name-error` : undefined}
          placeholder="Ex.: Gabriel Silva"
          {...form.register("name")}
        />
      </FormField>
      {duplicateWarnings.length > 0 ? (
        <aside className="rounded-lg border border-warning/50 bg-warning/10 p-3" role="status">
          <p className="text-sm font-medium">Possível duplicidade</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Revise as correspondências exatas antes de salvar. Os registros não serão mesclados.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {duplicateWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </aside>
      ) : null}
      <FormField
        error={form.formState.errors.phone?.message}
        id={`${fieldPrefix}-phone`}
        label="Telefone"
      >
        <Controller
          control={form.control}
          name="phone"
          render={({ field }) => (
            <MaskedInput
              id={`${fieldPrefix}-phone`}
              mask="brPhone"
              placeholder="(81) 99999-9999"
              value={field.value}
              onBlur={field.onBlur}
              onValueChange={field.onChange}
              aria-invalid={Boolean(form.formState.errors.phone)}
              aria-describedby={
                form.formState.errors.phone ? `${fieldPrefix}-phone-error` : undefined
              }
            />
          )}
        />
      </FormField>
      <FormField
        error={form.formState.errors.email?.message}
        id={`${fieldPrefix}-email`}
        label="E-mail"
      >
        <Input
          id={`${fieldPrefix}-email`}
          type="email"
          autoComplete="email"
          placeholder="Ex.: gabriel@email.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby={form.formState.errors.email ? `${fieldPrefix}-email-error` : undefined}
          {...form.register("email")}
        />
      </FormField>
      <FormField
        error={form.formState.errors.tagsText?.message}
        id={`${fieldPrefix}-tags`}
        label="Tags"
      >
        <Controller
          control={form.control}
          name="tagsText"
          render={({ field }) => (
            <ClientTagInput
              id={`${fieldPrefix}-tags`}
              value={field.value}
              onValueChange={field.onChange}
              aria-invalid={Boolean(form.formState.errors.tagsText)}
              aria-describedby={
                form.formState.errors.tagsText ? `${fieldPrefix}-tags-error` : undefined
              }
            />
          )}
        />
      </FormField>
      <FormField
        error={form.formState.errors.servicePreferencesText?.message}
        id={`${fieldPrefix}-preferences`}
        label="Preferências de serviço"
      >
        <Input
          id={`${fieldPrefix}-preferences`}
          placeholder="Corte clássico, Barba"
          aria-invalid={Boolean(form.formState.errors.servicePreferencesText)}
          {...form.register("servicePreferencesText")}
        />
      </FormField>
      <FormField
        error={form.formState.errors.preferenceNote?.message}
        id={`${fieldPrefix}-preference-note`}
        label="Orientação de atendimento"
      >
        <Textarea
          id={`${fieldPrefix}-preference-note`}
          placeholder="Ex.: Confirmar o acabamento antes de finalizar"
          aria-invalid={Boolean(form.formState.errors.preferenceNote)}
          {...form.register("preferenceNote")}
        />
      </FormField>
      <div className="sr-only" aria-live="polite">
        {isSubmitting ? "Salvando cliente." : ""}
      </div>
      <div className="flex justify-end gap-2 pt-2 sm:hidden">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

function FormField({
  children,
  error,
  id,
  label,
  required,
}: {
  children: React.ReactNode
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
      {error ? (
        <FieldError id={`${id}-error`} role="alert">
          {error}
        </FieldError>
      ) : null}
    </Field>
  )
}
