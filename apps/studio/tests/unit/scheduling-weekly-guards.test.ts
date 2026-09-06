import { describe, expect, it } from "vitest"
import { weeklyDropError } from "@/modules/scheduling/weekly-agenda"
import { booking, person, range } from "../fixtures/production-scheduling"

const destination = { date: booking.date, start: "10:00", professionalId: person.id }
describe("weekly rescheduling destination guards", () => {
  it.each([
    [{ date: "2026-09-06" }, "Destino inválido"],
    [{ date: "2026-09-14" }, "Destino inválido"],
    [{ start: "10:10" }, "Destino inválido"],
    [{ start: "08:00" }, "fora do horário"],
    [{ start: "18:00" }, "fora do horário"],
    [{ professionalId: "someone-else" }, "altere o profissional"],
    [{ start: booking.start }, "já está nesse dia"],
  ] as const)("rejects the destination %j before sending a command", (patch, message) =>
    expect(weeklyDropError(range, booking, { ...destination, ...patch })).toContain(message))
  it.each([
    "completed",
    "canceled",
    "no-show",
  ] as const)("rejects terminal %s even when the target looks empty", (status) =>
    expect(weeklyDropError(range, { ...booking, status }, destination)).toContain("finalizados"))
  it("rejects a private cross-unit occupancy without exposing its client", () => {
    const value = {
      ...range,
      occupancies: [
        {
          id: "foreign-private",
          date: booking.date,
          professionalId: person.id,
          start: "10:00",
          durationMinutes: 30,
        },
      ],
    }
    expect(weeklyDropError(value, booking, destination)).toContain("não tem espaço")
    expect(weeklyDropError(value, booking, { ...destination, start: "10:30" })).toBeUndefined()
    expect(
      weeklyDropError(
        { ...value, occupancies: [{ ...value.occupancies[0], id: booking.id }] },
        booking,
        destination,
      ),
    ).toBeUndefined()
  })
  it("distinguishes blocking periods from walk-in capacity and adjacent intervals", () => {
    const period = {
      id: "break",
      date: booking.date,
      professionalId: person.id,
      start: "10:00",
      end: "10:30",
      kind: "break" as const,
      label: "Intervalo",
    }
    expect(weeklyDropError({ ...range, periods: [period] }, booking, destination)).toContain(
      "indisponível",
    )
    expect(
      weeklyDropError(
        { ...range, periods: [{ ...period, kind: "walk-in" }] },
        booking,
        destination,
      ),
    ).toBeUndefined()
    expect(
      weeklyDropError(
        { ...range, periods: [{ ...period, professionalId: "other" }] },
        booking,
        destination,
      ),
    ).toBeUndefined()
    expect(
      weeklyDropError({ ...range, periods: [period] }, booking, { ...destination, start: "10:30" }),
    ).toBeUndefined()
  })
})
