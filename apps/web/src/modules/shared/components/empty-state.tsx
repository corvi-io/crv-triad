import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ action, description, icon: Icon, title }: EmptyStateProps) {
  return (
    <div className="grid min-h-56 place-items-center rounded-lg border border-dashed bg-card p-6 text-center shadow-sm">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  )
}
