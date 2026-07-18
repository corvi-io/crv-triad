import type * as React from "react"
import { useEffect, useRef, useState } from "react"

import { Input } from "@/modules/shared/components/ui/input"
import {
  applyInputMask,
  formatBrazilianRegistration,
  INPUT_MASK_METADATA,
  type InputMaskName,
  normalizeInputMask,
} from "@/modules/shared/lib/input-masks"

type MaskedInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "inputMode" | "maxLength" | "onChange" | "type" | "value"
> & {
  mask: InputMaskName
  onValueChange: (value: string) => void
  ref?: React.Ref<HTMLInputElement>
  value: string
}

function MaskedInput({ mask, ...props }: MaskedInputProps) {
  return mask === "brRegistration" ? (
    <BrazilianRegistrationInput mask={mask} {...props} />
  ) : (
    <StandardMaskedInput mask={mask} {...props} />
  )
}

function BrazilianRegistrationInput({
  mask: _mask,
  onValueChange,
  ref,
  value,
  ...props
}: MaskedInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatBrazilianRegistration(value))

  useEffect(() => {
    if (normalizeInputMask("brRegistration", displayValue) !== value) {
      setDisplayValue(formatBrazilianRegistration(value))
    }
  }, [displayValue, value])

  return (
    <Input
      ref={ref}
      inputMode="text"
      maxLength={INPUT_MASK_METADATA.brRegistration.maxLength}
      type="text"
      value={displayValue}
      onChange={(event) => {
        const nextDisplayValue = formatBrazilianRegistration(event.currentTarget.value)
        setDisplayValue(nextDisplayValue)
        onValueChange(normalizeInputMask("brRegistration", nextDisplayValue))
      }}
      {...props}
    />
  )
}

function StandardMaskedInput({
  mask,
  onKeyDown,
  onValueChange,
  placeholder,
  ref,
  value,
  ...props
}: MaskedInputProps) {
  const metadata = INPUT_MASK_METADATA[mask]
  const inputRef = useRef<HTMLInputElement>(null)

  function setRefs(node: HTMLInputElement | null) {
    inputRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  function restoreCaret(canonicalValue: string, canonicalOffset: number) {
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      const nextCaret = getDisplayIndexForCanonicalOffset(mask, canonicalValue, canonicalOffset)
      input.setSelectionRange(nextCaret, nextCaret)
    })
  }

  return (
    <Input
      ref={setRefs}
      inputMode={metadata.inputMode}
      maxLength={metadata.maxLength}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || (event.key !== "Backspace" && event.key !== "Delete")) return

        const input = event.currentTarget
        const selectionStart = input.selectionStart ?? 0
        const selectionEnd = input.selectionEnd ?? selectionStart
        const canonicalValue = normalizeInputMask(mask, input.value)
        const canonicalUnits = getCanonicalEditUnits(mask, canonicalValue)
        const startOffset = getCanonicalOffsetAtDisplayIndex(mask, input.value, selectionStart)
        const endOffset = getCanonicalOffsetAtDisplayIndex(mask, input.value, selectionEnd)
        let deleteStart = startOffset
        let deleteEnd = endOffset

        if (selectionStart === selectionEnd) {
          if (event.key === "Backspace") {
            if (startOffset === 0) return
            deleteStart = startOffset - 1
          } else {
            if (startOffset >= canonicalUnits.length) return
            deleteEnd = startOffset + 1
          }
        }

        event.preventDefault()
        const nextUnits = `${canonicalUnits.slice(0, deleteStart)}${canonicalUnits.slice(deleteEnd)}`
        const nextCanonicalValue = getCanonicalValueFromEditUnits(mask, nextUnits)
        onValueChange(nextCanonicalValue)
        restoreCaret(nextCanonicalValue, deleteStart)
      }}
      onChange={(event) => {
        const caret = event.currentTarget.selectionStart ?? event.currentTarget.value.length
        const canonicalBeforeCaret = normalizeInputMask(
          mask,
          event.currentTarget.value.slice(0, caret),
        )
        const canonicalValue = normalizeInputMask(mask, event.currentTarget.value)
        onValueChange(canonicalValue)
        restoreCaret(canonicalValue, getCanonicalEditUnits(mask, canonicalBeforeCaret).length)
      }}
      placeholder={placeholder}
      type={metadata.type}
      value={applyInputMask(mask, value)}
      {...props}
    />
  )
}

function getCanonicalEditUnits(mask: InputMaskName, canonicalValue: string) {
  return mask === "brMoney" ? canonicalValue.replace(/\D/g, "") : canonicalValue
}

function getCanonicalValueFromEditUnits(mask: InputMaskName, editUnits: string) {
  return mask === "brMoney" ? normalizeInputMask(mask, editUnits) : editUnits
}

function getCanonicalOffsetAtDisplayIndex(
  mask: InputMaskName,
  displayValue: string,
  index: number,
) {
  if (mask === "brMoney") return displayValue.slice(0, index).replace(/\D/g, "").length
  return getCanonicalEditUnits(mask, normalizeInputMask(mask, displayValue.slice(0, index))).length
}

function getDisplayIndexForCanonicalOffset(
  mask: InputMaskName,
  canonicalValue: string,
  canonicalOffset: number,
) {
  const displayValue = applyInputMask(mask, canonicalValue)
  if (canonicalOffset === 0) {
    return mask === "brMoney" ? Math.max(0, displayValue.search(/\d/)) : 0
  }

  for (let index = 1; index <= displayValue.length; index += 1) {
    if (getCanonicalOffsetAtDisplayIndex(mask, displayValue, index) >= canonicalOffset) return index
  }

  return displayValue.length
}

export { MaskedInput }
