import type { LucideIcon } from "lucide-react"
import { CheckIcon, Loader2Icon, RotateCcwIcon } from "lucide-react"
import type {
  ChangeEvent,
  CSSProperties,
  FocusEvent,
  FocusEventHandler,
  KeyboardEvent,
  Ref,
} from "react"
import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"
import { cn } from "@/modules/shared/lib/utils"

export type ComboboxInputOption = {
  description?: string | null
  label: string
  value: string
}

type ComboboxInputProps = {
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  autoComplete?: string
  disabled?: boolean
  emptyLabel?: string
  id: string
  inputClassName?: string
  maxVisibleOptions?: number
  onBlur?: FocusEventHandler<HTMLInputElement>
  onOptionSelect: (option: ComboboxInputOption) => void
  onRetry?: () => void
  onValueChange: (value: string) => void
  options: readonly ComboboxInputOption[]
  placeholder?: string
  required?: boolean
  ref?: Ref<HTMLInputElement>
  status?: "idle" | "loading" | "error"
  startIcon?: LucideIcon
  value: string
}

export function ComboboxInput({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  autoComplete,
  disabled = false,
  emptyLabel = "Nenhuma opção encontrada",
  id,
  inputClassName,
  maxVisibleOptions = 50,
  onBlur,
  onOptionSelect,
  onRetry,
  onValueChange,
  options,
  placeholder,
  required,
  ref,
  status = "idle",
  startIcon: StartIcon,
  value,
}: ComboboxInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [listboxStyle, setListboxStyle] = useState<CSSProperties>()
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLDivElement>(null)
  const listboxId = `${id}-listbox`
  const statusId = `${id}-status`
  const visibleOptions = useMemo(
    () => options.filter((option) => option.label.trim().length > 0).slice(0, maxVisibleOptions),
    [maxVisibleOptions, options],
  )

  const boundedActiveIndex = Math.min(activeIndex, visibleOptions.length - 1)

  useLayoutEffect(() => {
    if (!isOpen) return

    function updatePosition() {
      const input = inputRef.current
      if (!input) return
      const rect = input.getBoundingClientRect()
      const viewportPadding = 8
      const gap = 4
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding - gap
      const availableAbove = rect.top - viewportPadding - gap
      const openAbove = availableBelow < 160 && availableAbove > availableBelow
      const maxHeight = Math.max(80, Math.min(256, openAbove ? availableAbove : availableBelow))
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2)
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - width - viewportPadding,
      )

      setListboxStyle({
        bottom: openAbove ? window.innerHeight - rect.top + gap : undefined,
        left,
        maxHeight,
        top: openAbove ? undefined : rect.bottom + gap,
        width,
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    const observer =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(updatePosition)
    if (inputRef.current) observer?.observe(inputRef.current)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [isOpen])

  function setInputRefs(node: HTMLInputElement | null) {
    inputRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(event.target.value)
    setIsOpen(true)
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onBlur?.(event)
    if (
      event.relatedTarget instanceof HTMLElement &&
      (event.currentTarget.parentElement?.contains(event.relatedTarget) ||
        listboxRef.current?.contains(event.relatedTarget))
    ) {
      return
    }

    setIsOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      setIsOpen(true)
      if (visibleOptions.length === 0) return
      setActiveIndex((current) => {
        const direction = event.key === "ArrowDown" ? 1 : -1
        if (current < 0) return direction > 0 ? 0 : visibleOptions.length - 1
        return (current + direction + visibleOptions.length) % visibleOptions.length
      })
      return
    }

    if (event.key === "Enter" && isOpen && boundedActiveIndex >= 0) {
      event.preventDefault()
      const option = visibleOptions[boundedActiveIndex]
      if (option) {
        onOptionSelect(option)
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
  }

  const listbox =
    isOpen && !disabled && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            style={listboxStyle}
            className="fixed z-60 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            {status === "loading" ? (
              <div className="flex h-10 items-center gap-2 px-2 text-muted-foreground text-sm">
                <Loader2Icon
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
                Buscando...
              </div>
            ) : status === "error" ? (
              <div className="space-y-2 p-2 text-sm">
                <p>Não foi possível buscar as opções.</p>
                {onRetry ? (
                  <Button type="button" variant="outline" onClick={onRetry}>
                    <RotateCcwIcon aria-hidden="true" />
                    Tentar novamente
                  </Button>
                ) : null}
              </div>
            ) : visibleOptions.length > 0 ? (
              visibleOptions.map((option, index) => {
                const isSelected = option.label === value || option.value === value
                const isActive = index === boundedActiveIndex

                return (
                  <button
                    id={`${id}-option-${index}`}
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    className={cn(
                      "flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      isActive && "bg-accent text-accent-foreground",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      onOptionSelect(option)
                      setIsOpen(false)
                      setActiveIndex(-1)
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-muted-foreground text-xs">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    <CheckIcon
                      aria-hidden="true"
                      className={cn("size-4 opacity-0", isSelected && "opacity-100")}
                    />
                  </button>
                )
              })
            ) : (
              <div className="px-2 py-2 text-muted-foreground text-sm">{emptyLabel}</div>
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative">
      {StartIcon ? (
        <StartIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        />
      ) : null}
      <Input
        ref={setInputRefs}
        id={id}
        className={cn(StartIcon && "pl-8", inputClassName)}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && boundedActiveIndex >= 0 ? `${id}-option-${boundedActiveIndex}` : undefined
        }
        aria-describedby={[ariaDescribedBy, statusId].filter(Boolean).join(" ") || undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        role="combobox"
        value={value}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {listbox}
      <p id={statusId} className="sr-only" role="status" aria-live="polite">
        {status === "loading"
          ? "Buscando opções."
          : status === "error"
            ? "Não foi possível buscar as opções."
            : isOpen
              ? `${visibleOptions.length} opções disponíveis.`
              : ""}
      </p>
    </div>
  )
}

export function CompactComboboxInput(props: ComboboxInputProps) {
  return (
    <ComboboxInput
      {...props}
      inputClassName={cn("h-8 rounded-sm py-1", !props.startIcon && "px-2", props.inputClassName)}
    />
  )
}
