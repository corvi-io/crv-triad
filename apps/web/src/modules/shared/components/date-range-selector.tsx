import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"

import { cn } from "@/modules/shared/lib/utils"

import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./ui/dropdown-menu"

export type DateRangeValue = {
  from: string
  to: string
}

type DateRangeSelectorVariant = "sm" | "md" | "lg"

type DateRangePresetId =
  | "today"
  | "yesterday"
  | "last-7-days"
  | "last-14-days"
  | "last-30-days"
  | "this-week"
  | "previous-week"
  | "this-month"
  | "previous-month"

type DateRangePreset = {
  id: DateRangePresetId
  label: string
  getRange: (today: Date) => DateRangeValue
}

type DateRangeSelectorProps = {
  align?: "start" | "center" | "end"
  numberOfMonths?: 1 | 2
  onChange: (value: DateRangeValue) => void
  showCalendar?: boolean
  showCompareToggle?: boolean
  showFooter?: boolean
  showPresets?: boolean
  value: DateRangeValue
  variant?: DateRangeSelectorVariant
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: "today",
    label: "Hoje",
    getRange: (today) => {
      const key = dateKey(today)
      return { from: key, to: key }
    },
  },
  {
    id: "yesterday",
    label: "Ontem",
    getRange: (today) => {
      const key = dateKey(addDays(today, -1))
      return { from: key, to: key }
    },
  },
  {
    id: "last-7-days",
    label: "Últimos 7 dias",
    getRange: (today) => ({
      from: dateKey(addDays(today, -6)),
      to: dateKey(today),
    }),
  },
  {
    id: "last-14-days",
    label: "Últimos 14 dias",
    getRange: (today) => ({
      from: dateKey(addDays(today, -13)),
      to: dateKey(today),
    }),
  },
  {
    id: "last-30-days",
    label: "Últimos 30 dias",
    getRange: (today) => ({
      from: dateKey(addDays(today, -29)),
      to: dateKey(today),
    }),
  },
  {
    id: "this-week",
    label: "Esta semana",
    getRange: (today) => ({
      from: dateKey(addDays(today, -today.getDay())),
      to: dateKey(today),
    }),
  },
  {
    id: "previous-week",
    label: "Semana passada",
    getRange: (today) => {
      const startOfThisWeek = addDays(today, -today.getDay())
      return {
        from: dateKey(addDays(startOfThisWeek, -7)),
        to: dateKey(addDays(startOfThisWeek, -1)),
      }
    },
  },
  {
    id: "this-month",
    label: "Este mês",
    getRange: (today) => ({
      from: dateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: dateKey(today),
    }),
  },
  {
    id: "previous-month",
    label: "Mês anterior",
    getRange: (today) => {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: dateKey(firstDay), to: dateKey(lastDay) }
    },
  },
]

