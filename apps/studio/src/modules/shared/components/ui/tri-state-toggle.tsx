"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "@/modules/shared/lib/utils"

function TriStateToggle({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="tri-state-toggle"
      nativeButton
      render={<button type="button" />}
      className={cn(
        "group inline-flex h-4 w-[1.875rem] shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-muted-foreground/35 p-[0.09375rem] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 data-indeterminate:bg-primary motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <span
        data-slot="tri-state-marker"
        className="size-[0.8125rem] translate-x-0 rounded-full bg-background shadow-sm transition-all group-data-checked:translate-x-[0.875rem] group-data-indeterminate:h-1 group-data-indeterminate:w-3 group-data-indeterminate:translate-x-[0.4375rem] group-data-indeterminate:rounded-full group-data-indeterminate:shadow-none motion-reduce:transition-none"
      />
    </CheckboxPrimitive.Root>
  )
}

export { TriStateToggle }
