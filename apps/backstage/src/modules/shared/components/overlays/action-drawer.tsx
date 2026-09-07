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

type ActionDrawerProps = {
  children: ReactNode
  description?: ReactNode
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  primaryAction?: ReactNode
  secondaryActions?: ReactNode
  title: ReactNode
}

export function ActionDrawer({
  children,
  description,
  isOpen,
  onOpenChange,
  primaryAction,
  secondaryActions,
  title,
}: ActionDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:!w-screen data-[side=right]:!max-w-[40rem] data-[side=right]:border-l-0">
        <SheetHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6 sm:pr-14">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1" viewportClassName="p-4 sm:p-6">
          {children}
        </ScrollArea>
        <SheetFooter
          className={cn(
            "shrink-0 flex-col-reverse gap-2 border-t bg-popover sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <div className="flex flex-col-reverse gap-2 sm:flex-row">{secondaryActions}</div>
          <div className="flex justify-end">{primaryAction}</div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
