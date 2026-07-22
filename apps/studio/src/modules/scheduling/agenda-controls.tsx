import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
  DatePicker,
  formatDateOnly,
  parseDateOnly,
} from "@/modules/shared/components/forms/date-picker"
import { SelectInput } from "@/modules/shared/components/forms/form-controls"
import { Button } from "@/modules/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/dropdown-menu"
import { Input } from "@/modules/shared/components/ui/input"
import { cn } from "@/modules/shared/lib/utils"
import type { ScheduleSearch } from "./agenda"
import { parseIdList, serializeIdList } from "./agenda"
import type { Appointment, Professional, SchedulingScenario, Service } from "./contracts"

type Option = { label: string; value: string }

export function AgendaControls({
  appointments,
  onReset,
  onClearFilters,
  onScenarioChange,
  onSearchChange,
  onSearchTextChange,
  professionals,
  scenarios,
  search,
  searchText,
  services,
}: {
  appointments: readonly Appointment[]
  onReset: () => void
  onClearFilters: () => void
  onScenarioChange: (id: string) => void
  onSearchChange: (next: Partial<ScheduleSearch>) => void
  onSearchTextChange: (value: string) => void
  professionals: readonly Professional[]
  scenarios: readonly SchedulingScenario[]
  search: ScheduleSearch
  searchText: string
  services: readonly Service[]
}) {
  const professionalIds = parseIdList(search.professional)
  const clientIds = parseIdList(search.client)
  const serviceIds = parseIdList(search.service)
  const clients = useMemo(
    () =>
      Array.from(
        new Map(
          appointments.map(({ clientId, customerName }) => [clientId, customerName] as const),
        ),
      ).map(([value, label]) => ({ label, value })),
    [appointments],
  )
  const date = parseDateOnly(search.date) ?? new Date()
  const moveDate = (amount: number) => {
    const next = new Date(date)
    next.setDate(next.getDate() + amount)
    onSearchChange({ date: formatDateOnly(next) })
  }
  const hasActiveFilters =
    searchText.length > 0 ||
    professionalIds.length > 0 ||
    clientIds.length > 0 ||
    serviceIds.length > 0 ||
    search.period !== "today" ||
    search.unit !== "centro"

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="grid gap-2 rounded-lg border bg-card p-3 xl:grid-cols-[minmax(13rem,1.4fr)_repeat(5,minmax(9rem,1fr))_auto] xl:items-end">
        <legend className="sr-only">Pesquisa e filtros da agenda</legend>
        <Filter
          active={searchText.length > 0}
          label="Pesquisa global"
          htmlFor="agenda-search"
          onClear={() => onSearchTextChange("")}
        >
          <Input
            id="agenda-search"
            placeholder="Cliente, serviço, profissional ou código"
            type="search"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.currentTarget.value)}
          />
        </Filter>
        <MultiSelectFilter
          searchable
          id="professional-filter"
          label="Barbeiro"
          options={professionals.map(({ id, name }) => ({ label: name, value: id }))}
          values={professionalIds}
          onValuesChange={(values) => onSearchChange({ professional: serializeIdList(values) })}
        />
        <MultiSelectFilter
          searchable
          id="client-filter"
          label="Cliente"
          options={clients}
          values={clientIds}
          onValuesChange={(values) => onSearchChange({ client: serializeIdList(values) })}
        />
        <MultiSelectFilter
          id="service-filter"
          label="Serviço"
          options={services.map(({ id, name }) => ({ label: name, value: id }))}
          values={serviceIds}
          onValuesChange={(values) => onSearchChange({ service: serializeIdList(values) })}
        />
        <Filter
          active={search.period !== "today"}
          label="Período"
          htmlFor="period-filter"
          onClear={() =>
            onSearchChange({ customEnd: undefined, customStart: undefined, period: "today" })
          }
        >
          <SelectInput
            className={cn(search.period !== "today" && "border-primary bg-accent")}
            id="period-filter"
            placeholder="Selecione"
            value={search.period}
            options={[
              { label: "Hoje", value: "today" },
              { label: "Amanhã", value: "tomorrow" },
              { label: "Esta semana", value: "this-week" },
              { label: "Próximos 7 dias", value: "next-seven-days" },
              { label: "Este mês", value: "this-month" },
              { label: "Personalizado", value: "custom" },
            ]}
            onValueChange={(period) =>
              onSearchChange({ period: period as ScheduleSearch["period"] })
            }
          />
        </Filter>
        <Filter
          active={search.unit !== "centro"}
          label="Unidade"
          htmlFor="unit-filter"
          onClear={() => onSearchChange({ unit: "centro" })}
        >
          <SelectInput
            className={cn(search.unit !== "centro" && "border-primary bg-accent")}
            id="unit-filter"
            placeholder="Selecione"
            value={search.unit}
            options={[
              { label: "Centro", value: "centro" },
              { label: "Artesão", value: "artesao" },
            ]}
            onValueChange={(unit) => onSearchChange({ unit: unit as ScheduleSearch["unit"] })}
          />
        </Filter>
        <Button
          disabled={!hasActiveFilters}
          type="button"
          variant="outline"
          onClick={onClearFilters}
        >
          <XIcon data-icon="inline-start" />
          Limpar filtros
        </Button>
      </fieldset>

      {search.period === "custom" ? (
        <fieldset className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2">
          <legend className="text-xs font-medium">Período personalizado</legend>
          <Filter label="Data inicial" htmlFor="custom-start">
            <DatePicker
              id="custom-start"
              placeholder="Selecione"
              value={search.customStart ?? search.date}
              onValueChange={(customStart) => onSearchChange({ customStart })}
            />
          </Filter>
          <Filter label="Data final" htmlFor="custom-end">
            <DatePicker
              id="custom-end"
              placeholder="Selecione"
              value={search.customEnd ?? search.date}
              onValueChange={(customEnd) => onSearchChange({ customEnd })}
            />
          </Filter>
          {search.customStart && search.customEnd && search.customStart > search.customEnd ? (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              A data final deve ser igual ou posterior à data inicial.
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <fieldset className="flex rounded-lg border p-1">
          <legend className="sr-only">Visualização da agenda</legend>
          {(
            [
              ["kanban", "Kanban"],
              ["daily-grid", "Grade diária"],
            ] as const
          ).map(([value, label]) => (
            <label
              className={cn(
                "cursor-pointer rounded-md px-3 py-2 text-sm font-medium outline-none focus-within:ring-3 focus-within:ring-ring/50",
                search.view === value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
              key={value}
            >
              <input
                className="sr-only"
                checked={search.view === value}
                name="agenda-view"
                type="radio"
                value={value}
                onChange={() => onSearchChange({ view: value })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <Button
          aria-label="Dia anterior"
          type="button"
          variant="outline"
          size="icon"
          onClick={() => moveDate(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <Filter label="Data de referência" htmlFor="schedule-date">
          <DatePicker
            id="schedule-date"
            placeholder="Selecione"
            value={search.date}
            onValueChange={(value) => onSearchChange({ date: value })}
          />
        </Filter>
        <Button
          aria-label="Próximo dia"
          type="button"
          variant="outline"
          size="icon"
          onClick={() => moveDate(1)}
        >
          <ChevronRightIcon />
        </Button>
        <Filter label="Cenário" htmlFor="scenario-filter">
          <SelectInput
            id="scenario-filter"
            placeholder="Selecione"
            value={search.scenario}
            options={scenarios.map(({ id, label }) => ({ label, value: id }))}
            onValueChange={onScenarioChange}
          />
        </Filter>
        <Button type="button" variant="outline" onClick={onReset}>
          <RotateCcwIcon data-icon="inline-start" />
          Restaurar
        </Button>
      </div>
    </div>
  )
}

function MultiSelectFilter({
  id,
  label,
  onValuesChange,
  options,
  searchable = false,
  values,
}: {
  id: string
  label: string
  onValuesChange: (values: readonly string[]) => void
  options: readonly Option[]
  searchable?: boolean
  values: readonly string[]
}) {
  const [query, setQuery] = useState("")
  const visibleOptions = options.filter(({ label: optionLabel }) =>
    optionLabel.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")),
  )
  return (
    <Filter
      active={values.length > 0}
      label={label}
      htmlFor={id}
      onClear={() => onValuesChange([])}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className={cn(
                "w-full justify-between",
                values.length > 0 && "border-primary bg-accent text-accent-foreground",
              )}
              id={id}
              type="button"
              variant="outline"
            >
              <span>{values.length > 0 ? `${values.length} selecionado(s)` : "Todos"}</span>
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent className="min-w-56" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            {searchable ? (
              <div className="p-1">
                <Input
                  aria-label={`Pesquisar ${label.toLocaleLowerCase("pt-BR")}`}
                  placeholder="Pesquisar"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </div>
            ) : null}
            {visibleOptions.map((option) => (
              <DropdownMenuCheckboxItem
                checked={values.includes(option.value)}
                key={option.value}
                onCheckedChange={(checked) =>
                  onValuesChange(
                    checked
                      ? [...values, option.value]
                      : values.filter((value) => value !== option.value),
                  )
                }
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
            {visibleOptions.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">Nenhuma opção encontrada.</p>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Filter>
  )
}

function Filter({
  active = false,
  children,
  htmlFor,
  label,
  onClear,
}: {
  active?: boolean
  children: React.ReactNode
  htmlFor: string
  label: string
  onClear?: () => void
}) {
  return (
    <div className="min-w-0" data-filter-state={active ? "active" : "rest"}>
      <div className="mb-1 flex min-h-6 items-center justify-between gap-1">
        <label className={cn("text-xs font-medium", active && "text-primary")} htmlFor={htmlFor}>
          {label}
        </label>
        {active && onClear ? (
          <Button
            aria-label={`Limpar filtro ${label.toLocaleLowerCase("pt-BR")}`}
            size="icon-xs"
            type="button"
            variant="ghost"
            onClick={onClear}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  )
}
