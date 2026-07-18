import { createFileRoute, Navigate } from "@tanstack/react-router"
import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/modules/shared/components/ui/button"
import { WorkspacePreviewShell } from "@/modules/shared/components/workspace-shell"
import { env } from "@/modules/shared/config/env"
import { useTheme } from "@/modules/shared/theme/theme-provider"

export const Route = createFileRoute("/workspace-preview/")({
  component: WorkspacePreviewRoute,
})

function WorkspacePreviewRoute() {
  const { preference, setPreference } = useTheme()

  if (!env.isDevServer) {
    return <Navigate replace to="/login" />
  }

  return (
    <WorkspacePreviewShell>
      <section aria-labelledby="workspace-preview-title" className="max-w-2xl space-y-2">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Pré-visualização de desenvolvimento
        </p>
        <h1 className="text-xl font-semibold tracking-tight" id="workspace-preview-title">
          Dashboard
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Use esta rota para validar a sidebar expandida, recolhida, móvel e em tema escuro sem uma
          sessão autenticada.
        </p>
        <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">Tema da pré-visualização</legend>
          <Button
            aria-pressed={preference === "light"}
            onClick={() => setPreference("light")}
            type="button"
            variant={preference === "light" ? "default" : "outline"}
          >
            <SunIcon aria-hidden="true" />
            Tema claro
          </Button>
          <Button
            aria-pressed={preference === "dark"}
            onClick={() => setPreference("dark")}
            type="button"
            variant={preference === "dark" ? "default" : "outline"}
          >
            <MoonIcon aria-hidden="true" />
            Tema escuro
          </Button>
        </fieldset>
      </section>
    </WorkspacePreviewShell>
  )
}
