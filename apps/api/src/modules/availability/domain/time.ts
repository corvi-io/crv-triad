import { z } from "zod"

export class SchedulingError extends Error {
  constructor(
    readonly code: string,
    readonly field?: string,
  ) {
    super(code)
  }
}
export const localDate = z.iso.date()
export const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
export const weekdays = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const
export function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}
export function addDate(date: string, days: number) {
  const value = new Date(`${localDate.parse(date)}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
export function dateRange(start: string, end: string, maximum = 42): string[] {
  if (!localDate.safeParse(start).success || !localDate.safeParse(end).success || end < start)
    throw new SchedulingError("invalid_range", "date")
  const days =
    Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000) + 1
  if (days > maximum) throw new SchedulingError("invalid_range", "date")
  return Array.from({ length: days }, (_, index) => addDate(start, index))
}
export function minutes(time: string) {
  const [hour, minute] = localTime.parse(time).split(":").map(Number)
  return hour * 60 + minute
}
export function timeAt(value: number) {
  if (value < 0 || value >= 1440) throw new SchedulingError("outside_hours", "start")
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`
}
export function weekday(date: string) {
  return weekdays[new Date(`${date}T12:00:00Z`).getUTCDay()]
}
export function overlaps(a: { start: string; end: string }, b: { start: string; end: string }) {
  return a.start < b.end && b.start < a.end
}
export function localParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  }
}
/** Enumerate nearby UTC offsets, then require exactly one local-time match (including DST folds). */
export function toInstant(date: string, time: string, timezone: string) {
  if (!validTimezone(timezone)) throw new SchedulingError("timezone_required", "timezone")
  localDate.parse(date)
  localTime.parse(time)
  const naive = Date.parse(`${date}T${time}:00Z`)
  const offsets = new Set<number>()
  for (let hour = -48; hour <= 48; hour += 6) {
    const sample = naive + hour * 3600000
    const parts = localParts(new Date(sample), timezone)
    offsets.add(Date.parse(`${parts.date}T${parts.time}:00Z`) - sample)
  }
  const matches = [...offsets]
    .map((offset) => new Date(naive - offset))
    .filter((instant) => {
      const parts = localParts(instant, timezone)
      return parts.date === date && parts.time === time
    })
  if (matches.length !== 1)
    throw new SchedulingError(
      matches.length ? "ambiguous_local_time" : "invalid_local_time",
      "start",
    )
  return matches[0]
}
