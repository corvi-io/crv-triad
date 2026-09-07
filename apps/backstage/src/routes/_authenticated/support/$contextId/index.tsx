import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router"
import { ClockIcon, LogOutIcon, ShieldAlertIcon } from "lucide-react"
import { useState } from "react"
import { getSupportWorkspace, revokeSupportContext } from "@/modules/backstage/backstage-client"
import { useSupportSession } from "@/modules/backstage/support-session"
import { Button } from "@/modules/shared/components/ui/button"

export const Route = createFileRoute("/_authenticated/support/$contextId/")({
  component: SupportWorkspacePage,
})

function SupportWorkspacePage() {
  const { contextId } = Route.useParams()
  const navigate = useNavigate()
  const support = useSupportSession()
  const [exitState, setExitState] = useState<"idle" | "pending" | "error">("idle")
  const active = support.session?.contextId === contextId ? support.session : null
  const workspace = useQuery({
    enabled: Boolean(active),
    queryKey: ["platform", "support", contextId],
    queryFn: ({ signal }) =>
      getSupportWorkspace({ contextId, credential: active?.credential ?? "", signal }),
    retry: false,
  })

  if (!active) return <Navigate replace to="/barbershops" />

  async function exitSupport() {
    if (!active || exitState === "pending") return
    setExitState("pending")
    try {
      await revokeSupportContext({ contextId: active.contextId, credential: active.credential })
      support.exit()
      await navigate({ to: "/barbershops", replace: true })
    } catch {
      setExitState("error")
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-foreground dark:bg-destructive/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <ShieldAlertIcon className="size-5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Suporte ativo — {active.organizationName}</p>
            <p className="flex items-center gap-1 text-xs">
              <ClockIcon className="size-3" aria-hidden="true" /> Expira às{" "}
              {new Date(active.expiresAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={exitState === "pending"}
            onClick={() => void exitSupport()}
          >
            <LogOutIcon aria-hidden="true" />
            {exitState === "pending" ? "Encerrando…" : "Sair do suporte"}
          </Button>
        </div>
      </header>
      {exitState === "error" ? (
        <div
          className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Não foi possível encerrar o suporte. O contexto foi mantido para você tentar novamente.
        </div>
      ) : null}
      <div className="mx-auto max-w-6xl p-5 sm:p-8">
        <h1 className="text-2xl font-semibold">Visão de suporte da barbearia</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Acesso temporário, somente leitura e auditado. Você não está representando um membro.
        </p>
        {workspace.isPending ? (
          <p className="mt-8 text-sm" role="status">
            Carregando dados autorizados…
          </p>
        ) : null}
        {workspace.isError ? (
          <div className="mt-8 rounded-lg border border-destructive/30 p-4" role="alert">
            <p className="font-medium">O contexto expirou ou foi revogado.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Saia do suporte e crie um novo contexto com motivo válido, se ainda necessário.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => void exitSupport()}>
              Voltar para operações
            </Button>
          </div>
        ) : null}
        {workspace.data ? (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Resumo da barbearia">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Membros ativos</p>
                <strong className="mt-2 block text-3xl tabular-nums">
                  {workspace.data.summary.activeMemberCount}
                </strong>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Clientes ativos</p>
                <strong className="mt-2 block text-3xl tabular-nums">
                  {workspace.data.summary.activeClientCount}
                </strong>
              </div>
            </section>
            <section className="mt-8" aria-labelledby="support-clients-title">
              <h2 id="support-clients-title" className="text-lg font-semibold">
                Clientes — somente identificação operacional
              </h2>
              {workspace.data.clients.items.length ? (
                <ul className="mt-3 divide-y rounded-xl border">
                  {workspace.data.clients.items.map((client) => (
                    <li className="flex items-center justify-between gap-3 p-3" key={client.id}>
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {client.status === "active" ? "Ativo" : "Arquivado"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
