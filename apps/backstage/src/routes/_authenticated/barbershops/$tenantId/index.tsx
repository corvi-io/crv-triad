import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeftIcon, Building2Icon, UsersIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"
import { createSupportContext, getTenant, updateTenant } from "@/modules/backstage/backstage-client"
import { useOperator } from "@/modules/backstage/operator-gate"
import { useSupportSession } from "@/modules/backstage/support-session"
import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"
import { Label } from "@/modules/shared/components/ui/label"

export const Route = createFileRoute("/_authenticated/barbershops/$tenantId/")({
  component: BarbershopPage,
})

function BarbershopPage() {
  const { tenantId } = Route.useParams()
  const [reason, setReason] = useState("")
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
