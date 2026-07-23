import { ArchiveIcon, EyeIcon, PlusIcon, RotateCcwIcon, SearchIcon, UsersIcon } from "lucide-react"
import { useDeferredValue, useState } from "react"
import { toast } from "sonner"
import {
  createDataTablePointAnchor,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTablePagination,
  DataTableRow,
  DataTableRowActionsMenu,
  DataTableSortableHeaderCell,
  type DataTableSortState,
} from "@/modules/shared/components/data-display/data-table"
import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { applyInputMask } from "@/modules/shared/lib/input-masks"
import { ClientForm } from "./client-form"
import { ClientProfileDrawer } from "./client-profile-drawer"
import type { ClientInput, ClientRecord } from "./contracts"
import { useClients, useCreateClient, useSetClientArchived } from "./queries"
import type { ClientSearch } from "./search"

export function ClientDirectoryPage({
  onSearchChange,
  search,
}: {
  onSearchChange: (search: Partial<ClientSearch>) => void
  search: ClientSearch
}) {
  const [searchText, setSearchText] = useState("")
  const deferredSearch = useDeferredValue(searchText)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState<ClientRecord | null>(null)
  const [rowMenu, setRowMenu] = useState<{
    anchor: ReturnType<typeof createDataTablePointAnchor>
    client: ClientRecord
  } | null>(null)
  const query = useClients({
    ...search,
    scenarioId: search.scenario,
    search: deferredSearch,
    sort: { direction: search.sortDirection, field: search.sortField },
  })
  const createClient = useCreateClient()
  const archiveClient = useSetClientArchived()

  function updateSort(next: DataTableSortState<ClientSearch["sortField"]>) {
    onSearchChange({
      page: 1,
      sortDirection: next.direction ?? "asc",
      sortField: next.key ?? "name",
    })
  }

  async function create(input: ClientInput) {
    try {
      const created = (await createClient.mutateAsync(input)) as ClientRecord
      toast.success("Cliente criado.")
      setCreating(false)
      setSelectedId(created.id)
    } catch {
      toast.error("Não foi possível criar o cliente. Tente novamente.")
    }
  }

  async function toggleArchived(client: ClientRecord) {
    try {
      await archiveClient.mutateAsync({ archived: client.status === "active", id: client.id })
      toast.success(client.status === "active" ? "Cliente arquivado." : "Cliente restaurado.")
      setConfirmingArchive(null)
    } catch {
      toast.error("A alteração foi desfeita. Tente novamente.")
    }
  }

  const hasFilters =
    search.contact !== "all" || search.duplicate !== "all" || Boolean(search.tag) || searchText
  const page = query.data

  return (
    <>
      <ModuleLayout
        head={
          <>
            <PageHeader
              title="Clientes"
              description="Encontre clientes e consulte o histórico de atendimento."
              actions={
                <Button type="button" onClick={() => setCreating(true)}>
                  <PlusIcon aria-hidden="true" />
                  Novo cliente
                </Button>
              }
            />
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(4,minmax(9rem,auto))]">
              <label className="relative block" htmlFor="client-directory-search">
                <span className="sr-only">Buscar clientes</span>
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
                />
                <Input
                  id="client-directory-search"
                  className="pl-9"
                  placeholder="Buscar por nome, telefone ou e-mail"
                  value={searchText}
                  onChange={(event) => setSearchText(event.currentTarget.value)}
                />
              </label>
              <ClientSelect
                label="Estado"
                value={search.status}
                onValueChange={(value) =>
                  onSearchChange({ page: 1, status: value as ClientSearch["status"] })
                }
                options={[
                  ["active", "Ativos"],
                  ["archived", "Arquivados"],
                ]}
              />
              <ClientSelect
                label="Contato"
                value={search.contact}
                onValueChange={(value) =>
                  onSearchChange({ contact: value as ClientSearch["contact"], page: 1 })
                }
                options={[
                  ["all", "Todos os contatos"],
                  ["complete", "Contato completo"],
                  ["incomplete", "Contato incompleto"],
                ]}
              />
              <ClientSelect
                label="Duplicidade"
                value={search.duplicate}
                onValueChange={(value) =>
                  onSearchChange({ duplicate: value as ClientSearch["duplicate"], page: 1 })
                }
                options={[
                  ["all", "Todos"],
                  ["possible", "Possível duplicidade"],
                ]}
              />
              <ClientSelect
                label="Tag"
                value={search.tag || "all"}
                onValueChange={(value) =>
                  onSearchChange({ page: 1, tag: value === "all" ? "" : value })
                }
                options={[
                  ["all", "Todas as tags"],
                  ["frequente", "Frequente"],
                  ["manha", "Manhã"],
                  ["barba", "Barba"],
                ]}
              />
            </div>
          </>
        }
        bodyClassName="min-h-0"
        bodyViewportClassName="flex min-h-full flex-col"
      >
        {query.isLoading ? (
          <div role="status" className="rounded-lg border p-6">
            Carregando clientes…
          </div>
        ) : null}
        {query.isError ? (
          <div role="alert" className="space-y-3 rounded-lg border border-destructive/40 p-6">
            <p>Não foi possível carregar os clientes.</p>
            <Button type="button" variant="outline" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {page && page.items.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={hasFilters ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            description={
              hasFilters
                ? "Revise a busca ou os filtros selecionados."
                : "Crie o primeiro cliente para iniciar o diretório."
            }
          />
        ) : null}
        {page && page.items.length > 0 ? (
          <DataTable
            aria-label="Diretório de clientes"
            className="min-h-[22rem] flex-1"
            footer={
              <DataTablePagination
                page={page.page}
                pageSize={page.pageSize}
                totalCount={page.totalCount}
                totalPages={page.totalPages}
                isLoading={query.isFetching}
                pageSizeOptions={[10, 20, 50]}
                onPageChange={(next) => onSearchChange({ page: next })}
                onPageSizeChange={(next) =>
                  onSearchChange({ page: 1, pageSize: next as 10 | 20 | 50 })
                }
              />
            }
          >
            <DataTableHead>
              <DataTableRow>
                <DataTableSortableHeaderCell
                  sortKey="name"
                  sortedBy={search.sortField}
                  sortDirection={search.sortDirection}
                  onSortChange={updateSort}
                >
                  Cliente
                </DataTableSortableHeaderCell>
                <DataTableHeaderCell>Contato</DataTableHeaderCell>
                <DataTableHeaderCell>Tags</DataTableHeaderCell>
                <DataTableSortableHeaderCell
                  sortKey="lastVisitAt"
                  sortedBy={search.sortField}
                  sortDirection={search.sortDirection}
                  onSortChange={updateSort}
                >
                  Última visita
                </DataTableSortableHeaderCell>
                <DataTableSortableHeaderCell
                  sortKey="nextAppointmentAt"
                  sortedBy={search.sortField}
                  sortDirection={search.sortDirection}
                  onSortChange={updateSort}
                >
                  Próximo agendamento
                </DataTableSortableHeaderCell>
                <DataTableSortableHeaderCell
                  sortKey="createdAt"
                  sortedBy={search.sortField}
                  sortDirection={search.sortDirection}
                  onSortChange={updateSort}
                >
                  Cadastro
                </DataTableSortableHeaderCell>
                <DataTableHeaderCell>Estado</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {page.items.map((client) => (
                <ClientRow
                  client={client}
                  key={client.id}
                  onOpen={() => setSelectedId(client.id)}
                  onContext={(x, y) =>
                    setRowMenu({ anchor: createDataTablePointAnchor(x, y), client })
                  }
                />
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </ModuleLayout>
      <DataTableRowActionsMenu
        isOpen={Boolean(rowMenu)}
        anchor={rowMenu?.anchor}
        onOpenChange={(open) => !open && setRowMenu(null)}
        actions={
          rowMenu
            ? [
                {
                  icon: EyeIcon,
                  label: "Visualizar",
                  onSelect: () => setSelectedId(rowMenu.client.id),
                },
                {
                  icon: rowMenu.client.status === "active" ? ArchiveIcon : RotateCcwIcon,
                  label: rowMenu.client.status === "active" ? "Arquivar" : "Restaurar",
                  variant: rowMenu.client.status === "active" ? "destructive" : "default",
                  onSelect: () => setConfirmingArchive(rowMenu.client),
                },
              ]
            : []
        }
      />
      <ClientProfileDrawer
        clientId={selectedId}
        scenarioId={search.scenario}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onInspectClient={setSelectedId}
      />
      <ActionDrawer
        isOpen={creating}
        onOpenChange={setCreating}
        context="Clientes"
        title="Novo cliente"
        description="Cadastre um cliente apenas nesta sessão."
        size="form"
        secondaryActions={
          <Button type="button" variant="outline" onClick={() => setCreating(false)}>
            Cancelar
          </Button>
        }
        primaryAction={
          <Button
            form="create-client-form"
            type="submit"
            isLoading={createClient.isPending}
            className="hidden sm:inline-flex"
          >
            Salvar
          </Button>
        }
      >
        <ClientForm
          formId="create-client-form"
          isSubmitting={createClient.isPending}
          onCancel={() => setCreating(false)}
          onSubmit={create}
        />
      </ActionDrawer>
      {confirmingArchive ? (
        <ConfirmationDialog
          isOpen
          title={confirmingArchive.status === "active" ? "Arquivar cliente?" : "Restaurar cliente?"}
          description={
            confirmingArchive.status === "active"
              ? "O registro sairá da lista de clientes ativos e poderá ser restaurado."
              : "O registro voltará para a lista de clientes ativos."
          }
          cancelLabel="Cancelar"
          confirmLabel={confirmingArchive.status === "active" ? "Arquivar" : "Restaurar"}
          confirmVariant={confirmingArchive.status === "active" ? "destructive" : "default"}
          onCancel={() => setConfirmingArchive(null)}
          onConfirm={() => toggleArchived(confirmingArchive)}
        />
      ) : null}
    </>
  )
}

function ClientRow({
  client,
  onContext,
  onOpen,
}: {
  client: ClientRecord
  onContext: (x: number, y: number) => void
  onOpen: () => void
}) {
  return (
    <DataTableRow
      data-interactive
      aria-label={`Cliente ${client.name}`}
      tabIndex={0}
      onContextMenu={(event) => {
        event.preventDefault()
        onContext(event.clientX, event.clientY)
      }}
      onKeyDown={(event) => {
        if (event.shiftKey && event.key === "F10") {
          event.preventDefault()
          const rect = event.currentTarget.getBoundingClientRect()
          onContext(rect?.left ?? 0, rect?.top ?? 0)
        }
      }}
    >
      <DataTableCell>
        <button
          type="button"
          className="cursor-pointer rounded font-medium text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onOpen}
        >
          {client.name}
        </button>
      </DataTableCell>
      <DataTableCell>
        <span className="block">
          {client.phone ? applyInputMask("brPhone", client.phone) : "-"}
        </span>
        <span className="block text-xs text-muted-foreground">{client.email || "-"}</span>
      </DataTableCell>
      <DataTableCell>{client.tags.join(", ")}</DataTableCell>
      <DataTableCell>{formatDate(client.lastVisitAt)}</DataTableCell>
      <DataTableCell>{formatDate(client.nextAppointmentAt)}</DataTableCell>
      <DataTableCell>{formatDate(client.createdAt)}</DataTableCell>
      <DataTableCell>
        <StatusBadge tone={client.status === "active" ? "success" : "neutral"}>
          {client.status === "active" ? "Ativo" : "Arquivado"}
        </StatusBadge>
      </DataTableCell>
    </DataTableRow>
  )
}

function ClientSelect({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string
  onValueChange: (value: string) => void
  options: readonly (readonly [string, string])[]
  value: string
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(String(next))}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([option, text]) => (
          <SelectItem key={option} value={option}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(value)) : "-"
}
