import { describe, expect, it } from "vitest"
import { validateDashboardSearch } from "@/modules/scheduling/dashboard-search"
import { productionDashboardModel } from "@/modules/scheduling/production-dashboard-projection"
import { booking, location, person, range } from "../fixtures/production-scheduling"

describe("production dashboard", () => {
  it("preserves panels without presenting unintegrated metrics as zero", () => {
    const search = validateDashboardSearch(
      { unitId: location.id, date: booking.date },
      booking.date,
    )
    const model = productionDashboardModel(range, search, [location], Date.now())
    expect(model.metrics.find((metric) => metric.id === "appointments")?.value).toBe("1")
    expect(model.metrics.find((metric) => metric.id === "paid-value")?.value).toBe("—")
    expect(model.finance.paidValue).toBe("Ainda não integrado")
    expect(model.unitOptions).toEqual([{ id: location.id, label: location.name }])
    expect(model.flow.find((item) => item.id === "completed")?.unavailable).toBe(true)
  })
  it("deducts breaks once and respects the selected professional and date", () => {
    const rule = {
      date: booking.date,
      professionalId: person.id,
      unitId: location.id,
      start: "09:00",
      end: "18:00",
      kind: "available",
    }
    const search = validateDashboardSearch(
      { unitId: location.id, date: booking.date },
      booking.date,
    )
    const model = productionDashboardModel(
      {
        ...range,
        availability: [
          rule,
          { ...rule, start: "12:00", end: "13:00", kind: "break" },
          { ...rule, start: "12:15", end: "12:45", kind: "blocked" },
          { ...rule, date: "2027-01-01" },
        ],
      },
      search,
      [location],
      Date.now(),
    )
    expect(model.capacity.availableMinutes).toBe(480)
    expect(model.capacity.bands.map((band) => band.availableMinutes)).toEqual([180, 300, 0])
    expect(model.professionals[0].availableMinutes).toBe(480)
  })
})
