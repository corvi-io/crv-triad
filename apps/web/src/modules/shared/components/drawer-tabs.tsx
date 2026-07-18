import { Tabs } from "@base-ui/react/tabs"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/modules/shared/lib/utils"

export type DrawerTabItem = {
  label: ReactNode
  value: string
}

type DrawerTabsListProps = {
  className?: string
  items: readonly DrawerTabItem[]
  label: string
}

type DrawerTabsPanelProps = ComponentProps<typeof Tabs.Panel> & {
  className?: string
}

export function DrawerTabsRoot({ className, ...props }: ComponentProps<typeof Tabs.Root>) {
  return <Tabs.Root className={cn("contents", className)} {...props} />
}

export function DrawerTabsList({ className, items, label }: DrawerTabsListProps) {
  return (
    <Tabs.List
      aria-label={label}
      className={cn("flex gap-1 overflow-x-auto border-b bg-popover px-4", className)}
    >
      {items.map((item) => (
        <Tabs.Tab
          key={item.value}
          value={item.value}
          className="inline-flex h-10 shrink-0 items-center border-b-2 border-transparent px-2.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[active]:border-primary data-[active]:text-foreground"
        >
          {item.label}
        </Tabs.Tab>
      ))}
    </Tabs.List>
  )
}

export function DrawerTabsPanel({ className, ...props }: DrawerTabsPanelProps) {
  return <Tabs.Panel className={cn("outline-none", className)} {...props} />
}
