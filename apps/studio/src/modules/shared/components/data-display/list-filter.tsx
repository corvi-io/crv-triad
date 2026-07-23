import type { LucideIcon } from "lucide-react"
import { XIcon } from "lucide-react"
import { useState } from "react"

import { FilterTrigger } from "@/modules/shared/components/data-display/filter-trigger"
import { FilterOptionSearchField } from "@/modules/shared/components/data-display/list-search-field"
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

export type ListFilterOption<Value extends string = string> = {
  icon?: LucideIcon
  label: string
  value: Value
}

type SingleSelectListFilterProps<Value extends string> = {
  icon: LucideIcon
  id: string
  inactiveValue: Value
  label: string
  onValueChange: (value: Value) => void
  options: readonly ListFilterOption<Value>[]
  value: Value
}

export function SingleSelectListFilter<Value extends string>({
  icon,
  id,
  inactiveValue,
  label,
  onValueChange,
  options,
  value,
}: SingleSelectListFilterProps<Value>) {
  const active = value !== inactiveValue
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <FilterTrigger
            active={active}
            aria-label={selectedLabel ? `${label}: ${selectedLabel}` : label}
            count={active ? 1 : undefined}
            icon={icon}
            id={id}
            label={label}
          />
        }
      />
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(nextValue) => onValueChange(nextValue as Value)}
          >
            {options.map((option) => {
              const OptionIcon = option.icon
              return (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {OptionIcon ? <OptionIcon aria-hidden="true" /> : null}
                  {option.label}
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onValueChange(inactiveValue)}>
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

type MultiSelectListFilterProps<Value extends string> = {
  icon: LucideIcon
  id: string
  label: string
  onValuesChange: (values: readonly Value[]) => void
  options: readonly ListFilterOption<Value>[]
  search?: {
    label: string
    placeholder?: string
  }
  values: readonly Value[]
}

export function MultiSelectListFilter<Value extends string>({
  icon,
  id,
  label,
  onValuesChange,
  options,
  search,
  values,
}: MultiSelectListFilterProps<Value>) {
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
            aria-label={values.length > 0 ? `${label}: ${values.length} selecionado(s)` : label}
            count={values.length || undefined}
            icon={icon}
            id={id}
            label={label}
          />
        }
      />
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {search ? (
            <div className="p-1">
              <FilterOptionSearchField
                aria-label={search.label}
                placeholder={search.placeholder ?? "Pesquisar"}
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          ) : null}
          {visibleOptions.map((option) => {
            const OptionIcon = option.icon
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
                {OptionIcon ? <OptionIcon aria-hidden="true" /> : null}
                {option.label}
              </DropdownMenuCheckboxItem>
            )
          })}
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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
}
