import { PaperclipIcon, XIcon } from "lucide-react"
import type { ComponentProps, FocusEventHandler, Ref } from "react"
import { useRef } from "react"

import { Button } from "@/modules/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { CompactSwitch, Switch } from "@/modules/shared/components/ui/switch"
import { cn } from "@/modules/shared/lib/utils"

export type SelectInputOption = {
  label: string
  value: string
}

type SelectInputProps = {
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  "aria-label"?: string
  className?: string
  disabled?: boolean
  id: string
  name?: string
  onBlur?: FocusEventHandler<HTMLButtonElement>
  onValueChange: (value: string) => void
  options: readonly SelectInputOption[]
  placeholder: string
  ref?: Ref<HTMLButtonElement>
  required?: boolean
  value: string
}

export function SelectInput({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  className,
  disabled,
  id,
  name,
  onBlur,
  onValueChange,
  options,
  placeholder,
  ref,
  required,
  value,
}: SelectInputProps) {
  return (
    <Select
      disabled={disabled}
      items={options}
      name={name}
      required={required}
      value={value || null}
      onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
    >
      <SelectTrigger
        ref={ref}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        className={className}
        disabled={disabled}
        id={id}
        onBlur={onBlur}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function CompactSelectInput(props: SelectInputProps) {
  return <SelectInput {...props} className={cn("h-8 rounded-sm px-2", props.className)} />
}

type SwitchControlProps = ComponentProps<typeof Switch>

export function SwitchControl({ ...props }: SwitchControlProps) {
  return <Switch {...props} />
}

export function CompactSwitchControl(props: ComponentProps<typeof CompactSwitch>) {
  return <CompactSwitch {...props} />
}

type FileInputProps = {
  accept?: string
  "aria-describedby"?: string
  disabled?: boolean
  id: string
  onValueChange: (file: File | null) => void
  placeholder: string
  value: File | null
}

export function FileInput({
  accept,
  "aria-describedby": ariaDescribedBy,
  disabled,
  id,
  onValueChange,
  placeholder,
  value,
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <label
        className={cn(
          "inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none hover:bg-muted focus-within:ring-3 focus-within:ring-ring/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
        htmlFor={id}
      >
        <PaperclipIcon aria-hidden="true" className="size-4" />
        Escolher arquivo
        <input
          ref={inputRef}
          accept={accept}
          aria-describedby={ariaDescribedBy}
          className="sr-only"
          disabled={disabled}
          id={id}
          type="file"
          onChange={(event) => onValueChange(event.currentTarget.files?.[0] ?? null)}
        />
      </label>
      {value ? (
        <>
          <span className="min-w-0 flex-1 truncate text-sm" aria-live="polite">
            {value.name}
          </span>
          <Button
            aria-label="Remover arquivo selecionado"
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = ""
              onValueChange(null)
            }}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </>
      ) : (
        <span className="text-muted-foreground text-sm">{placeholder}</span>
      )}
    </div>
  )
}

export function CompactFileInput({
  accept,
  "aria-describedby": ariaDescribedBy,
  disabled,
  id,
  onValueChange,
  placeholder,
  value,
}: FileInputProps) {
  return (
    <label
      className={cn(
        "flex h-8 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-sm border border-input bg-background px-2 text-sm outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-50",
      )}
      htmlFor={id}
    >
      <span className="min-w-0 flex-1 truncate text-muted-foreground" aria-live="polite">
        {value?.name ?? placeholder}
      </span>
      <PaperclipIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <input
        accept={accept}
        aria-describedby={ariaDescribedBy}
        className="sr-only"
        disabled={disabled}
        id={id}
        type="file"
        onChange={(event) => onValueChange(event.currentTarget.files?.[0] ?? null)}
      />
    </label>
  )
}

export function InputWithSuffix({
  children,
  suffix,
}: {
  children: React.ReactNode
  suffix: string
}) {
  return (
    <div className="flex min-w-0 items-stretch">
      <div className="min-w-0 flex-1 [&_input]:rounded-r-none">{children}</div>
      <span className="inline-flex min-h-10 items-center rounded-r-lg border border-l-0 bg-muted px-3 text-muted-foreground text-sm">
        {suffix}
      </span>
    </div>
  )
}

export function CompactInputWithSuffix({
  children,
  suffix,
}: {
  children: React.ReactNode
  suffix: string
}) {
  return (
    <div className="flex min-w-0 items-stretch">
      <div className="min-w-0 flex-1 [&_input]:rounded-r-none">{children}</div>
      <span className="inline-flex min-h-8 items-center rounded-r-sm border border-l-0 bg-muted px-2 text-muted-foreground text-sm">
        {suffix}
      </span>
    </div>
  )
}
