import type { LucideIcon } from "lucide-react"
import type { ComponentProps } from "react"
import { type Control, type FieldPath, type FieldValues, useController } from "react-hook-form"

import {
  ComboboxInput,
  type ComboboxInputOption,
  CompactComboboxInput,
} from "@/modules/shared/components/combobox-input"
import { DatePicker } from "@/modules/shared/components/date-picker"
import {
  CompactInputWithSuffix,
  CompactSelectInput,
  CompactSwitchControl,
  InputWithSuffix,
  SelectInput,
  type SelectInputOption,
  SwitchControl,
} from "@/modules/shared/components/form-controls"
import {
  CompactFormField,
  CompactFormSwitchItem,
  FormField,
  FormSwitchItem,
  getFieldDescriptionIds,
} from "@/modules/shared/components/form-layout"
import { MaskedInput } from "@/modules/shared/components/masked-input"
import { CompactQuantityUnitControl } from "@/modules/shared/components/quantity-unit-control"
import { Input } from "@/modules/shared/components/ui/input"
import {
  CompactDescriptionTextarea,
  CompactTextarea,
  Textarea,
} from "@/modules/shared/components/ui/textarea"
import type { InputMaskName } from "@/modules/shared/lib/input-masks"

type ControlledFieldProps<TValues extends FieldValues> = {
  control: Control<TValues>
  description?: string
  id: string
  icon?: LucideIcon
  label: string
  name: FieldPath<TValues>
  required?: boolean
}

type RhfTextFieldProps<TValues extends FieldValues> = ControlledFieldProps<TValues> &
  Pick<ComponentProps<typeof Input>, "autoComplete" | "inputMode" | "placeholder" | "type">

export function RhfTextField<TValues extends FieldValues>({
  autoComplete,
  control,
  description,
  id,
  icon,
  inputMode,
  label,
  name,
  placeholder,
  required,
  type,
}: RhfTextFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <FormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <Input
        {...field}
        id={id}
        value={String(field.value ?? "")}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
      />
    </FormField>
  )
}

type RhfMaskedFieldProps<TValues extends FieldValues> = ControlledFieldProps<TValues> & {
  mask: InputMaskName
  placeholder: string
  suffix?: string
}

export function RhfMaskedField<TValues extends FieldValues>({
  control,
  description,
  id,
  icon,
  label,
  mask,
  name,
  placeholder,
  required,
  suffix,
}: RhfMaskedFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message
  const input = (
    <MaskedInput
      ref={field.ref}
      id={id}
      mask={mask}
      name={field.name}
      placeholder={placeholder}
      required={required}
      value={String(field.value ?? "")}
      onBlur={field.onBlur}
      onValueChange={field.onChange}
      aria-invalid={Boolean(error)}
      aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
    />
  )

  return (
    <FormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      {suffix ? <InputWithSuffix suffix={suffix}>{input}</InputWithSuffix> : input}
    </FormField>
  )
}

type RhfSelectFieldProps<TValues extends FieldValues> = ControlledFieldProps<TValues> & {
  disabled?: boolean
  options: readonly SelectInputOption[]
  placeholder: string
}

export function RhfSelectField<TValues extends FieldValues>({
  control,
  description,
  disabled,
  id,
  icon,
  label,
  name,
  options,
  placeholder,
  required,
}: RhfSelectFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <FormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <SelectInput
        ref={field.ref}
        disabled={disabled}
        id={id}
        name={field.name}
        onBlur={field.onBlur}
        onValueChange={field.onChange}
        value={String(field.value ?? "")}
        options={options}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
      />
    </FormField>
  )
}

type RhfTextareaFieldProps<TValues extends FieldValues> = ControlledFieldProps<TValues> & {
  placeholder?: string
}

export function RhfTextareaField<TValues extends FieldValues>({
  control,
  description,
  id,
  icon,
  label,
  name,
  placeholder,
  required,
}: RhfTextareaFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <FormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <Textarea
        {...field}
        id={id}
        value={String(field.value ?? "")}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
      />
    </FormField>
  )
}

type RhfComboboxFieldProps<TValues extends FieldValues> = ControlledFieldProps<TValues> & {
  controlIcon?: LucideIcon
  options: readonly ComboboxInputOption[]
  placeholder: string
}

