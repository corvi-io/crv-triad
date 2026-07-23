import { format } from "date-fns"
import {
  BriefcaseBusinessIcon,
  CalendarRangeIcon,
  Columns3Icon,
  ListIcon,
  MapPinIcon,
  RotateCcwIcon,
  ScissorsIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { DateRange } from "react-day-picker"
import { ptBR } from "react-day-picker/locale"
import {
  type ListFilterOption,
  MultiSelectListFilter,
  SingleSelectListFilter,
} from "@/modules/shared/components/data-display/list-filter"
import { ListSearchField } from "@/modules/shared/components/data-display/list-search-field"
import { formatDateOnly, parseDateOnly } from "@/modules/shared/components/forms/date-picker"
import { Button } from "@/modules/shared/components/ui/button"
import { Calendar } from "@/modules/shared/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/modules/shared/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/modules/shared/components/ui/toggle-group"

import type { ScheduleSearch } from "./agenda"
import { parseIdList, periodBounds, serializeIdList } from "./agenda"
import type {
  Appointment,
  AppointmentStatus,
  Professional,
  SchedulingScenario,
  Service,
} from "./contracts"
import { appointmentStatusPresentation } from "./status"

const statusOptions: readonly ListFilterOption<AppointmentStatus>[] = [
  ["scheduled", "Agendado"],
  ["confirmed", "Confirmado"],
  ["arrived", "Check-in"],
  ["waiting", "Em espera"],
  ["in-progress", "Em atendimento"],
  ["completed", "Finalizado"],
  ["canceled", "Cancelado"],
  ["no-show", "No-show"],
].map(([value, label]) => ({
  icon: appointmentStatusPresentation[value as AppointmentStatus].icon,
  label,
  value: value as AppointmentStatus,
}))

export function AgendaControls({
  appointments,
  onClearFilters,
  onReset,
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
  onClearFilters: () => void
  onReset: () => void
  onScenarioChange: (id: string) => void
  onSearchChange: (next: Partial<ScheduleSearch>) => void
  onSearchTextChange: (value: string) => void
  professionals: readonly Professional[]
  scenarios: readonly SchedulingScenario[]
  search: ScheduleSearch
  searchText: string
  services: readonly Service[]
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  const professionalIds = parseIdList(search.professional)
  const clientIds = parseIdList(search.client)
  const serviceIds = parseIdList(search.service)
  const statusIds = parseIdList(search.status) as AppointmentStatus[]
  const clients = useMemo(
    () =>
      Array.from(
        new Map(
          appointments.map(({ clientId, customerName }) => [clientId, customerName] as const),
        ),
      ).map(([value, label]) => ({ label, value })),
    [appointments],
  )

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", focusSearch)
    return () => window.removeEventListener("keydown", focusSearch)
  }, [])

  const hasActiveFilters =
    searchText.length > 0 ||
    professionalIds.length > 0 ||
    clientIds.length > 0 ||
    serviceIds.length > 0 ||
    statusIds.length > 0 ||
    search.period !== "today" ||
    search.unit !== "centro"

  return (
    <fieldset className="flex min-w-0 items-center gap-1.5 overflow-x-auto rounded-lg border bg-card p-2">
      <legend className="sr-only">Pesquisa, filtros e visualização da agenda</legend>
      <ListSearchField
        ref={searchRef}
        aria-label="Buscar na agenda"
        placeholder="Buscar cliente, barbeiro, serviço..."
        value={searchText}
        onChange={(event) => onSearchTextChange(event.currentTarget.value)}
      >
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[0.65rem]">⌘K</kbd>
      </ListSearchField>

      <MultiSelectListFilter
        icon={BriefcaseBusinessIcon}
        id="professional-filter"
        label="Barbeiro"
        options={professionals.map(({ id, name }) => ({ label: name, value: id }))}
        search={{ label: "Pesquisar barbeiro" }}
        values={professionalIds}
        onValuesChange={(values) => onSearchChange({ professional: serializeIdList(values) })}
      />
      <MultiSelectListFilter
        icon={UsersIcon}
        id="client-filter"
        label="Cliente"
        options={clients}
        search={{ label: "Pesquisar cliente" }}
        values={clientIds}
        onValuesChange={(values) => onSearchChange({ client: serializeIdList(values) })}
      />
      <MultiSelectListFilter
        icon={ScissorsIcon}
        id="service-filter"
        label="Serviço"
        options={services.map(({ id, name }) => ({ label: name, value: id }))}
        values={serviceIds}
        onValuesChange={(values) => onSearchChange({ service: serializeIdList(values) })}
      />
      <MultiSelectListFilter
        icon={SlidersHorizontalIcon}
        id="status-filter"
        label="Status"
        options={statusOptions}
        values={statusIds}
        onValuesChange={(values) => onSearchChange({ status: serializeIdList(values) })}
      />
      <PeriodFilter search={search} onSearchChange={onSearchChange} />
      <SingleSelectListFilter
        icon={MapPinIcon}
        id="unit-filter"
        inactiveValue="centro"
        label="Unidade"
        options={[
          { label: "Centro", value: "centro" },
          { label: "Artesão", value: "artesao" },
        ]}
        value={search.unit}
        onValueChange={(unit) => onSearchChange({ unit })}
      />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <ToggleGroup
          aria-label="Visualização da agenda"
          spacing={0}
          value={[search.view]}
          variant="brand"
          onValueChange={(values) => {
            const view = values[0] as ScheduleSearch["view"] | undefined
            if (view) onSearchChange({ view })
          }}
        >
          <ToggleGroupItem aria-label="Visualizar como lista" className="min-w-20" value="list">
            <ListIcon data-icon="inline-start" />
            Lista
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Visualizar como quadro" className="min-w-20" value="board">
            <Columns3Icon data-icon="inline-start" />
            Quadro
          </ToggleGroupItem>
        </ToggleGroup>

        <DevelopmentMenu
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
          onReset={onReset}
          onScenarioChange={onScenarioChange}
          scenarios={scenarios}
          selectedScenario={search.scenario}
        />
      </div>
    </fieldset>
  )
}

