import type { ReactNode } from "react"

type FilterBarProps = {
  children: ReactNode
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-sm sm:flex-row sm:items-center">
      {children}
    </div>
  )
}
