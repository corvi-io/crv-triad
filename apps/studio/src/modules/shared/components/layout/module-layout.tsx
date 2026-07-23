import type { ReactNode } from "react"

import { ScrollArea } from "@/modules/shared/components/ui/scroll-area"
import { cn } from "@/modules/shared/lib/utils"

type ModuleLayoutProps = {
  bodyClassName?: string
  bodyViewportClassName?: string
  children?: ReactNode
  className?: string
  head?: ReactNode
  headClassName?: string
}

export function ModuleLayout({
  bodyClassName,
  bodyViewportClassName,
  children,
  className,
  head,
  headClassName,
}: ModuleLayoutProps) {
  return (
    <section
      data-slot="module-layout"
      className={cn("flex min-h-0 w-full flex-1 flex-col overflow-hidden", className)}
    >
      {head ? (
        <div
          data-slot="module-layout-head"
          className={cn("shrink-0 space-y-3 pb-3", headClassName)}
        >
          {head}
        </div>
      ) : null}
      <ScrollArea
        data-slot="module-layout-body"
        className={cn("min-h-0 flex-1", bodyClassName)}
        viewportClassName={bodyViewportClassName}
      >
        {children}
      </ScrollArea>
    </section>
  )
}