function PeriodFilter({
  onSearchChange,
  search,
}: {
  onSearchChange: (next: Partial<ScheduleSearch>) => void
  search: ScheduleSearch
}) {
  const [open, setOpen] = useState(false)
  const bounds = periodBounds(search.date, search.period, search.customStart, search.customEnd)
  const [draft, setDraft] = useState<DateRange | undefined>(() => rangeFromBounds(bounds))

  function selectPreset(period: Exclude<ScheduleSearch["period"], "custom">) {
    onSearchChange({ customEnd: undefined, customStart: undefined, period })
    setOpen(false)
  }

  function applyCustomRange() {
    if (!draft?.from || !draft.to) return
    onSearchChange({
      customEnd: formatDateOnly(draft.to),
      customStart: formatDateOnly(draft.from),
      date: formatDateOnly(draft.from),
      period: "custom",
    })
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setDraft(rangeFromBounds(bounds))
        setOpen(nextOpen)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            aria-label={`Período: ${periodLabel(search)}`}
            className="h-9 min-w-max gap-1 px-2.5 text-xs"
            id="period-filter"
            type="button"
            variant={search.period !== "today" ? "filter-active" : "filter"}
          >
            <CalendarRangeIcon data-icon="inline-start" aria-hidden="true" />
            <span>Período</span>
            <span className="ml-1 text-xs tabular-nums text-muted-foreground">
              {periodLabel(search)}
            </span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-3">
        <PopoverTitle>Período da agenda</PopoverTitle>
        <PopoverDescription>
          Escolha um atalho ou selecione as datas inicial e final.
        </PopoverDescription>
        <div className="grid grid-cols-3 gap-1">
          <Button size="sm" type="button" variant="ghost" onClick={() => selectPreset("today")}>
            Hoje
          </Button>
          <Button size="sm" type="button" variant="ghost" onClick={() => selectPreset("tomorrow")}>
            Amanhã
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => selectPreset("next-seven-days")}
          >
            7 dias
          </Button>
        </div>
        <Calendar
          captionLayout="dropdown"
          endMonth={new Date(2100, 11)}
          locale={ptBR}
          mode="range"
          selected={draft}
          startMonth={new Date(1900, 0)}
          onSelect={setDraft}
        />
        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <p className="text-xs text-muted-foreground">{draftLabel(draft)}</p>
          <Button
            disabled={!draft?.from || !draft.to}
            size="sm"
            type="button"
            onClick={applyCustomRange}
          >
            Aplicar período
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DevelopmentMenu({
  hasActiveFilters,
  onClearFilters,
  onReset,
  onScenarioChange,
  scenarios,
  selectedScenario,
}: {
  hasActiveFilters: boolean
  onClearFilters: () => void
  onReset: () => void
  onScenarioChange: (id: string) => void
  scenarios: readonly SchedulingScenario[]
  selectedScenario: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Configurações do protótipo"
            size="icon"
            type="button"
            variant="outline"
          >
            <Settings2Icon aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Cenário de desenvolvimento</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={selectedScenario} onValueChange={onScenarioChange}>
            {scenarios.map((scenario) => (
              <DropdownMenuRadioItem closeOnClick key={scenario.id} value={scenario.id}>
                <span className="flex min-w-0 flex-col">
                  <span>{scenario.label}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {scenario.description}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onReset}>
            <RotateCcwIcon aria-hidden="true" />
            Restaurar cenário
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!hasActiveFilters} onClick={onClearFilters}>
            <XIcon aria-hidden="true" />
            Limpar filtros
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function periodLabel(search: ScheduleSearch) {
  const bounds = periodBounds(search.date, search.period, search.customStart, search.customEnd)
  if (bounds.startDate === bounds.endDate) return formatDate(bounds.startDate)
  return `${formatDate(bounds.startDate)} – ${formatDate(bounds.endDate)}`
}

function rangeFromBounds(bounds: { startDate: string; endDate: string }): DateRange {
  return {
    from: parseDateOnly(bounds.startDate),
    to: parseDateOnly(bounds.endDate),
  }
}

function draftLabel(range?: DateRange) {
  if (!range?.from) return "Selecione a data inicial"
  if (!range.to) return `${format(range.from, "dd/MM/yyyy")} — selecione a data final`
  return `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`
}

function formatDate(value: string) {
  const parsed = parseDateOnly(value)
  return parsed ? format(parsed, "dd/MM", { locale: ptBR }) : value
}