export function DateRangeSelector({
  align = "end",
  numberOfMonths = 2,
  onChange,
  showCalendar = true,
  showCompareToggle = false,
  showFooter = true,
  showPresets = true,
  value,
  variant = "md",
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftRange, setDraftRange] = useState(value)
  const [isPickingEnd, setIsPickingEnd] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(addMonths(parseDateKey(value.to), numberOfMonths === 2 ? -1 : 0)),
  )
  const [compareEnabled, setCompareEnabled] = useState(false)
  const today = useMemo(() => startOfDay(new Date()), [])
  const activePreset = getActivePreset(value, today)
  const previousDraftRange = getPreviousDateRange(draftRange)
  const months = Array.from({ length: numberOfMonths }, (_, index) =>
    addMonths(visibleMonth, index),
  )
  const variantClasses = getVariantClasses(variant, numberOfMonths)

  function handleOpenChange(nextIsOpen: boolean) {
    if (nextIsOpen) {
      setDraftRange(value)
      setIsPickingEnd(false)
      setVisibleMonth(
        startOfMonth(addMonths(parseDateKey(value.to), numberOfMonths === 2 ? -1 : 0)),
      )
    }
    setIsOpen(nextIsOpen)
  }

  function selectPreset(preset: DateRangePreset) {
    const range = preset.getRange(today)
    setDraftRange(range)
    setIsPickingEnd(false)
    setVisibleMonth(startOfMonth(addMonths(parseDateKey(range.to), numberOfMonths === 2 ? -1 : 0)))
  }

  function applyDraftRange() {
    if (!isValidDateRange(draftRange)) {
      return
    }

    onChange(normalizeRangeOrder(draftRange))
    setIsOpen(false)
  }

  function cancelDraftRange() {
    setDraftRange(value)
    setIsPickingEnd(false)
    setIsOpen(false)
  }

  function selectDay(day: Date) {
    const selectedKey = dateKey(day)
    const currentFrom = parseDateKey(draftRange.from)

    if (!isPickingEnd || day < currentFrom) {
      setDraftRange({ from: selectedKey, to: selectedKey })
      setIsPickingEnd(true)
      return
    }

    setDraftRange({ from: draftRange.from, to: selectedKey })
    setIsPickingEnd(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("justify-start", variantClasses.trigger)}
          >
            <CalendarDays />
            <span className="truncate">{formatDateRangeTrigger(value, activePreset)}</span>
          </Button>
        }
      />
      <DropdownMenuContent
        align={align}
        className={cn("p-0", variantClasses.content)}
        sideOffset={6}
      >
        <div className="grid">
          <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                {showCompareToggle ? (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <button
                      aria-pressed={compareEnabled}
                      className={cn(
                        "relative h-7 w-12 rounded-full border bg-muted transition-colors",
                        compareEnabled && "border-primary bg-primary",
                      )}
                      onClick={() => setCompareEnabled((current) => !current)}
                      type="button"
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 size-6 rounded-full bg-background shadow-sm transition-transform",
                          compareEnabled && "translate-x-5",
                        )}
                      />
                    </button>
                    Comparar
                  </label>
                ) : null}
                <div className="flex items-center gap-2">
                  <DateRangeDisplay label="Início" value={draftRange.from} variant={variant} />
                  <span className="text-muted-foreground">-</span>
                  <DateRangeDisplay label="Fim" value={draftRange.to} variant={variant} />
                </div>
              </div>

              {showCalendar ? (
                <div className="grid gap-3 lg:grid-cols-[auto_auto]">
                  {months.map((month, index) => (
                    <MonthCalendar
                      canGoNext={index === months.length - 1}
                      canGoPrevious={index === 0}
                      daySizeClassName={variantClasses.day}
                      key={dateKey(month)}
                      month={month}
                      onNext={() => setVisibleMonth((current) => addMonths(current, 1))}
                      onPrevious={() => setVisibleMonth((current) => addMonths(current, -1))}
                      onSelectDay={selectDay}
                      range={draftRange}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {showPresets ? (
              <div className="grid gap-1 border-t pt-2 lg:min-w-40 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-3">
                {DATE_RANGE_PRESETS.map((preset) => {
                  const isActive = rangesEqual(draftRange, preset.getRange(today))
                  return (
                    <Button
                      className={cn("justify-start", isActive && "bg-muted")}
                      key={preset.id}
                      onClick={() => selectPreset(preset)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {isActive ? <Check /> : null}
                      {preset.label}
                    </Button>
                  )
                })}
              </div>
            ) : null}
          </div>

          {showFooter ? (
            <div className="flex items-center justify-between gap-3 border-t p-3">
              <p className="hidden text-xs leading-5 text-muted-foreground sm:block">
                Comparação: {formatDateRange(previousDraftRange)}
              </p>
              <div className="ml-auto flex items-center gap-2">
                <Button onClick={cancelDraftRange} type="button" variant="ghost">
                  Cancelar
                </Button>
                <Button
                  disabled={!isValidDateRange(draftRange)}
                  onClick={applyDraftRange}
                  type="button"
                >
                  Atualizar
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getDefaultDateRange(): DateRangeValue {
  return getDateRangePreset("last-30-days")
}

export function getDateRangePreset(id: DateRangePresetId): DateRangeValue {
  const preset = DATE_RANGE_PRESETS.find((item) => item.id === id)
  if (!preset) {
    return DATE_RANGE_PRESETS[4].getRange(startOfDay(new Date()))
  }
  return preset.getRange(startOfDay(new Date()))
}

export function getDateRangeDurationDays(value: DateRangeValue) {
  const from = parseDateKey(value.from)
  const to = parseDateKey(value.to)
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000)
  return Math.max(1, diff + 1)
}

export function getDateRangePeriodParams(value: DateRangeValue) {
  return {
    periodFrom: value.from,
    periodTo: value.to,
  }
}

function MonthCalendar({
  canGoNext,
  canGoPrevious,
  daySizeClassName,
  month,
  onNext,
  onPrevious,
  onSelectDay,
  range,
}: {
  canGoNext: boolean
  canGoPrevious: boolean
  daySizeClassName: string
  month: Date
  onNext: () => void
  onPrevious: () => void
  onSelectDay: (day: Date) => void
  range: DateRangeValue
}) {
  const days = getMonthGrid(month)
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(month)

  return (
    <section className="min-w-0">
      <div className="mb-2 grid grid-cols-[2rem_1fr_2rem] items-center gap-2">
        {canGoPrevious ? (
          <Button
            aria-label="Mês anterior"
            onClick={onPrevious}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft />
          </Button>
        ) : (
          <span />
        )}
        <h3 className="text-center text-sm font-semibold capitalize">{monthLabel}</h3>
        {canGoNext ? (
          <Button
            aria-label="Próximo mês"
            onClick={onNext}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight />
          </Button>
        ) : (
          <span />
        )}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((weekday) => (
          <span className="text-xs font-medium text-muted-foreground" key={weekday}>
            {weekday}
          </span>
        ))}
        {days.map((day) => (
          <button
            aria-label={formatCalendarDayLabel(day)}
            aria-pressed={isDayInRange(day, range)}
            className={cn(
              "relative grid place-items-center text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              daySizeClassName,
              getDayStateClassName(day, month, range),
            )}
            key={dateKey(day)}
            onClick={() => onSelectDay(day)}
            type="button"
          >
            {day.getDate()}
          </button>
        ))}
      </div>
    </section>
  )
}

function DateRangeDisplay({
  label,
  value,
  variant,
}: {
  label: string
  value: string
  variant: DateRangeSelectorVariant
}) {
  return (
    <div className="grid gap-1">
      <span className="sr-only">{label}</span>
      <div
        className={cn(
          "flex h-8 items-center rounded-lg border border-input bg-background px-2.5 text-sm font-medium text-foreground",
          variant === "sm" ? "w-32" : "w-36",
        )}
      >
        {formatDateKey(value, "long")}
      </div>
    </div>
  )
}

function getVariantClasses(variant: DateRangeSelectorVariant, numberOfMonths: 1 | 2) {
  const widthByVariant = {
    sm: numberOfMonths === 1 ? "w-[min(92vw,24rem)]" : "w-[min(94vw,45rem)]",
    md: numberOfMonths === 1 ? "w-[min(92vw,26rem)]" : "w-[min(94vw,52rem)]",
    lg: numberOfMonths === 1 ? "w-[min(94vw,30rem)]" : "w-[min(96vw,60rem)]",
  }
  const dayByVariant = {
    sm: "size-8",
    md: "size-9",
    lg: "size-10 text-base",
  }
  const triggerByVariant = {
    sm: "min-w-36",
    md: "min-w-44",
    lg: "min-w-52",
  }

  return {
    content: widthByVariant[variant],
    day: dayByVariant[variant],
    trigger: triggerByVariant[variant],
  }
}

function getDayStateClassName(day: Date, visibleMonth: Date, range: DateRangeValue) {
  const key = dateKey(day)
  const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth()
  const isStart = key === range.from
  const isEnd = key === range.to
  const isInRange = isDayInRange(day, range)

  if (isStart || isEnd) {
    return "rounded-lg bg-primary font-semibold text-primary-foreground"
  }

  if (isInRange) {
    return "bg-muted font-medium text-foreground"
  }

  return cn(
    "rounded-lg hover:bg-muted hover:text-foreground",
    isOutsideMonth && "text-muted-foreground/45",
  )
}

function isDayInRange(day: Date, range: DateRangeValue) {
  const from = parseDateKey(range.from)
  const to = parseDateKey(range.to)
  return day >= from && day <= to
}

function formatCalendarDayLabel(day: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(day)
}

function getMonthGrid(month: Date) {
  const firstDay = startOfMonth(month)
  const firstGridDay = addDays(firstDay, -firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => addDays(firstGridDay, index))
}

function getActivePreset(value: DateRangeValue, today: Date) {
  return DATE_RANGE_PRESETS.find((preset) => rangesEqual(value, preset.getRange(today)))
}

function getPreviousDateRange(value: DateRangeValue): DateRangeValue {
  const durationDays = getDateRangeDurationDays(value)
  const from = parseDateKey(value.from)
  const previousTo = addDays(from, -1)
  const previousFrom = addDays(previousTo, -(durationDays - 1))
  return {
    from: dateKey(previousFrom),
    to: dateKey(previousTo),
  }
}

function normalizeRangeOrder(value: DateRangeValue): DateRangeValue {
  if (!value.from || !value.to) {
    return value
  }

  if (parseDateKey(value.from).getTime() <= parseDateKey(value.to).getTime()) {
    return value
  }

  return { from: value.to, to: value.from }
}

function isValidDateRange(value: DateRangeValue) {
  const from = parseDateKey(value.from)
  const to = parseDateKey(value.to)
  return Boolean(
    value.from &&
      value.to &&
      !Number.isNaN(from.getTime()) &&
      !Number.isNaN(to.getTime()) &&
      from.getTime() <= to.getTime(),
  )
}

function formatDateRangeTrigger(value: DateRangeValue, preset: DateRangePreset | undefined) {
  if (preset) {
    return preset.label
  }

  return formatDateRange(value)
}

function formatDateRange(value: DateRangeValue) {
  return `${formatDateKey(value.from)} - ${formatDateKey(value.to)}`
}

function formatDateKey(value: string, year: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: year === "long" ? "numeric" : "2-digit",
  }).format(parseDateKey(value))
}

function rangesEqual(left: DateRangeValue, right: DateRangeValue) {
  return left.from === right.from && left.to === right.to
}

function parseDateKey(value: string) {
  const [year = "0", month = "1", day = "1"] = value.split("-")
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