export function RhfComboboxField<TValues extends FieldValues>({
  control,
  controlIcon,
  description,
  id,
  icon,
  label,
  name,
  options,
  placeholder,
  required,
}: RhfComboboxFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <FormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <ComboboxInput
        ref={field.ref}
        id={id}
        value={String(field.value ?? "")}
        options={options}
        placeholder={placeholder}
        required={required}
        startIcon={controlIcon}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
        onOptionSelect={(option) => field.onChange(option.label)}
        aria-invalid={Boolean(error)}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
      />
    </FormField>
  )
}

type RhfSwitchFieldProps<TValues extends FieldValues> = {
  control: Control<TValues>
  icon?: LucideIcon
  label: string
  name: FieldPath<TValues>
}

export function RhfSwitchField<TValues extends FieldValues>({
  control,
  label,
  name,
}: RhfSwitchFieldProps<TValues>) {
  const { field } = useController({ control, name })
  const id = `form-switch-${String(name).replaceAll(".", "-")}`

  return (
    <FormSwitchItem htmlFor={id} label={label}>
      <SwitchControl
        ref={field.ref}
        checked={Boolean(field.value)}
        id={id}
        name={field.name}
        onBlur={field.onBlur}
        onCheckedChange={(checked) => field.onChange(checked)}
      />
    </FormSwitchItem>
  )
}

export function CompactRhfTextField<TValues extends FieldValues>({
  autoComplete,
  control,
  description,
  id,
  icon,
  inputMode,
  label,
  name,
  placeholder,
  required,
  type,
}: RhfTextFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <CompactFormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <Input
        {...field}
        className="h-8 rounded-sm px-2 py-1"
        id={id}
        value={String(field.value ?? "")}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
      />
    </CompactFormField>
  )
}

export function CompactRhfMaskedField<TValues extends FieldValues>({
  control,
  description,
  id,
  icon,
  label,
  mask,
  name,
  placeholder,
  required,
  suffix,
}: RhfMaskedFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <CompactFormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      {suffix ? (
        <CompactInputWithSuffix suffix={suffix}>
          <MaskedInput
            ref={field.ref}
            className="h-8 rounded-sm px-2 py-1"
            id={id}
            mask={mask}
            name={field.name}
            placeholder={placeholder}
            required={required}
            value={String(field.value ?? "")}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
            aria-invalid={Boolean(error)}
            aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
          />
        </CompactInputWithSuffix>
      ) : (
        <MaskedInput
          ref={field.ref}
          className="h-8 rounded-sm px-2 py-1"
          id={id}
          mask={mask}
          name={field.name}
          placeholder={placeholder}
          required={required}
          value={String(field.value ?? "")}
          onBlur={field.onBlur}
          onValueChange={field.onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
        />
      )}
    </CompactFormField>
  )
}

export function CompactRhfSelectField<TValues extends FieldValues>({
  control,
  description,
  disabled,
  id,
  icon,
  label,
  name,
  options,
  placeholder,
  required,
}: RhfSelectFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <CompactFormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <CompactSelectInput
        ref={field.ref}
        disabled={disabled}
        id={id}
        name={field.name}
        value={String(field.value ?? "")}
        options={options}
        placeholder={placeholder}
        required={required}
        onBlur={field.onBlur}
        onValueChange={field.onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
      />
    </CompactFormField>
  )
}

type CompactRhfDateFieldProps<TValues extends FieldValues> = ControlledFieldProps<TValues> & {
  placeholder: string
}

export function CompactRhfDateField<TValues extends FieldValues>({
  control,
  description,
  id,
  icon,
  label,
  name,
  placeholder,
  required,
}: CompactRhfDateFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <CompactFormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <DatePicker
        ref={field.ref}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
        aria-invalid={Boolean(error)}
        id={id}
        name={field.name}
        placeholder={placeholder}
        required={required}
        value={String(field.value ?? "")}
        onBlur={field.onBlur}
        onValueChange={field.onChange}
      />
    </CompactFormField>
  )
}

type CompactRhfQuantityFieldProps<TValues extends FieldValues> = Omit<
  ControlledFieldProps<TValues>,
  "name"
> & {
  amountName: FieldPath<TValues>
  placeholder: string
  unitName: FieldPath<TValues>
}

