import { SearchIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/modules/shared/components/ui/input-group"

type SearchInputProps = Omit<ComponentProps<typeof InputGroupInput>, "aria-label" | "type"> & {
  "aria-label": string
}

type ListSearchFieldProps = SearchInputProps & {
  children?: ReactNode
}

export function ListSearchField({ children, ...inputProps }: ListSearchFieldProps) {
  return (
    <InputGroup className="w-full shrink-0 sm:w-64" data-slot="list-search-field">
      <InputGroupInput type="search" {...inputProps} />
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
      {children ? <InputGroupAddon align="inline-end">{children}</InputGroupAddon> : null}
    </InputGroup>
  )
}

export function FilterOptionSearchField(inputProps: SearchInputProps) {
  return (
    <InputGroup data-slot="filter-option-search-field">
      <InputGroupInput type="search" {...inputProps} />
      <InputGroupAddon>
        <SearchIcon aria-hidden="true" />
      </InputGroupAddon>
    </InputGroup>
  )
}
