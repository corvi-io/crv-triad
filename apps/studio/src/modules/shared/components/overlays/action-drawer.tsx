import type { ReactNode } from "react"

import { ScrollArea } from "@/modules/shared/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/modules/shared/components/ui/sheet"
import { cn } from "@/modules/shared/lib/utils"

export type ActionDrawerSize = "md" | "form" | "lg" | "xl"

type ActionDrawerProps = {
  bodyClassName?: string
  children: ReactNode
  className?: string
  context?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  footerClassName?: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onOpenChangeComplete?: (isOpen: boolean) => void
  primaryAction?: ReactNode
  secondaryActions?: ReactNode
  size?: ActionDrawerSize
  tabs?: ReactNode
  title: ReactNode
}

const actionDrawerSizeClassNames: Record<ActionDrawerSize, string> = {
  form: "data-[side=right]:!w-screen data-[side=right]:!max-w-[40rem] data-[side=right]:border-l-0",
  lg: "data-[side=right]:!w-[calc(100vw-1rem)] data-[side=right]:!max-w-[56rem] data-[side=right]:lg:!w-[72vw]",
  md: "data-[side=right]:!w-[calc(100vw-1rem)] data-[side=right]:!max-w-[28rem]",
  xl: "data-[side=right]:!w-[calc(100vw-1rem)] data-[side=right]:!max-w-[72rem] data-[side=right]:lg:!w-[82vw]",
}

export function ActionDrawer({
  bodyClassName,
  children,
  className,
  context,
  description,
  footer,
  footerClassName,
  isOpen,
  onOpenChange,
  onOpenChangeComplete,
  primaryAction,
  secondaryActions,
  size = "md",
  tabs,
  title,
}: ActionDrawerProps) {
  const footerContent =
    footer ??
    (primaryAction || secondaryActions ? (
      <>
        {secondaryActions ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap">
            {secondaryActions}
          </div>
        ) : null}
        {primaryAction ? <div className="flex justify-end sm:ml-auto">{primaryAction}</div> : null}
      </>
    ) : null)

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
      <SheetContent className={cn("gap-0", actionDrawerSizeClassNames[size], className)}>
        <SheetHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6 sm:pr-14">
          {context ? (
            <>
              <SheetTitle className="sr-only">
                {context} / {title}
              </SheetTitle>
              <div className="flex min-w-0 items-baseline gap-1" aria-hidden="true">
                <span className="truncate text-sm font-normal text-muted-foreground">
                  {context}
                </span>
                <span className="text-sm font-normal text-muted-foreground">/</span>
                <span className="truncate text-base font-semibold text-foreground">{title}</span>
              </div>
            </>
          ) : (
            <SheetTitle>{title}</SheetTitle>
          )}
          {description ? (
            <SheetDescription className={context ? "sr-only" : undefined}>
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        {tabs ? <div className="shrink-0">{tabs}</div> : null}
        <ScrollArea className="min-h-0 flex-1" viewportClassName={cn("p-4", bodyClassName)}>
          {children}
        </ScrollArea>
        {footerContent ? (
          <SheetFooter
            className={cn(
              "shrink-0 flex-col gap-2 border-t bg-popover sm:flex-row sm:items-center sm:justify-between",
              footerClassName,
            )}
          >
            {footerContent}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
