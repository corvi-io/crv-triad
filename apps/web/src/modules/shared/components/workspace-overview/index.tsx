import { workspaceModules } from "@/modules/shared/workspace/module-registry"

import { ModuleCard } from "./module-card"

export function WorkspaceOverview() {
  const shortcutModules = workspaceModules.filter((module) => module.path !== "/overview")

  return (
    <section aria-labelledby="dashboard-title" className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" id="dashboard-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Fundação autenticada do CRV Triad.</p>
      </header>

      <section className="max-w-3xl rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <h2 className="text-base font-semibold">Acessos do workspace</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {shortcutModules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </section>
    </section>
  )
}
