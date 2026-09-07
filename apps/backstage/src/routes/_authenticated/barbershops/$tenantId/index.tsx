import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeftIcon, Building2Icon, Settings2Icon, UsersIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"
import {
  createSupportContext,
  getTenant,
  getTenantAccess,
  updateTenant,
  updateTenantAccess,
} from "@/modules/backstage/backstage-client"
import { useOperator } from "@/modules/backstage/operator-gate"
import { useSupportSession } from "@/modules/backstage/support-session"
import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"
import { Label } from "@/modules/shared/components/ui/label"
import { Switch } from "@/modules/shared/components/ui/switch"
import { Textarea } from "@/modules/shared/components/ui/textarea"

export const Route = createFileRoute("/_authenticated/barbershops/$tenantId/")({
  component: BarbershopPage,
})

function BarbershopPage() {
  const { tenantId } = Route.useParams()
  const [reason, setReason] = useState("")
  const [accessReason, setAccessReason] = useState("")
  const [accessDraft, setAccessDraft] = useState<Set<string> | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const support = useSupportSession()
  const operator = useOperator()
  const canManageTenant =
    operator.data?.role === "system_owner" || operator.data?.role === "operations"
  const canSupportTenant = canManageTenant || operator.data?.role === "support"
  const tenant = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: ({ signal }) => getTenant(tenantId, signal),
  })
  const access = useQuery({
    queryKey: ["tenant", tenantId, "access"],
    queryFn: ({ signal }) => getTenantAccess(tenantId, signal),
  })
  const changeStatus = useMutation({
    mutationFn: updateTenant,
    onSuccess: async () => {
      setReason("")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["tenants"] }),
      ])
      toast.success("Barbearia atualizada.")
    },
  })
  const startSupport = useMutation({
    mutationFn: createSupportContext,
    onSuccess: async (created) => {
      if (!tenant.data) return
      support.start({
        contextId: created.id,
        credential: created.credential,
        expiresAt: created.expiresAt,
        organizationId: tenantId,
        organizationName: tenant.data.name,
      })
      await navigate({ to: "/support/$contextId", params: { contextId: created.id } })
    },
  })
  const changeAccess = useMutation({
    mutationFn: updateTenantAccess,
    onSuccess: async () => {
      setAccessDraft(null)
      setAccessReason("")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenant", tenantId, "access"] }),
        queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] }),
      ])
      toast.success("Recursos do plano atualizados.")
    },
  })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!tenant.data) return
    changeStatus.mutate({
      id: tenantId,
      reason,
      status: tenant.data.status === "active" ? "disabled" : "active",
      version: tenant.data.version,
    })
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-[1300px] p-5 sm:p-8 lg:p-10"
    >
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        to="/barbershops"
      >
        <ArrowLeftIcon className="size-4" /> Voltar às barbearias
      </Link>
      {tenant.isPending ? (
        <p className="py-16" role="status">
          Carregando barbearia…
        </p>
      ) : null}
      {tenant.isError ? (
        <div className="py-16" role="alert">
          <h1 className="text-2xl font-semibold">Barbearia indisponível</h1>
          <p className="mt-2 text-muted-foreground">Confirme o endereço ou tente novamente.</p>
        </div>
      ) : null}
      {tenant.data ? (
        <>
          <header className="mt-6 flex flex-wrap items-end justify-between gap-5 border-b pb-7">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2Icon className="size-5" />
                </span>
                <h1 className="text-3xl font-semibold tracking-tight">{tenant.data.name}</h1>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {tenant.data.slug} · Criado em{" "}
                {new Date(tenant.data.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${tenant.data.status === "active" ? "border-feedback-success-border bg-feedback-success text-feedback-success-foreground" : "border-destructive/30 bg-destructive/10 text-destructive"}`}
            >
              {tenant.data.status === "active" ? "Ativo" : "Suspenso"}
            </span>
          </header>
          <dl className="grid border-b sm:grid-cols-3" aria-label="Estatísticas da barbearia">
            <Metric label="Clientes ativos" value={tenant.data.activeClientCount} />
            <Metric label="Clientes arquivados" value={tenant.data.archivedClientCount} />
            <Metric label="Membros ativos" value={tenant.data.memberCount} />
          </dl>
          <div className="grid gap-10 py-8 lg:grid-cols-[1fr_360px]">
            <section>
              <h2 className="text-xl font-semibold">Assinatura e uso</h2>
              <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
                <Info
                  label="Plano"
                  value={tenant.data.planKey === "manual" ? "Acesso manual" : "Não configurado"}
                />
                <Info
                  label="Situação"
                  value={
                    tenant.data.subscriptionState === "active"
                      ? "Ativa"
                      : (tenant.data.subscriptionState ?? "Não configurada")
                  }
                />
                <Info label="Uso de clientes" value={`${tenant.data.activeClientCount} ativos`} />
                <Info
                  label="Limite contratado"
                  value={
                    tenant.data.activeClientLimit?.toLocaleString("pt-BR") ?? "Sem limite informado"
                  }
                />
              </dl>
              <section className="mt-8 border-t pt-7" aria-labelledby="access-title">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold" id="access-title">
                      Recursos do plano
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Controle quais operações esta barbearia pode usar. A alteração cria uma nova
                      versão do plano somente para este tenant.
                    </p>
                  </div>
                  {canManageTenant && access.data && accessDraft === null ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setAccessDraft(
                          new Set(
                            access.data.capabilities
                              .filter(({ enabled }) => enabled)
                              .map(({ key }) => key),
                          ),
                        )
                      }
                    >
                      <Settings2Icon /> Alterar recursos
                    </Button>
                  ) : null}
                </div>
                {access.isPending ? (
                  <p className="mt-5 text-sm text-muted-foreground" role="status">
                    Carregando recursos…
                  </p>
                ) : null}
                {access.isError ? (
                  <p className="mt-5 text-sm text-destructive" role="alert">
                    Não foi possível carregar os recursos do plano.
                  </p>
                ) : null}
                {access.data ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {access.data.capabilities.map((capability) => {
                      const checked = accessDraft?.has(capability.key) ?? capability.enabled
                      const id = `capability-${capability.key.replaceAll(".", "-")}`
                      return (
                        <div
                          className="flex min-h-12 items-center justify-between gap-4 rounded-lg border px-3 py-2"
                          key={capability.key}
                        >
                          <Label className="min-w-0" htmlFor={id}>
                            {capabilityLabel(capability.key)}
                          </Label>
                          <Switch
                            id={id}
                            checked={checked}
                            disabled={accessDraft === null || changeAccess.isPending}
                            onCheckedChange={(enabled) =>
                              setAccessDraft((current) => {
                                const next = new Set(current)
                                if (enabled) next.add(capability.key)
                                else next.delete(capability.key)
                                return next
                              })
                            }
                          />
                        </div>
                      )
                    })}
                  </div>
                ) : null}
                {accessDraft !== null && access.data ? (
                  <div className="mt-5 grid gap-3 rounded-xl border p-4">
                    <Label htmlFor="access-reason">Motivo da alteração</Label>
                    <Textarea
                      id="access-reason"
                      minLength={10}
                      maxLength={500}
                      value={accessReason}
                      onChange={(event) => setAccessReason(event.target.value)}
                      placeholder="Explique por que os recursos serão alterados"
                    />
                    <p className="text-xs text-muted-foreground">
                      O motivo ficará registrado na auditoria.
                    </p>
                    {changeAccess.isError ? (
                      <p className="text-sm text-destructive" role="alert">
                        Não foi possível atualizar os recursos. Recarregue os dados e tente
                        novamente.
                      </p>
                    ) : null}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={changeAccess.isPending}
                        onClick={() => {
                          setAccessDraft(null)
                          setAccessReason("")
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        isLoading={changeAccess.isPending}
                        disabled={accessReason.trim().length < 10}
                        onClick={() =>
                          changeAccess.mutate({
                            id: tenantId,
                            enabledCapabilities: [...accessDraft],
                            reason: accessReason,
                            subscriptionVersion: access.data.subscriptionVersion,
                          })
                        }
                      >
                        Salvar recursos
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
              <h2 className="mt-10 text-xl font-semibold">Proprietário</h2>
              <div className="mt-5 flex items-center gap-3 border-y py-4">
                <span className="grid size-10 place-items-center rounded-full bg-muted">
                  <UsersIcon className="size-4" />
                </span>
                <div>
                  <p className="font-medium">{tenant.data.ownerName ?? "Não identificado"}</p>
                  <p className="text-sm text-muted-foreground">
                    {tenant.data.ownerEmail ?? "E-mail indisponível"}
                  </p>
                </div>
              </div>
            </section>
            <aside className="border-t pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <h2 className="font-semibold">Controle operacional</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {tenant.data.status === "active"
                  ? "Suspender interrompe o acesso comercial no próximo pedido sem apagar dados."
                  : "Reativar devolve o acesso da barbearia mantendo seus dados."}
              </p>
              <form className="mt-5 grid gap-3" onSubmit={submit}>
                <Label htmlFor="reason">Motivo da alteração ou suporte</Label>
                <Input
                  aria-describedby="reason-guidance"
                  id="reason"
                  minLength={10}
                  onChange={(event) => setReason(event.target.value)}
                  required
                  value={reason}
                />
                <p className="text-xs text-muted-foreground" id="reason-guidance">
                  Informe ao menos 10 caracteres. O motivo será registrado na auditoria.
                </p>
                {canManageTenant ? (
                  <Button
                    isLoading={changeStatus.isPending}
                    type="submit"
                    variant={tenant.data.status === "active" ? "destructive" : "default"}
                  >
                    {tenant.data.status === "active" ? "Suspender barbearia" : "Reativar barbearia"}
                  </Button>
                ) : null}
                {tenant.data.status === "active" && canSupportTenant ? (
                  <Button
                    disabled={reason.trim().length < 10}
                    isLoading={startSupport.isPending}
                    onClick={() =>
                      startSupport.mutate({ durationMinutes: 30, organizationId: tenantId, reason })
                    }
                    type="button"
                    variant="outline"
                  >
                    Entrar em suporte por 30 minutos
                  </Button>
                ) : null}
                {changeStatus.isError || startSupport.isError ? (
                  <p className="text-sm text-destructive" role="alert">
                    Não foi possível concluir. Informe um motivo válido e tente novamente.
                  </p>
                ) : null}
              </form>
            </aside>
          </div>
        </>
      ) : null}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b py-6 last:border-b-0 sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 text-3xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-5">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-2 font-semibold">{value}</dd>
    </div>
  )
}

const capabilityLabels: Record<string, string> = {
  "availability.read": "Consultar disponibilidade",
  "availability.manage": "Gerenciar disponibilidade",
  "scheduling.read": "Consultar agenda",
  "scheduling.manage": "Gerenciar agenda",
  "service_desk.read": "Consultar atendimentos",
  "service_desk.manage": "Gerenciar atendimentos",
  "service_desk.correct": "Corrigir atendimentos",
  "revenue.read_checkout": "Consultar pagamentos e checkout",
  "revenue.register": "Registrar pagamentos",
  "revenue.adjust": "Ajustar pagamentos",
  "revenue.correct": "Corrigir pagamentos",
  "revenue.configure": "Configurar formas de pagamento",
  "cash.read": "Consultar caixa",
  "cash.manage": "Gerenciar caixa",
  "clients.read": "Consultar clientes",
  "clients.manage": "Gerenciar clientes",
  "catalogs.read": "Consultar catálogos",
  "catalogs.manage": "Gerenciar catálogos",
  "business_profile.read": "Consultar dados da barbearia",
  "business_profile.manage": "Gerenciar dados da barbearia",
  "commissions.read": "Consultar comissões",
  "commissions.manage": "Gerenciar comissões",
  "reports.read": "Consultar relatórios",
  "reports.export": "Gerar relatórios",
  "members.read": "Consultar membros",
  "members.manage": "Gerenciar membros",
  "ownership.transfer": "Transferir propriedade",
  "access_requests.review": "Revisar solicitações de acesso",
}

function capabilityLabel(key: string) {
  return capabilityLabels[key] ?? key
}
