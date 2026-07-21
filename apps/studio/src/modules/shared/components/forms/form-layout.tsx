import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { CollapsibleDrawerSection } from "@/modules/shared/components/overlays/drawer-section"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/modules/shared/components/ui/field"

type FormSectionProps = {
  children: ReactNode
  title: string
}

export function FormSection({ children, title }: FormSectionProps) {
  return (
    <CollapsibleDrawerSection title={title} defaultOpen>
      <div className="space-y-2">{children}</div>
    </CollapsibleDrawerSection>
  )
}

type FormFieldProps = {
  children: ReactNode
  description?: string
  error?: string
  id: string
  icon?: LucideIcon
  label: string
  required?: boolean
}

type FormFieldDensity = "standard" | "compact"

function FormFieldLayout({
  children,
  description,
  error,
  id,
  icon: Icon,
  label,
  required = false,
  density,
}: FormFieldProps & { density: FormFieldDensity }) {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const isCompact = density === "compact"

  return (
    <Field data-invalid={Boolean(error)}>
      <div className="grid gap-1 sm:grid-cols-[12.5rem_minmax(0,1fr)] sm:items-start sm:gap-6">
        <FieldLabel
          className={
            isCompact
              ? "min-h-8 gap-2 text-muted-foreground"
              : "min-h-10 gap-2 text-muted-foreground"
          }
          htmlFor={id}
          required={required}
        >
          {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
          {label}
        </FieldLabel>
        <div className="min-w-0 space-y-1">
          {children}
          {description ? (
            <FieldDescription id={descriptionId}>{description}</FieldDescription>
          ) : null}
          {error ? <FieldError id={errorId}>{error}</FieldError> : null}
        </div>
      </div>
    </Field>
  )
}

export function FormField(props: FormFieldProps) {
  return <FormFieldLayout {...props} density="standard" />
}

export function CompactFormField(props: FormFieldProps) {
  return <FormFieldLayout {...props} density="compact" />
}

export function getFieldDescriptionIds(id: string, description: boolean, error: boolean) {
  return (
    [description ? `${id}-description` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined
  )
}

export function FormSwitchGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

export function CompactFormSwitchGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

export function CompactFormSwitchStack({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="grid gap-1">{children}</div>
    </fieldset>
  )
}

export function CompactFormGroup({
  children,
  icon: Icon,
  label,
}: {
  children: ReactNode
  icon?: LucideIcon
  label: string
}) {
  return (
    <fieldset className="grid gap-1 sm:grid-cols-[12.5rem_minmax(0,1fr)] sm:items-start sm:gap-6">
      <legend className="float-left flex min-h-8 w-full items-center gap-2 text-muted-foreground text-sm leading-5">
        {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
        {label}
      </legend>
      <div className="min-w-0 sm:col-start-2">{children}</div>
    </fieldset>
  )
}

function FormSwitchItemLayout({
  children,
  density,
  htmlFor,
  label,
}: {
  children: ReactNode
  density: FormFieldDensity
  htmlFor: string
  label: string
}) {
  return (
    <label
      className={
        density === "compact"
          ? "flex min-h-8 cursor-pointer items-center justify-between gap-3 rounded-md border px-2 text-sm text-muted-foreground"
          : "flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2"
      }
      htmlFor={htmlFor}
    >
      <span className="text-sm">{label}</span>
      {children}
    </label>
  )
}

export function FormSwitchItem(props: { children: ReactNode; htmlFor: string; label: string }) {
  return <FormSwitchItemLayout {...props} density="standard" />
}

export function CompactFormSwitchItem(props: {
  children: ReactNode
  htmlFor: string
  label: string
}) {
  return <FormSwitchItemLayout {...props} density="compact" />
}
