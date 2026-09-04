import { createFileRoute } from "@tanstack/react-router"
import { ArrowRightIcon, Building2Icon, CheckIcon, SparklesIcon } from "lucide-react"
import { useState } from "react"
import { StudioLogo } from "@/modules/shared/components/branding/studio-logo"
import { cn } from "@/modules/shared/lib/utils"
import { useWorkspaceContext } from "@/modules/workspace/context-provider"
import { BarbershopAvatar, workspaceRoleLabel } from "@/modules/workspace/context-switcher"

export const Route = createFileRoute("/_authenticated/select-workspace/")({
  component: SelectWorkspacePage,
})

function SelectWorkspacePage() {
  const { contexts, selectTenant } = useWorkspaceContext()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState(false)

  async function openTenant(id: string) {
    setPendingId(id)
    setSelectionError(false)
    try {
      await selectTenant(id)
      window.location.replace("/overview")
    } catch {
      setSelectionError(true)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="grid min-h-svh bg-background text-foreground lg:grid-cols-[minmax(20rem,0.8fr)_minmax(34rem,1.2fr)]"
    >
      <section className="relative flex overflow-hidden bg-sidebar px-6 py-8 text-workspace-selection-foreground sm:px-10 lg:min-h-svh lg:items-end lg:p-12">
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-[62%_center]"
          src="/auth/studio-quiet-luxury.webp"
        />
        <div className="absolute inset-0 bg-workspace-selection-overlay" aria-hidden="true" />
        <div className="relative flex w-full flex-col justify-between gap-12 lg:min-h-[calc(100svh-6rem)]">
          <StudioLogo tone="gold" />
          <div className="max-w-md space-y-5">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              <SparklesIcon className="size-4" aria-hidden="true" />
              Seu espaço de trabalho
            </span>
            <p className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
              A operação certa começa no contexto certo.
            </p>
            <p className="max-w-sm text-sm leading-6 text-workspace-selection-muted">
              Cada barbearia mantém sua equipe, agenda e operação separadas. Escolha onde você quer
              começar.
            </p>
            <div className="flex items-center gap-2 text-sm text-workspace-selection-muted">
              <CheckIcon className="size-4 text-primary" aria-hidden="true" />
              Você poderá trocar de barbearia pelo menu do perfil.
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-primary">Seleção de barbearia</span>
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">Onde você quer trabalhar?</h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Abra uma barbearia com um único clique.
            </p>
          </div>
          {selectionError ? (
            <p
              className="mt-6 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
              role="alert"
            >
              Não foi possível abrir o espaço. Seu contexto anterior foi preservado; tente
              novamente.
            </p>
          ) : null}
          <ul className="mt-8 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
            {contexts.tenants.map((tenant) => (
              <li key={tenant.id} className="border-b border-border last:border-b-0">
                <button
                  aria-label={`Abrir ${tenant.name}`}
                  aria-busy={pendingId === tenant.id}
                  className={cn(
                    "group flex min-h-24 w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 sm:px-5",
                    pendingId && pendingId !== tenant.id && "cursor-default opacity-55",
                  )}
                  disabled={!!pendingId}
                  type="button"
                  onClick={() => void openTenant(tenant.id)}
                >
                  <BarbershopAvatar tenant={tenant} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold sm:text-base">{tenant.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2Icon className="size-3.5" aria-hidden="true" />
                      {workspaceRoleLabel[tenant.role]}
                    </p>
                  </div>
                  <span className="hidden items-center gap-2 text-sm font-medium text-primary sm:flex">
                    {pendingId === tenant.id ? "Abrindo" : "Abrir barbearia"}
                    <ArrowRightIcon
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
