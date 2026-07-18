import { Link } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"

import { cn } from "@/modules/shared/lib/utils"
import type {
  WorkspaceModule,
  WorkspacePlannedNavigationItem,
} from "@/modules/shared/workspace/module-registry"

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

type PlannedModuleCardProps = {
  module: WorkspacePlannedNavigationItem
  className?: string
}

export function PlannedModuleCard({ className, module }: PlannedModuleCardProps) {
  const ModuleIcon = module.icon

  return (
    <article
      aria-labelledby={`planned-module-${module.id}`}
      className={cn(
        "min-w-0 rounded-lg border bg-muted/35 px-3 py-2.5 text-muted-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-background text-muted-foreground">
          <ModuleIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3
            className="truncate text-sm font-semibold text-foreground"
            id={`planned-module-${module.id}`}
          >
            {module.label}
          </h3>
          <p className="truncate text-xs">Disponível em breve</p>
        </div>
      </div>
    </article>
  )
}
