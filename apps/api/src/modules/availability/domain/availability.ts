import { z } from "zod"
import {
  addDate,
  dateRange,
  localDate,
  localTime,
  overlaps,
  SchedulingError,
  weekday,
  weekdays,
} from "./time.js"

export const availabilityInput = z
  .object({
    unitId: z.string().min(1).max(100),
    professionalId: z.string().min(1).max(100),
    kind: z.enum(["available", "break", "blocked", "absence"]),
    start: localTime,
    end: localTime,
    weekdays: z.array(z.enum(weekdays)).min(1).max(7),
    effectiveFrom: localDate,
    effectiveUntil: localDate.nullable().default(null),
  })
  .strict()
  .refine((value) => value.start < value.end, { path: ["end"] })
  .refine((value) => !value.effectiveUntil || value.effectiveUntil >= value.effectiveFrom, {
    path: ["effectiveUntil"],
  })
export type AvailabilityInput = z.infer<typeof availabilityInput>
export type Series = AvailabilityInput & {
  id: string
  version: number
  status: "active" | "archived"
  excludedDates: readonly string[]
}
export type Occurrence = {
  id: string
  seriesId: string
  version: number
  date: string
  start: string
  end: string
  kind: AvailabilityInput["kind"]
  professionalId: string
  unitId: string
}
export type OpeningPeriod = { days: readonly string[]; start: string; end: string }
export function occurs(series: Series, date: string) {
  return (
    series.status === "active" &&
    date >= series.effectiveFrom &&
    (!series.effectiveUntil || date <= series.effectiveUntil) &&
    series.weekdays.includes(weekday(date)) &&
    !series.excludedDates.includes(date)
  )
}
export function projectAvailability(
  series: readonly Series[],
  start: string,
  end: string,
): Occurrence[] {
  return dateRange(start, end).flatMap((date) =>
    series
      .filter((item) => occurs(item, date))
      .map((item) => ({
        id: `${item.id}:${date}`,
        seriesId: item.id,
        version: item.version,
        date,
        start: item.start,
        end: item.end,
        kind: item.kind,
        professionalId: item.professionalId,
        unitId: item.unitId,
      })),
  )
}
export function assertOpeningHours(input: AvailabilityInput, periods: readonly OpeningPeriod[]) {
  for (const day of input.weekdays) {
    if (
      !periods.some(
        (period) =>
          period.days.includes(day) && period.start <= input.start && period.end >= input.end,
      )
    )
      throw new SchedulingError("outside_hours", "start")
  }
}
/** Finite check of weekly intersections: only explicitly excluded dates can defer a collision. */
export function seriesOverlap(left: Series, right: Series) {
  if (left.status !== "active" || right.status !== "active" || !overlaps(left, right)) return false
  const start = left.effectiveFrom > right.effectiveFrom ? left.effectiveFrom : right.effectiveFrom
  const ends = [left.effectiveUntil, right.effectiveUntil].filter((item): item is string =>
    Boolean(item),
  )
  const end = ends.sort()[0]
  const limit = 7 * (left.excludedDates.length + right.excludedDates.length + 1)
  for (let index = 0; index < limit; index++) {
    const date = addDate(start, index)
    if (end && date > end) return false
    if (occurs(left, date) && occurs(right, date)) return true
  }
  return false
}
export function assertAvailable(
  occurrences: readonly Occurrence[],
  input: { date: string; start: string; end: string; professionalId: string; unitId: string },
) {
  const relevant = occurrences.filter(
    (item) =>
      item.date === input.date &&
      item.professionalId === input.professionalId &&
      item.unitId === input.unitId,
  )
  if (
    !relevant.some(
      (item) => item.kind === "available" && item.start <= input.start && item.end >= input.end,
    ) ||
    relevant.some((item) => item.kind !== "available" && overlaps(item, input))
  )
    throw new SchedulingError("unavailable", "start")
}
