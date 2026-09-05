import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useId, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { getApiUrl } from "@/modules/auth/services/auth-client"
import { MaskedInput } from "@/modules/shared/components/forms/masked-input"
import { TagInput } from "@/modules/shared/components/forms/tag-input"
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
            <TagInput
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
      <Controller
        control={form.control}
        name="unitPreferenceIds"
        render={({ field }) => (
          <CatalogPreferenceField
            id={`${fieldPrefix}-unit-preferences`}
            kind="units"
            label="Unidades preferidas"
            limit={5}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="professionalPreferenceIds"
        render={({ field }) => (
          <CatalogPreferenceField
            id={`${fieldPrefix}-professional-preferences`}
            kind="professionals"
            label="Profissionais preferidos"
            limit={5}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="servicePreferenceIds"
        render={({ field }) => (
          <CatalogPreferenceField
            id={`${fieldPrefix}-service-preferences`}
            kind="services"
            label="Serviços preferidos"
            limit={20}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
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

type CatalogOption = { id: string; name: string; status: "active" | "archived" }
function CatalogPreferenceField({
  id,
  kind,
  label,
  limit,
  value,
  onChange,
}: {
  id: string
  kind: "professionals" | "services" | "units"
  label: string
  limit: number
  value: readonly string[]
  onChange: (value: string[]) => void
}) {
  const [options, setOptions] = useState<readonly CatalogOption[]>([])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ selectedIds: value.join(",") })
    fetch(getApiUrl(`/api/${kind}/options?${query}`), {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) =>
        response.ok ? (response.json() as Promise<CatalogOption[]>) : Promise.reject(),
      )
      .then((items) => {
        setOptions(items)
        setFailed(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [kind, value])
  return (
    <FormField id={id} label={label}>
      <fieldset id={id} className="grid gap-2 rounded-md border p-3">
        <legend className="sr-only">{label}</legend>
        <span className="text-xs text-muted-foreground">Selecione até {limit}.</span>
        {failed ? (
          <span role="status" className="text-sm text-destructive">
            Não foi possível carregar as opções.
          </span>
        ) : null}
        {!failed && options.length === 0 ? (
          <span className="text-sm text-muted-foreground">Nenhuma opção ativa disponível.</span>
        ) : null}
        {options.map((option) => {
          const checked = value.includes(option.id)
          return (
            <label
              key={option.id}
              className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={option.status === "archived" && !checked}
                onChange={(event) =>
                  onChange(
                    event.currentTarget.checked
                      ? [...value, option.id].slice(0, limit)
                      : value.filter((item) => item !== option.id),
                  )
                }
              />
              <span>
                {option.name}
                {option.status === "archived" ? " (arquivado)" : ""}
              </span>
            </label>
          )
        })}
      </fieldset>
    </FormField>
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
