import { CalendarRangeIcon, MapPinIcon, UserRoundIcon } from "lucide-react"
import type { ReactNode } from "react"

import { DatePicker } from "@/modules/shared/components/forms/date-picker"
import { CompactSelectInput } from "@/modules/shared/components/forms/form-controls"

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
      className="rounded-xl border bg-card p-3 text-card-foreground"
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(9rem,0.8fr)_minmax(9rem,0.8fr)_minmax(12rem,1fr)_auto] xl:items-end">
        <FilterField htmlFor="dashboard-period" icon={CalendarRangeIcon} label="Período">
          <CompactSelectInput
            id="dashboard-period"
            options={periodOptions}
            placeholder="Selecione"
            value={filters.period}
            onValueChange={(period) => onChange({ period: period as DashboardPeriod })}
          />
        </FilterField>
        <FilterField htmlFor="dashboard-unit" icon={MapPinIcon} label="Unidade">
          <CompactSelectInput
            id="dashboard-unit"
            options={unitOptions.map(({ id, label }) => ({ label, value: id }))}
            placeholder="Selecione"
            value={filters.unitId}
            onValueChange={(unitId) =>
              onChange({ unitId: unitId === "artesao" ? "artesao" : "centro" })
            }
          />
        </FilterField>
        <FilterField htmlFor="dashboard-professional" icon={UserRoundIcon} label="Barbeiro">
          <CompactSelectInput
            id="dashboard-professional"
            options={[
              { label: "Todos os barbeiros", value: "all" },
              ...professionalOptions.map(({ id, label }) => ({ label, value: id })),
            ]}
            placeholder="Selecione"
            value={filters.professionalId ?? "all"}
            onValueChange={(professionalId) =>
              onChange({ professionalId: professionalId === "all" ? undefined : professionalId })
            }
          />
        </FilterField>
        <p
          aria-live="polite"
          className="min-h-8 self-end text-xs leading-8 text-muted-foreground xl:text-right"
        >
          {updatedLabel}
        </p>
      </div>
      {filters.period === "custom" ? (
        <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2 xl:max-w-xl">
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

function FilterField({
  children,
  htmlFor,
  icon: Icon,
  label,
}: {
  children: ReactNode
  htmlFor: string
  icon: typeof CalendarRangeIcon
  label: string
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium" htmlFor={htmlFor}>
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" />
        {label}
      </span>
      {children}
    </label>
  )
}
