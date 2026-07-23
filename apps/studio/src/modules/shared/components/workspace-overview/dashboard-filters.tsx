import { CalendarRangeIcon, MapPinIcon, UserRoundIcon } from "lucide-react"

import { SingleSelectListFilter } from "@/modules/shared/components/data-display/list-filter"
import { DatePicker } from "@/modules/shared/components/forms/date-picker"

import type { DashboardFilterOption, DashboardFilters, DashboardPeriod } from "./model"

const periodOptions: readonly { label: string; value: DashboardPeriod }[] = [
  { label: "Hoje", value: "today" },
  { label: "Ontem", value: "yesterday" },
  { label: "Esta semana", value: "this-week" },
  { label: "Este mês", value: "this-month" },
  { label: "Personalizado", value: "custom" },
]

export function DashboardFiltersBar({
  filters,
  onChange,
  professionalOptions,
  unitOptions,
  updatedLabel,
}: {
  filters: DashboardFilters
  onChange: (next: Partial<DashboardFilters>) => void
  professionalOptions: readonly DashboardFilterOption[]
  unitOptions: readonly DashboardFilterOption[]
  updatedLabel: string
}) {
  return (
    <section
      aria-label="Filtros globais do Dashboard"
      className="rounded-xl border bg-card px-3 py-2 text-card-foreground"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <SingleSelectListFilter
          icon={CalendarRangeIcon}
          id="dashboard-period"
          inactiveValue="today"
          label="Período"
          options={periodOptions}
          showSelectedLabel
          value={filters.period}
          onValueChange={(period) => onChange({ period })}
        />
        <SingleSelectListFilter
          icon={MapPinIcon}
          id="dashboard-unit"
          inactiveValue="centro"
          label="Unidade"
          options={unitOptions.map(({ id, label }) => ({
            label,
            value: id as DashboardFilters["unitId"],
          }))}
          showSelectedLabel
          value={filters.unitId}
          onValueChange={(unitId) => onChange({ unitId })}
        />
        <SingleSelectListFilter
          icon={UserRoundIcon}
          id="dashboard-professional"
          inactiveValue="all"
          label="Barbeiro"
          options={[
            { label: "Todos os barbeiros", value: "all" },
            ...professionalOptions.map(({ id, label }) => ({ label, value: id })),
          ]}
          showSelectedLabel
          value={filters.professionalId ?? "all"}
          onValueChange={(professionalId) =>
            onChange({ professionalId: professionalId === "all" ? undefined : professionalId })
          }
        />
        <p aria-live="polite" className="ml-auto min-h-8 text-xs leading-8 text-muted-foreground">
          {updatedLabel}
        </p>
      </div>
      {filters.period === "custom" ? (
        <div className="mt-2 grid gap-2 border-t pt-2 sm:grid-cols-2 xl:max-w-xl">
          <label className="grid gap-1 text-xs font-medium" htmlFor="dashboard-custom-start">
            Data inicial
            <DatePicker
              id="dashboard-custom-start"
              placeholder="Selecione"
              value={filters.customStart ?? ""}
              onValueChange={(customStart) => onChange({ customStart })}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium" htmlFor="dashboard-custom-end">
            Data final
            <DatePicker
              id="dashboard-custom-end"
              placeholder="Selecione"
              value={filters.customEnd ?? ""}
              onValueChange={(customEnd) => onChange({ customEnd })}
            />
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            O intervalo personalizado é limitado a 31 dias.
          </p>
        </div>
      ) : null}
    </section>
  )
}
