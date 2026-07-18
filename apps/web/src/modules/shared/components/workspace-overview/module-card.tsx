import { Link } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"

import type { WorkspaceModule } from "@/modules/shared/workspace/module-registry"

type ModuleCardProps = {
  module: WorkspaceModule
}

export function ModuleCard({ module }: ModuleCardProps) {
  const ModuleIcon = module.icon

  return (
    <Link
      className="group min-w-0 rounded-lg border bg-card p-3 text-card-foreground shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      to={module.path}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <ModuleIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{module.label}</h2>
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{module.description}</p>
          </div>
        </div>
        <ArrowRightIcon
          className="mt-2 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}
