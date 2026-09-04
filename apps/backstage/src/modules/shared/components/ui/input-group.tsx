import type * as React from "react"

import { Input } from "@/modules/shared/components/ui/input"
import { cn } from "@/modules/shared/lib/utils"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group/input-group relative flex h-10 w-full min-w-0 items-center rounded-lg border border-input bg-background transition-colors outline-none has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50",
        className,
      )}
      data-slot="input-group"
      {...props}
    />
  )
}

function InputGroupAddon({
  align = "inline-start",
  className,
  ...props
}: React.ComponentProps<"div"> & { align?: "inline-start" | "inline-end" }) {
  return (
    <div
      className={cn(
        "flex h-auto items-center justify-center text-sm text-muted-foreground select-none [&>svg:not([class*='size-'])]:size-4",
        align === "inline-start" ? "order-first pl-3" : "order-last pr-3",
        className,
      )}
      data-align={align}
      data-slot="input-group-addon"
      role="presentation"
      {...props}
    />
  )
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      className={cn(
        "h-full flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent",
        className,
      )}
      data-slot="input-group-control"
      {...props}
    />
  )
}

export { InputGroup, InputGroupAddon, InputGroupInput }
