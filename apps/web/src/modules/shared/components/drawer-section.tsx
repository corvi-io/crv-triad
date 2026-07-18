import { ChevronDownIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/modules/shared/components/ui/collapsible"
import { cn } from "@/modules/shared/lib/utils"

export function DrawerSection({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("space-y-4", className)} {...props} />
}

export function DrawerItem({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("border-t pt-4 first:border-t-0 first:pt-0", className)} {...props} />
}

export function DrawerSectionHeading({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2 className={cn("text-xs font-medium uppercase text-foreground", className)} {...props} />
  )
}

type CollapsibleDrawerSectionProps = {
  children: ReactNode
  defaultOpen?: boolean
  status?: "default" | "invalid"
  title: string
}

export function CollapsibleDrawerSection({
  children,
  defaultOpen = true,
  status = "default",
  title,
}: CollapsibleDrawerSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === "invalid") setOpen(true)
  }, [status])

  useEffect(() => {
    const sectionElement = sectionRef.current
    if (!sectionElement) return

    const revealFirstInvalidField = () => {
      const invalidControl = sectionElement.querySelector<HTMLElement>("[aria-invalid='true']")
      if (!invalidControl) return

      setOpen(true)
      const dialog = sectionElement.closest("[role='dialog']") ?? document
      const firstInvalidControl = dialog.querySelector<HTMLElement>("[aria-invalid='true']")
      if (firstInvalidControl !== invalidControl) return

      requestAnimationFrame(() => invalidControl.focus())
    }

    const observer = new MutationObserver(revealFirstInvalidField)
    observer.observe(sectionElement, {
      attributeFilter: ["aria-invalid", "data-invalid"],
      attributes: true,
      subtree: true,
    })
    revealFirstInvalidField()

    return () => observer.disconnect()
  }, [])

  return (
    <Collapsible
      ref={sectionRef}
      className="relative rounded-sm p-3 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-border before:content-[''] data-invalid:before:border-destructive"
      data-invalid={status === "invalid" ? true : undefined}
      open={open}
      onOpenChange={setOpen}
    >
      <CollapsibleTrigger className="group flex min-h-6 w-full cursor-pointer items-center justify-between gap-3 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <DrawerSectionHeading>{title}</DrawerSectionHeading>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        keepMounted
        className="h-(--collapsible-panel-height) overflow-hidden pt-2 transition-[height] duration-150 ease-out [&[hidden]:not([hidden='until-found'])]:hidden data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none"
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
