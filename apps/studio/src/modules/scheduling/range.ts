import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"
import type { ScheduleRange, ScheduleRangeQuery, SchedulingRepository } from "./contracts"

export async function getScheduleRange(
  repository: SchedulingRepository,
  query: ScheduleRangeQuery,
  signal?: AbortSignal,
): Promise<ScheduleRange> {
  const days = differenceInCalendarDays(parseISO(query.endDate), parseISO(query.startDate)) + 1
  if (days < 1 || days > 366) throw new Error("Selecione um período de até 366 dias.")
  if (days === 1 || days === 7) return repository.getRange(query, signal)

  const chunks: ScheduleRange[] = []
  let cursor = parseISO(query.startDate)
  let remaining = days
  while (remaining > 0) {
    const chunkDays = remaining >= 7 ? 7 : 1
    const startDate = format(cursor, "yyyy-MM-dd")
    const endDate = format(addDays(cursor, chunkDays - 1), "yyyy-MM-dd")
    chunks.push(
      await repository.getRange(
        {
          ...query,
          endDate,
          focusDate: undefined,
          startDate,
        },
        signal,
      ),
    )
    cursor = addDays(cursor, chunkDays)
    remaining -= chunkDays
  }
  const first = chunks[0]
  if (!first) throw new Error("Intervalo de Agenda vazio.")
  return {
    ...first,
    appointments: [
      ...new Map(
        chunks.flatMap(({ appointments }) => appointments).map((item) => [item.id, item]),
      ).values(),
    ],
    availability: chunks.flatMap((chunk) => chunk.availability ?? []),
    date: query.focusDate ?? query.startDate,
    occupancies: chunks.flatMap(({ occupancies }) => occupancies),
    periods: chunks.flatMap(({ periods }) => periods),
  }
}
