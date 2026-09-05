import type { WorkspaceOverviewModel } from "@/modules/shared/components/workspace-overview/model"
import type { ScheduleRange } from "./contracts"
import { deriveDashboard } from "./dashboard-projection"
import { type DashboardSearch, dashboardBounds } from "./dashboard-search"

const pending = "Ainda não integrado"
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
const percent = (booked: number, available: number) =>
  available ? Math.round((booked / available) * 100) : 0

export function productionDashboardModel(
  range: ScheduleRange,
  search: DashboardSearch,
  units: readonly { id: string; name: string }[],
  updatedAt: number,
): WorkspaceOverviewModel {
  const bounds = dashboardBounds(search)
  const model = deriveDashboard({
    day: range,
    bounds,
    filters: search,
    now: new Date(),
    updatedAt,
    paidSales: [],
  })
  const selected = new Set(model.professionals.map((person) => person.id))
  const rules = (range.availability ?? []).filter(
    (rule) =>
      selected.has(rule.professionalId) &&
      rule.date >= bounds.startDate &&
      rule.date <= bounds.endDate,
  )
  function available(professionalId: string, start = 0, end = 1440) {
    return rules
      .filter((rule) => rule.professionalId === professionalId && rule.kind === "available")
      .reduce((total, rule) => {
        const from = Math.max(start, minutes(rule.start)),
          until = Math.min(end, minutes(rule.end))
        const blocked = rules.filter(
          (other) =>
            other.professionalId === professionalId &&
            other.date === rule.date &&
            other.kind !== "available",
        )
        // Count the union of unavailable minutes, including overlapping negative blocks.
        let count = 0
        for (let minute = from; minute < until; minute++) {
          if (
            !blocked.some((other) => minutes(other.start) <= minute && minutes(other.end) > minute)
          )
            count++
        }
        return total + count
      }, 0)
  }
  const availableMinutes = model.professionals.reduce(
    (total, person) => total + available(person.id),
    0,
  )
  return {
    ...model,
    integration: "scheduling",
    unitOptions: units.map((unit) => ({ id: unit.id, label: unit.name })),
    metrics: model.metrics.map((metric) => ({
      ...metric,
      value:
        metric.id === "appointments"
          ? metric.value
          : metric.id === "occupancy"
            ? `${percent(model.capacity.bookedMinutes, availableMinutes)}%`
            : "—",
      description:
        metric.id === "appointments"
          ? "Integrado à Agenda."
          : metric.id === "occupancy"
            ? "Disponibilidade líquida de intervalos e bloqueios."
            : pending,
      comparison: { amount: "", direction: "neutral", periodLabel: "" },
    })),
    flow: model.flow.map((item) => ({
      ...item,
      unavailable: ["waiting", "in-progress", "completed"].includes(item.id),
    })),
    professionals: model.professionals.map((person) => ({
      ...person,
      availableMinutes: available(person.id),
      occupancyPercent: percent(person.bookedMinutes, available(person.id)),
      paidValue: pending,
      state: pending,
      stateTone: "neutral",
    })),
    capacity: {
      ...model.capacity,
      availableMinutes,
      freeMinutes: Math.max(0, availableMinutes - model.capacity.bookedMinutes),
      bands: model.capacity.bands.map((band, index) => {
        const [start, end] = [
          [480, 720],
          [720, 1080],
          [1080, 1320],
        ][index]
        const availableMinutes = model.professionals.reduce(
          (total, person) => total + available(person.id, start, end),
          0,
        )
        return {
          ...band,
          availableMinutes,
          occupancyPercent: percent(band.bookedMinutes, availableMinutes),
        }
      }),
    },
    finance: { ...model.finance, paidValue: pending, pendingCompletedValue: pending },
    services: model.services.map((service) => ({ ...service, paidValue: pending })),
  }
}
