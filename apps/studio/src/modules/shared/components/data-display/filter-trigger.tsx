import type { LucideIcon } from "lucide-react"
import type { ComponentProps } from "react"

import { Button } from "@/modules/shared/components/ui/button"
import { cn } from "@/modules/shared/lib/utils"

export function FilterTrigger({
  active = false,
  count,
  icon: Icon,
  label,
  ...triggerProps
}: {
  active?: boolean
  count?: number
  icon: LucideIcon
  label: string
} & Omit<ComponentProps<typeof Button>, "children" | "variant">) {
  return (
    <Button
      {...triggerProps}
      aria-label={triggerProps["aria-label"] ?? label}
      className={cn("h-9 min-w-max gap-1 px-2.5 text-xs", triggerProps.className)}
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
