"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/modules/shared/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      nativeButton
      render={<button type="button" />}
      className={cn(
        "group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-muted-foreground/35 p-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="size-5 translate-x-0 rounded-full bg-background shadow-sm transition-transform group-data-checked:translate-x-5 motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  )
}

function CompactSwitch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-variant="compact"
      nativeButton
      render={<button type="button" />}
      className={cn(
        "group inline-flex h-4 w-[1.875rem] shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-muted-foreground/35 p-[0.09375rem] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="size-[0.8125rem] translate-x-0 rounded-full bg-background shadow-sm transition-transform group-data-checked:translate-x-[0.875rem] motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  )
}

export { CompactSwitch, Switch }