export function CompactRhfQuantityField<TValues extends FieldValues>({
  amountName,
  control,
  description,
  id,
  icon,
  label,
  placeholder,
  required,
  unitName,
}: CompactRhfQuantityFieldProps<TValues>) {
  const amount = useController({ control, name: amountName })
  const unit = useController({ control, name: unitName })
  const error = amount.fieldState.error?.message ?? unit.fieldState.error?.message

  return (
    <CompactFormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <CompactQuantityUnitControl
        amountRef={amount.field.ref}
        amountName={amount.field.name}
        amountValue={String(amount.field.value ?? "")}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
        aria-invalid={Boolean(error)}
        id={id}
        placeholder={placeholder}
        required={required}
        unitAriaLabel={`${label}: unidade`}
        unitName={unit.field.name}
        unitRef={unit.field.ref}
        unitValue={String(unit.field.value ?? "")}
        onAmountBlur={amount.field.onBlur}
        onAmountChange={amount.field.onChange}
        onUnitBlur={unit.field.onBlur}
        onUnitChange={unit.field.onChange}
      />
    </CompactFormField>
  )
}

export function CompactRhfSwitchField<TValues extends FieldValues>({
  control,
  label,
  name,
}: RhfSwitchFieldProps<TValues>) {
  const { field } = useController({ control, name })
  const id = `compact-form-switch-${String(name).replaceAll(".", "-")}`

  return (
    <CompactFormSwitchItem htmlFor={id} label={label}>
      <CompactSwitchControl
        ref={field.ref}
        checked={Boolean(field.value)}
        id={id}
        name={field.name}
        onBlur={field.onBlur}
        onCheckedChange={(checked) => field.onChange(checked)}
      />
    </CompactFormSwitchItem>
  )
}

export function CompactRhfInlineSwitchField<TValues extends FieldValues>({
  control,
  icon,
  label,
  name,
}: RhfSwitchFieldProps<TValues>) {
  const { field } = useController({ control, name })
  const id = `compact-inline-switch-${String(name).replaceAll(".", "-")}`

  return (
    <CompactFormField id={id} icon={icon} label={label}>
      <div className="flex min-h-8 items-center justify-start gap-3 rounded-sm border px-2">
        <CompactSwitchControl
          ref={field.ref}
          checked={Boolean(field.value)}
          id={id}
          name={field.name}
          onBlur={field.onBlur}
          onCheckedChange={(checked) => field.onChange(checked)}
        />
        <span className="text-muted-foreground text-sm" aria-live="polite">
          {field.value ? "Sim" : "Não"}
        </span>
      </div>
    </CompactFormField>
  )
}

export function CompactRhfComboboxField<TValues extends FieldValues>({
  control,
  controlIcon,
  description,
  id,
  icon,
  label,
  name,
  options,
  placeholder,
  required,
}: RhfComboboxFieldProps<TValues>) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <CompactFormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <CompactComboboxInput
        ref={field.ref}
        id={id}
        value={String(field.value ?? "")}
        options={options}
        placeholder={placeholder}
        required={required}
        startIcon={controlIcon}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
        onOptionSelect={(option) => field.onChange(option.label)}
        aria-invalid={Boolean(error)}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
      />
    </CompactFormField>
  )
}

function CompactRhfTextareaFieldLayout<TValues extends FieldValues>({
  control,
  description,
  id,
  icon,
  label,
  name,
  placeholder,
  required,
  variant,
}: RhfTextareaFieldProps<TValues> & { variant: "description" | "observations" }) {
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message
  const TextareaComponent = variant === "description" ? CompactDescriptionTextarea : CompactTextarea

  return (
    <CompactFormField
      id={id}
      icon={icon}
      label={label}
      required={required}
      description={description}
      error={error}
    >
      <TextareaComponent
        {...field}
        id={id}
        value={String(field.value ?? "")}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={getFieldDescriptionIds(id, Boolean(description), Boolean(error))}
      />
    </CompactFormField>
  )
}

export function CompactRhfTextareaField<TValues extends FieldValues>(
  props: RhfTextareaFieldProps<TValues>,
) {
  return <CompactRhfTextareaFieldLayout {...props} variant="observations" />
}

export function CompactRhfDescriptionField<TValues extends FieldValues>(
  props: RhfTextareaFieldProps<TValues>,
) {
  return <CompactRhfTextareaFieldLayout {...props} variant="description" />
}
