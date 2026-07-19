import { ChevronDownIcon } from "lucide-react"
import { useId } from "react"

import { CompactSwitchControl } from "@/modules/shared/components/forms/form-controls"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/modules/shared/components/ui/collapsible"
import { TriStateToggle } from "@/modules/shared/components/ui/tri-state-toggle"

export type PermissionGroupItem = {
  checked: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}

type PermissionGroupProps = {
  items: readonly PermissionGroupItem[]
  label: string
  onAllChange: (checked: boolean) => void
}

export function PermissionGroup({ items, label, onAllChange }: PermissionGroupProps) {
  const id = useId()
  const checkedCount = items.filter((item) => item.checked).length
  const allChecked = items.length > 0 && checkedCount === items.length
  const isMixed = checkedCount > 0 && !allChecked

  return (
    <Collapsible
      className="relative rounded-md p-3 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-border before:content-['']"
      defaultOpen
    >
      <div className="flex min-h-8 items-center gap-2">
        <label
          className="flex min-h-8 flex-1 cursor-pointer items-center gap-2 text-sm font-medium"
          htmlFor={`${id}-all`}
        >
          <TriStateToggle
            aria-describedby={isMixed ? `${id}-state` : undefined}
            checked={allChecked}
            id={`${id}-all`}
            indeterminate={isMixed}
            onCheckedChange={(checked) => onAllChange(checked)}
          />
          {label}
        </label>
        {isMixed ? (
          <span className="sr-only" id={`${id}-state`}>
            Seleção parcial
          </span>
        ) : null}
        <CollapsibleTrigger
          aria-label={`Alternar permissões de ${label}`}
          className="group flex size-8 cursor-pointer items-center justify-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent
        keepMounted
        className="h-(--collapsible-panel-height) overflow-hidden pt-2 transition-[height] duration-150 ease-out [&[hidden]:not([hidden='until-found'])]:hidden data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none"
      >
        <div className="grid gap-1 sm:grid-cols-2">
          {items.map((item, index) => {
            const itemId = `${id}-item-${index}`
            return (
              <label
                key={item.label}
                className="flex min-h-8 cursor-pointer items-center justify-between gap-2 rounded-md border px-2 text-muted-foreground text-sm"
                htmlFor={itemId}
              >
                <span>{item.label}</span>
                <CompactSwitchControl
                  checked={item.checked}
                  id={itemId}
                  onCheckedChange={item.onCheckedChange}
                />
              </label>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
