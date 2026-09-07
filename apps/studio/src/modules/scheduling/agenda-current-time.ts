const MINUTES_PER_SLOT = 15

export type AgendaCurrentTimeMarker = {
  label: string
  position: number
  rowIndex: number
  rowProgress: number
  time: string
}

export function resolveAgendaCurrentTimeMarker({
  endTime,
  now,
  selectedDate,
  startTime,
  timezone,
}: {
  endTime: string
  now: Date
  selectedDate: string
  startTime: string
  timezone?: string | null
}): AgendaCurrentTimeMarker | undefined {
  const clock = resolveAgendaClock(now, timezone)
  if (selectedDate !== clock.date) return undefined

  const startMinutes = parseTime(startTime)
  const endMinutes = parseTime(endTime)
  if (startMinutes === undefined || endMinutes === undefined || endMinutes <= startMinutes) {
    return undefined
  }

  const nowMinutes = clock.minutes
  if (nowMinutes < startMinutes || nowMinutes >= endMinutes) return undefined

  const elapsedMinutes = nowMinutes - startMinutes
  const time = formatTime(nowMinutes)
  return {
    label: `Agora ${time}`,
    position: elapsedMinutes / (endMinutes - startMinutes),
    rowIndex: Math.floor(elapsedMinutes / MINUTES_PER_SLOT),
    rowProgress: (elapsedMinutes % MINUTES_PER_SLOT) / MINUTES_PER_SLOT,
    time,
  }
}

export function resolveAgendaDate(now: Date, timezone?: string | null) {
  return resolveAgendaClock(now, timezone).date
}

function resolveAgendaClock(now: Date, timezone?: string | null) {
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
        minute: "2-digit",
        month: "2-digit",
        timeZone: timezone,
        year: "numeric",
      }).formatToParts(now)
      const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
      if (values.year && values.month && values.day && values.hour && values.minute) {
        return {
          date: `${values.year}-${values.month}-${values.day}`,
          minutes: Number(values.hour) * 60 + Number(values.minute),
        }
      }
    } catch {
      // Invalid timezones fall back to the browser clock.
    }
  }

  return {
    date: formatLocalDate(now),
    minutes: now.getHours() * 60 + now.getMinutes(),
  }
}

function formatLocalDate(date: Date) {
  const year = String(date.getFullYear()).padStart(4, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

function parseTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined
}
