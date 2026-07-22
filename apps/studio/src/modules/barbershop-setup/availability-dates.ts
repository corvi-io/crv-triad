import { formatDateOnly, parseDateOnly } from "@/modules/shared/components/forms/date-picker"

import type {
  AvailabilityBlockType,
  AvailabilityTimeBlock,
  AvailabilityView,
  SetupAvailability,
  Weekday,
} from "./contracts"

const millisecondsPerDay = 24 * 60 * 60 * 1000
const maximumVisibleDays = 42

export const weekdays: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

export type AvailabilityDateRange = { end: string; start: string }

export type ProjectedAvailabilityBlock = AvailabilityTimeBlock & {
  date: string
  day: Weekday
  projectedId: string
  recordId: string
  type: AvailabilityBlockType
}

export function localToday() {
  return formatDateOnly(new Date())
}

export function isCanonicalDate(value: unknown): value is string {
  return typeof value === "string" && Boolean(parseDateOnly(value))
}

export function addCalendarDays(value: string, amount: number) {
  const date = requiredDate(value)
  date.setDate(date.getDate() + amount)
  return formatDateOnly(date)
}

export function weekdayForDate(value: string): Weekday {
  const nativeDay = requiredDate(value).getDay()
  return weekdays[(nativeDay + 6) % 7]
}

export function visibleAvailabilityRange(
  view: AvailabilityView,
  anchorDate: string,
): AvailabilityDateRange {
  const anchor = requiredDate(anchorDate)
  if (view === "day") return { start: anchorDate, end: anchorDate }
  if (view === "week") {
    const start = addCalendarDays(anchorDate, -weekdays.indexOf(weekdayForDate(anchorDate)))
    return { start, end: addCalendarDays(start, 6) }
  }

  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const first = formatDateOnly(firstOfMonth)
  const last = formatDateOnly(lastOfMonth)
  const start = addCalendarDays(first, -weekdays.indexOf(weekdayForDate(first)))
  const end = addCalendarDays(last, 6 - weekdays.indexOf(weekdayForDate(last)))
  return { start, end }
}

export function navigateAvailabilityDate(
  view: AvailabilityView,
  anchorDate: string,
  direction: -1 | 1,
) {
  if (view === "day") return addCalendarDays(anchorDate, direction)
  if (view === "week") return addCalendarDays(anchorDate, direction * 7)
  const anchor = requiredDate(anchorDate)
  const targetDay = anchor.getDate()
  anchor.setDate(1)
  anchor.setMonth(anchor.getMonth() + direction)
  const lastTargetDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
  anchor.setDate(Math.min(targetDay, lastTargetDay))
  return formatDateOnly(anchor)
}

export function datesInRange(range: AvailabilityDateRange) {
  const start = requiredDate(range.start)
  const end = requiredDate(range.end)
  const total = Math.round((end.getTime() - start.getTime()) / millisecondsPerDay) + 1
  if (total < 1 || total > maximumVisibleDays)
    throw new Error("Availability projection requires a bounded visible date range.")
  return Array.from({ length: total }, (_, index) => addCalendarDays(range.start, index))
}

export function projectAvailability(
  records: readonly SetupAvailability[],
  range: AvailabilityDateRange,
): readonly ProjectedAvailabilityBlock[] {
  const dates = datesInRange(range)
  return records.flatMap((record) =>
    dates.flatMap((date) => {
      if (weekdayForDate(date) !== record.day) return []
      return availabilityBlocks(record)
        .filter(({ block }) => blockAppliesOnDate(block, date))
        .map(({ block, type }) => ({
          ...block,
          date,
          day: record.day,
          projectedId: `${block.id}:${date}`,
          recordId: record.id,
          type,
        }))
    }),
  )
}

export function availabilityBlocks(record: SetupAvailability) {
  return [
    ...record.periods.map((block) => ({ block, type: "available" as const })),
    ...record.breaks.map((block) => ({ block, type: "break" as const })),
    ...record.absences.map((block) => ({ block, type: "absence" as const })),
  ]
}

export function isRecurringBlock(block: AvailabilityTimeBlock) {
  return Boolean(block.recurrenceStart) && !block.occurrenceDate
}

export function blockAppliesOnDate(block: AvailabilityTimeBlock, date: string) {
  if (block.occurrenceDate) return block.occurrenceDate === date
  if (!block.recurrenceStart || date < block.recurrenceStart) return false
  if (block.recurrenceUntil && date > block.recurrenceUntil) return false
  return !block.excludedDates.includes(date)
}

export function blockDateSetsIntersect(
  left: AvailabilityTimeBlock,
  right: AvailabilityTimeBlock,
  day: Weekday,
) {
  if (left.occurrenceDate) return blockAppliesOnDate(right, left.occurrenceDate)
  if (right.occurrenceDate) return blockAppliesOnDate(left, right.occurrenceDate)
  if (!left.recurrenceStart || !right.recurrenceStart) return false

  const start = maxDate(left.recurrenceStart, right.recurrenceStart)
  const end = minOptionalDate(left.recurrenceUntil, right.recurrenceUntil)
  let candidate = firstWeekdayOnOrAfter(start, day)
  const excluded = new Set([...left.excludedDates, ...right.excludedDates])
  for (let attempt = 0; attempt <= excluded.size; attempt += 1) {
    if (end && candidate > end) return false
    if (blockAppliesOnDate(left, candidate) && blockAppliesOnDate(right, candidate)) return true
    candidate = addCalendarDays(candidate, 7)
  }
  return false
}

export function blockDateSetIsSubset(
  child: AvailabilityTimeBlock,
  container: AvailabilityTimeBlock,
  day: Weekday,
) {
  if (child.occurrenceDate) return blockAppliesOnDate(container, child.occurrenceDate)
  if (!child.recurrenceStart || !container.recurrenceStart || container.occurrenceDate) return false
  const firstChildDate = firstWeekdayOnOrAfter(child.recurrenceStart, day)
  if (!blockAppliesOnDate(container, firstChildDate)) return false
  if (!endCovers(container.recurrenceUntil, child.recurrenceUntil)) return false
  return container.excludedDates.every(
    (date) => !blockAppliesOnDate(child, date) || child.excludedDates.includes(date),
  )
}

function firstWeekdayOnOrAfter(value: string, day: Weekday) {
  const difference = (weekdays.indexOf(day) - weekdays.indexOf(weekdayForDate(value)) + 7) % 7
  return addCalendarDays(value, difference)
}

function endCovers(container?: string, child?: string) {
  if (!child) return !container
  return !container || container >= child
}

function maxDate(left: string, right: string) {
  return left > right ? left : right
}

function minOptionalDate(left?: string, right?: string) {
  if (!left) return right
  if (!right) return left
  return left < right ? left : right
}

function requiredDate(value: string) {
  const date = parseDateOnly(value)
  if (!date) throw new Error(`Invalid date-only value: ${value}`)
  return date
}
