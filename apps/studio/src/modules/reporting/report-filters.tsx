import {
  CalendarDaysIcon,
  CreditCardIcon,
  RotateCcwIcon,
  ScissorsIcon,
  UserRoundIcon,
} from "lucide-react"
import { useState } from "react"
import { SingleSelectListFilter } from "@/modules/shared/components/data-display/list-filter"
import { DatePicker } from "@/modules/shared/components/forms/date-picker"
import { FilterBar } from "@/modules/shared/components/forms/filter-bar"
import { Button } from "@/modules/shared/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/modules/shared/components/ui/toggle-group"
import type { ReportingFacets } from "./contracts"
import type { ReportSearch } from "./filters"
import { currentMonth, periodForPreset, periodPreset } from "./filters"

type PeriodPreset = "today" | "last-7-days" | "current-month" | "custom"

export function ReportFiltersBar({
  facets,
  onChange,
  search,
  sourceDate,
}: {
  facets: ReportingFacets
  onChange: (next: Partial<ReportSearch>) => void
  search: ReportSearch
  sourceDate: string
}) {
  const preset = periodPreset(search, sourceDate)
  const [customPeriodOpen, setCustomPeriodOpen] = useState(preset === "custom")
  const defaults = currentMonth(sourceDate)
  const hasNonDefaultFilters =
    search.from !== defaults.from ||
    search.to !== defaults.to ||
    Boolean(search.professional || search.service || search.paymentMethod)

  return (
    <div className="flex flex-col gap-2">
      <FilterBar>
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
          <ToggleGroup
            aria-label="Período dos relatórios"
            className="grid w-full grid-cols-2 lg:w-fit lg:grid-cols-4"
            spacing={0}
            value={[customPeriodOpen ? "custom" : preset]}
            variant="outline"
            onValueChange={(values) => {
              const next = values[0] as PeriodPreset | undefined
              if (!next) return
              if (next === "custom") {
                setCustomPeriodOpen(true)
                return
              }
              setCustomPeriodOpen(false)
              onChange(periodForPreset(next, sourceDate))
            }}
          >
            <ToggleGroupItem value="today">Hoje</ToggleGroupItem>
            <ToggleGroupItem value="last-7-days">Últimos 7 dias</ToggleGroupItem>
            <ToggleGroupItem value="current-month">Este mês</ToggleGroupItem>
            <ToggleGroupItem value="custom">Personalizado</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto">
            <SingleSelectListFilter
              icon={UserRoundIcon}
              id="report-professional-filter"
              inactiveValue=""
              label="Profissional"
              options={[
                { label: "Todos os profissionais", value: "" },
                ...facets.professionals.map(({ id, label }) => ({ label, value: id })),
              ]}
              value={search.professional ?? ""}
              onValueChange={(professional) =>
                onChange({ professional: professional || undefined })
              }
            />
            <SingleSelectListFilter
              icon={ScissorsIcon}
              id="report-service-filter"
              inactiveValue=""
              label="Serviço"
              options={[
                { label: "Todos os serviços", value: "" },
                ...facets.services.map(({ id, label }) => ({ label, value: id })),
              ]}
              value={search.service ?? ""}
              onValueChange={(service) => onChange({ service: service || undefined })}
            />
            <SingleSelectListFilter
              icon={CreditCardIcon}
              id="report-payment-filter"
              inactiveValue=""
              label="Pagamento"
              options={[
                { label: "Todos os pagamentos", value: "" },
                ...facets.paymentMethods.map(({ id, label }) => ({ label, value: id })),
              ]}
              value={search.paymentMethod ?? ""}
              onValueChange={(paymentMethod) =>
                onChange({
                  paymentMethod: paymentMethod
                    ? (paymentMethod as ReportSearch["paymentMethod"])
                    : undefined,
                })
              }
            />
            {hasNonDefaultFilters ? (
              <Button
                aria-label="Limpar todos os filtros dos relatórios"
                type="button"
                variant="ghost"
                onClick={() =>
                  onChange({
                    ...defaults,
                    paymentMethod: undefined,
                    professional: undefined,
                    service: undefined,
                  })
                }
              >
                <RotateCcwIcon data-icon="inline-start" />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>
      </FilterBar>
      {customPeriodOpen || preset === "custom" ? (
        <fieldset className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2">
          <legend className="sr-only">Período personalizado</legend>
          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium" htmlFor="report-from">
            Data inicial
            <DatePicker
              id="report-from"
              onValueChange={(from) => onChange({ from })}
              placeholder="Selecione a data inicial"
              value={search.from}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-sm font-medium" htmlFor="report-to">
            Data final
            <DatePicker
              id="report-to"
              onValueChange={(to) => onChange({ to })}
              placeholder="Selecione a data final"
              value={search.to}
            />
          </label>
        </fieldset>
      ) : null}
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDaysIcon aria-hidden="true" className="size-4" />
        Período inclusivo de {formatDate(search.from)} a {formatDate(search.to)}.
      </p>
    </div>
  )
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}
