import { format } from "date-fns"
import type { LucideIcon } from "lucide-react"
import {
  BriefcaseBusinessIcon,
  CalendarRangeIcon,
  Columns3Icon,
  ListIcon,
  MapPinIcon,
  RotateCcwIcon,
  ScissorsIcon,
  SearchIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react"
import type { DateRange } from "react-day-picker"
import { ptBR } from "react-day-picker/locale"
import { formatDateOnly, parseDateOnly } from "@/modules/shared/components/forms/date-picker"
import { Button } from "@/modules/shared/components/ui/button"
import { Calendar } from "@/modules/shared/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/modules/shared/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/modules/shared/components/ui/popover"
import { ToggleGroup, ToggleGroupItem } from "@/modules/shared/components/ui/toggle-group"
import { cn } from "@/modules/shared/lib/utils"

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

type Option = { label: string; value: string }

const statusOptions: readonly Option[] = [
  ["scheduled", "Agendado"],
  ["confirmed", "Confirmado"],
  ["arrived", "Check-in"],
  ["waiting", "Em espera"],
  ["in-progress", "Em atendimento"],
  ["completed", "Finalizado"],
  ["canceled", "Cancelado"],
  ["no-show", "No-show"],
].map(([value, label]) => ({ label, value }))

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
  const statusIds = parseIdList(search.status)
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
      <InputGroup className="min-w-64 flex-1">
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchRef}
          aria-label="Buscar na agenda"
          placeholder="Buscar cliente, barbeiro, serviço..."
          type="search"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.currentTarget.value)}
        />
        <InputGroupAddon align="inline-end">
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[0.65rem]">⌘K</kbd>
        </InputGroupAddon>
      </InputGroup>

      <MultiSelectFilter
        searchable
        count={professionalIds.length || professionals.length}
        icon={BriefcaseBusinessIcon}
        id="professional-filter"
        label="Barbeiro"
        options={professionals.map(({ id, name }) => ({ label: name, value: id }))}
        values={professionalIds}
        onValuesChange={(values) => onSearchChange({ professional: serializeIdList(values) })}
      />
      <MultiSelectFilter
        searchable
        count={clientIds.length || clients.length}
        icon={UsersIcon}
        id="client-filter"
        label="Cliente"
        options={clients}
        values={clientIds}
        onValuesChange={(values) => onSearchChange({ client: serializeIdList(values) })}
      />
      <MultiSelectFilter
        count={serviceIds.length || services.length}
        icon={ScissorsIcon}
        id="service-filter"
        label="Serviço"
        options={services.map(({ id, name }) => ({ label: name, value: id }))}
        values={serviceIds}
        onValuesChange={(values) => onSearchChange({ service: serializeIdList(values) })}
      />
      <StatusFilter
        values={statusIds}
        onValuesChange={(values) => onSearchChange({ status: serializeIdList(values) })}
      />
      <PeriodFilter search={search} onSearchChange={onSearchChange} />
      <UnitFilter search={search} onSearchChange={onSearchChange} />

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

function MultiSelectFilter({
  count,
  icon,
  id,
  label,
  onValuesChange,
  options,
  searchable = false,
  values,
}: {
  count: number
  icon: LucideIcon
  id: string
  label: string
  onValuesChange: (values: readonly string[]) => void
  options: readonly Option[]
  searchable?: boolean
  values: readonly string[]
}) {
  const [query, setQuery] = useState("")
  const visibleOptions = options.filter(({ label: optionLabel }) =>
    normalize(optionLabel).includes(normalize(query)),
  )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <FilterTrigger
            active={values.length > 0}
            count={count}
            icon={icon}
            id={id}
            label={label}
          />
        }
      />
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {searchable ? (
            <div className="p-1">
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label={`Pesquisar ${label.toLocaleLowerCase("pt-BR")}`}
                  placeholder="Pesquisar"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </InputGroup>
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
        {values.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onValuesChange([])}>
                <XIcon aria-hidden="true" />
                Limpar filtro
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StatusFilter({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: readonly string[]) => void
  values: readonly string[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <FilterTrigger
            active={values.length > 0}
            count={values.length || statusOptions.length}
            icon={SlidersHorizontalIcon}
            id="status-filter"
            label="Status"
          />
        }
      />
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {statusOptions.map((option) => {
            const presentation = appointmentStatusPresentation[option.value as AppointmentStatus]
            const StatusIcon = presentation.icon
            return (
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
                <StatusIcon aria-hidden="true" />
                {option.label}
              </DropdownMenuCheckboxItem>
            )
          })}
        </DropdownMenuGroup>
        {values.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onValuesChange([])}>
                <XIcon aria-hidden="true" />
                Limpar filtro
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
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

function UnitFilter({
  onSearchChange,
  search,
}: {
  onSearchChange: (next: Partial<ScheduleSearch>) => void
  search: ScheduleSearch
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <FilterTrigger
            active={search.unit !== "centro"}
            icon={MapPinIcon}
            id="unit-filter"
            label="Unidade"
          />
        }
      />
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Unidade</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={search.unit}
            onValueChange={(unit) => onSearchChange({ unit: unit as ScheduleSearch["unit"] })}
          >
            <DropdownMenuRadioItem value="centro">Centro</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="artesao">Artesão</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
              <DropdownMenuRadioItem key={scenario.id} value={scenario.id}>
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

function FilterTrigger({
  active = false,
  count,
  icon: Icon,
  id,
  label,
  ...triggerProps
}: {
  active?: boolean
  count?: number
  icon: LucideIcon
  id: string
  label: string
} & Omit<ComponentProps<typeof Button>, "children" | "variant">) {
  return (
    <Button
      {...triggerProps}
      aria-label={label}
      className={cn("h-9 min-w-max gap-1 px-2.5 text-xs", triggerProps.className)}
      id={id}
      type="button"
      variant={active ? "filter-active" : "filter"}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
    </Button>
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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
}
