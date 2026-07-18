import {
  workspaceModules,
  workspacePlannedModules,
} from "@/modules/shared/workspace/module-registry"

import { ModuleCard, PlannedModuleCard } from "./module-card"

export function WorkspaceOverview() {
  const shortcutModules = workspaceModules.filter((module) => module.path !== "/overview")
  const hasShortcutModules = shortcutModules.length > 0

  return (
    <section aria-labelledby="dashboard-title" className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" id="dashboard-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Visão geral do workspace CRV Triad.</p>
      </header>

      <div className="grid max-w-5xl items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)]">
        {hasShortcutModules ? (
          <section className="min-w-0 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold">Acessos rápidos</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {shortcutModules.map((module) => (
                <ModuleCard key={module.id} module={module} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="min-w-0 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <h2 className="text-base font-semibold">Módulos planejados</h2>
          <div className="mt-3 grid gap-2">
            {workspacePlannedModules.map((module) => (
              <PlannedModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
