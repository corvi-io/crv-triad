import type { FocusEventHandler, Ref } from "react"

import { CompactSelectInput } from "@/modules/shared/components/form-controls"
import { MaskedInput } from "@/modules/shared/components/masked-input"

export const quantityUnitOptions = [
  { label: "t", value: "t" },
  { label: "m³", value: "m³" },
  { label: "kg", value: "kg" },
  { label: "un", value: "un" },
] as const

type CompactQuantityUnitControlProps = {
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  amountName?: string
  amountRef?: Ref<HTMLInputElement>
  amountValue: string
  id: string
  onAmountBlur?: FocusEventHandler<HTMLInputElement>
  onAmountChange: (value: string) => void
  onUnitBlur?: FocusEventHandler<HTMLButtonElement>
  onUnitChange: (value: string) => void
  placeholder: string
  required?: boolean
  unitAriaLabel: string
  unitName?: string
  unitRef?: Ref<HTMLButtonElement>
  unitValue: string
}

export function CompactQuantityUnitControl({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  amountName,
  amountRef,
  amountValue,
  id,
  onAmountBlur,
  onAmountChange,
  onUnitBlur,
  onUnitChange,
  placeholder,
  required,
  unitAriaLabel,
  unitName,
  unitRef,
  unitValue,
}: CompactQuantityUnitControlProps) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4.5rem] items-stretch">
      <MaskedInput
        ref={amountRef}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className="h-8 rounded-r-none rounded-l-sm px-2 py-1"
        id={id}
        mask="brDecimal"
        name={amountName}
        placeholder={placeholder}
        required={required}
        value={amountValue}
        onBlur={onAmountBlur}
        onValueChange={onAmountChange}
      />
      <CompactSelectInput
        ref={unitRef}
        aria-label={unitAriaLabel}
        className="rounded-r-sm rounded-l-none border-l-0 text-xs"
        id={`${id}-unit`}
        name={unitName}
        options={quantityUnitOptions}
        placeholder="un"
        required={required}
        value={unitValue}
        onBlur={onUnitBlur}
        onValueChange={onUnitChange}
      />
    </div>
  )
}
