import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Building2Icon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  BackstageClientError,
  createTenant,
  getTenants,
} from "@/modules/backstage/backstage-client"
import { useOperator } from "@/modules/backstage/operator-gate"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { Button } from "@/modules/shared/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"
import { Label } from "@/modules/shared/components/ui/label"

export const Route = createFileRoute("/_authenticated/barbershops/")({ component: BarbershopsPage })

function BarbershopsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [barbershopName, setBarbershopName] = useState("")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const operator = useOperator()
  const canManageTenants =
    operator.data?.role === "system_owner" || operator.data?.role === "operations"
  const tenants = useQuery({
    queryKey: ["tenants", page, search],
    queryFn: ({ signal }) => getTenants({ page, search, signal }),
  })
  const create = useMutation({
    mutationFn: createTenant,
    onSuccess: async (tenant) => {
      await queryClient.invalidateQueries({ queryKey: ["tenants"] })
      toast.success(
        tenant.ownerAccess === "invited"
          ? tenant.emailDelivery === "sent"
            ? "Barbearia criada e convite enviado."
            : "Barbearia criada, mas o convite não pôde ser enviado."
          : "Barbearia criada e proprietário vinculado.",
      )
      await navigate({ to: "/barbershops/$tenantId", params: { tenantId: tenant.id } })
    },
  })
  const stats = useMemo(
    () => ({
      active: tenants.data?.items.filter((item) => item.status === "active").length ?? 0,
      clients:
        tenants.data?.items.reduce((total, item) => total + Number(item.clientCount), 0) ?? 0,
      members:
        tenants.data?.items.reduce((total, item) => total + Number(item.memberCount), 0) ?? 0,
    }),
    [tenants.data],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate({
      name: String(data.get("name")),
      ownerEmail: String(data.get("ownerEmail")),
    })
  }
  function setCreateDrawerOpen(open: boolean) {
    setCreating(open)
    if (!open) {
      setBarbershopName("")
      create.reset()
    }
  }
  const createError =
    create.error instanceof BackstageClientError
      ? create.error.code === "slug_conflict"
        ? "Esse identificador já pertence a outra barbearia."
        : create.error.code === "pending_invitation_exists"
          ? "Já existe um convite de acesso pendente para esse e-mail."
          : create.error.code === "owner_disabled"
            ? "A conta desse proprietário está desativada e precisa ser reativada antes."
            : "Não foi possível criar a barbearia. Revise os dados e tente novamente."
      : null

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-[1500px] p-5 sm:p-8 lg:p-10"
    >
      <header className="flex flex-wrap items-end justify-between gap-5 border-b pb-7">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Barbearias</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Acompanhe os estabelecimentos, o acesso contratado e o uso essencial da família TRIAD.
          </p>
        </div>
        {canManageTenants ? (
          <Button onClick={() => setCreateDrawerOpen(true)}>
            <PlusIcon /> Nova barbearia
          </Button>
        ) : null}
      </header>

      <section aria-label="Resumo das barbearias" className="grid border-b sm:grid-cols-3">
        {[
          { label: "Total cadastrado", value: tenants.data?.totalCount ?? "—" },
          { label: "Ativos nesta página", value: stats.active },
          { label: "Clientes ativos nesta página", value: stats.clients },
        ].map((metric) => (
          <div
            className="border-b py-6 last:border-b-0 sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0"
            key={metric.label}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {metric.label}
            </p>
            <strong className="mt-2 block text-3xl tabular-nums">{metric.value}</strong>
          </div>
        ))}
      </section>

      <section className="py-7" aria-labelledby="directory-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="directory-title" className="text-xl font-semibold">
              Diretório
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Informações operacionais sem dados pessoais de clientes.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <SearchIcon className="absolute top-3 left-3 size-4 text-muted-foreground" />
            <Label className="sr-only" htmlFor="search">
              Buscar barbearia
            </Label>
            <Input
              className="pl-9"
              id="search"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nome"
              value={search}
            />
          </div>
        </div>
        {tenants.isPending ? (
          <p className="py-12 text-sm text-muted-foreground" role="status">
            Carregando barbearias…
          </p>
        ) : null}
        {tenants.isError ? (
          <div className="py-12" role="alert">
            <p>Não foi possível carregar as barbearias.</p>
            <Button className="mt-3" onClick={() => void tenants.refetch()} variant="outline">
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {tenants.data?.items.length === 0 ? (
          <div className="my-8 border-y py-12 text-center">
            <Building2Icon className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 font-medium">Nenhuma barbearia encontrada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie a primeira barbearia ou ajuste sua busca.
            </p>
          </div>
        ) : null}
        {tenants.data?.items.length ? (
          <div className="mt-5 grid gap-3 sm:hidden">
            {tenants.data.items.map((tenant) => (
              <Link
                className="rounded-xl border bg-background p-4"
                key={tenant.id}
                params={{ tenantId: tenant.id }}
                to="/barbershops/$tenantId"
              >
                <span className="font-semibold">{tenant.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {tenant.status === "active" ? "Ativo" : "Suspenso"} · {tenant.memberCount} membros
                </span>
                <span className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <span>
                    <small className="block text-muted-foreground">Assinatura</small>
                    {tenant.subscriptionState === "active" ? "Ativa" : "Indisponível"}
                  </span>
                  <span>
                    <small className="block text-muted-foreground">Clientes ativos</small>
                    {tenant.clientCount}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : null}
        {tenants.data?.items.length ? (
          <div className="mt-5 hidden overflow-x-auto border-y sm:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4">Barbearia</th>
                  <th className="p-3">Assinatura</th>
                  <th className="p-3 text-right">Membros</th>
                  <th className="p-3 text-right">Clientes</th>
                  <th className="py-3 pl-4 text-right">Capacidade</th>
                </tr>
              </thead>
              <tbody>
                {tenants.data.items.map((tenant) => (
                  <tr className="border-b last:border-0" key={tenant.id}>
                    <td className="py-4 pr-4">
                      <Link
                        className="font-semibold underline-offset-4 hover:underline"
                        params={{ tenantId: tenant.id }}
                        to="/barbershops/$tenantId"
                      >
                        {tenant.name}
                      </Link>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {tenant.status === "active" ? "Ativo" : "Suspenso"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium">{tenant.planKey ?? "Sem plano"}</span>
                      <span className="block text-xs text-muted-foreground">
                        {tenant.subscriptionState === "active"
                          ? "Assinatura ativa"
                          : "Acesso indisponível"}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      <UsersIcon className="mr-1 inline size-3" />
                      {tenant.memberCount}
                    </td>
                    <td className="p-3 text-right tabular-nums">{tenant.clientCount}</td>
                    <td className="py-3 pl-4 text-right tabular-nums">
                      {tenant.activeClientLimit
                        ? `${tenant.clientCount}/${tenant.activeClientLimit}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {tenants.data && tenants.data.totalCount > tenants.data.pageSize ? (
          <div className="mt-5 flex justify-end gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              variant="outline"
            >
              Anterior
            </Button>
            <span className="self-center text-sm">Página {page}</span>
            <Button
              disabled={page * tenants.data.pageSize >= tenants.data.totalCount}
              onClick={() => setPage((value) => value + 1)}
              variant="outline"
            >
              Próxima
            </Button>
          </div>
        ) : null}
      </section>
      {canManageTenants ? (
        <ActionDrawer
          description="Informe os dados da barbearia e de seu proprietário."
          isOpen={creating}
          onOpenChange={setCreateDrawerOpen}
          primaryAction={
            <Button form="create-barbershop-form" isLoading={create.isPending} type="submit">
              Criar barbearia
            </Button>
          }
          secondaryActions={
            <Button onClick={() => setCreateDrawerOpen(false)} type="button" variant="outline">
              Cancelar
            </Button>
          }
          title="Nova barbearia"
        >
          <form id="create-barbershop-form" onSubmit={(event) => void submit(event)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name" required>
                  Nome
                </FieldLabel>
                <Input
                  autoFocus
                  id="name"
                  name="name"
                  minLength={2}
                  onChange={(event) => setBarbershopName(event.target.value)}
                  required
                  value={barbershopName}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="slug-preview">Identificador</FieldLabel>
                <Input id="slug-preview" readOnly value={`${previewSlug(barbershopName)}-*****`} />
              </Field>
              <Field>
                <FieldLabel htmlFor="ownerEmail" required>
                  E-mail do proprietário
                </FieldLabel>
                <Input id="ownerEmail" name="ownerEmail" type="email" required />
              </Field>
              {createError ? (
                <p className="text-sm text-destructive" role="alert">
                  {createError}
                </p>
              ) : null}
            </FieldGroup>
          </form>
        </ActionDrawer>
      ) : null}
    </main>
  )
}

function previewSlug(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "barbearia"
  )
}
