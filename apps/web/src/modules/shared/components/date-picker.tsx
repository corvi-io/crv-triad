import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { FocusEventHandler, Ref } from "react"
import { useRef, useState } from "react"
import { ptBR } from "react-day-picker/locale"

import { Button } from "@/modules/shared/components/ui/button"
import { Calendar } from "@/modules/shared/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/modules/shared/components/ui/popover"
import { cn } from "@/modules/shared/lib/utils"

type DatePickerProps = {
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  disabled?: boolean
  id: string
  name?: string
  onBlur?: FocusEventHandler<HTMLButtonElement>
  onValueChange: (value: string) => void
  placeholder: string
  ref?: Ref<HTMLButtonElement>
  required?: boolean
  value: string
}

export function DatePicker({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  disabled,
  id,
  name,
  onBlur,
  onValueChange,
  placeholder,
  ref,
  required,
  value,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const selectedDate = parseDateOnly(value)
  const [displayedMonth, setDisplayedMonth] = useState(() => selectedDate ?? new Date())

  function handleOpenChange(open: boolean) {
    if (open) setDisplayedMonth(selectedDate ?? new Date())
    setIsOpen(open)
  }

  function getInitialCalendarFocus() {
    return (
      calendarRef.current?.querySelector<HTMLButtonElement>('[data-selected-single="true"]') ??
      calendarRef.current?.querySelector<HTMLButtonElement>('[data-today="true"] button') ??
      false
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            ref={ref}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-required={required || undefined}
            className={cn(
              "h-8 w-full justify-start rounded-sm border-input px-2 font-normal",
              !selectedDate && "text-muted-foreground",
            )}
            disabled={disabled}
            id={id}
            name={name}
            type="button"
            variant="outline"
            onBlur={onBlur}
          />
        }
      >
        <CalendarIcon aria-hidden="true" className="size-4" />
        <span>
          {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" initialFocus={getInitialCalendarFocus}>
        <PopoverTitle className="sr-only">Selecionar data</PopoverTitle>
        <div ref={calendarRef}>
          <Calendar
            autoFocus
            captionLayout="dropdown"
            endMonth={new Date(2100, 11)}
            locale={ptBR}
            mode="single"
            month={displayedMonth}
            selected={selectedDate}
            startMonth={new Date(1900, 0)}
            onMonthChange={setDisplayedMonth}
            onSelect={(date) => {
              if (!date) return
              onValueChange(formatDateOnly(date))
              setIsOpen(false)
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function formatDateOnly(date: Date) {
  const year = String(date.getFullYear()).padStart(4, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }
  return date
}
