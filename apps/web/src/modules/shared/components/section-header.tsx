import type { ReactNode } from "react"

type SectionHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function SectionHeader({ action, description, title }: SectionHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-normal text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
