import {
  ArchiveIcon,
  ContactIcon,
  CopyCheckIcon,
  Edit3Icon,
  EyeIcon,
  PlusIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react"
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
import { SingleSelectListFilter } from "@/modules/shared/components/data-display/list-filter"
import { ListSearchField } from "@/modules/shared/components/data-display/list-search-field"
import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Button } from "@/modules/shared/components/ui/button"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { applyInputMask } from "@/modules/shared/lib/input-masks"
import { ClientEditDrawer } from "./client-edit-drawer"
import { ClientForm } from "./client-form"
import { ClientProfileDrawer } from "./client-profile-drawer"
import type { ClientInput, ClientRecord } from "./contracts"
import { useClients, useClientTags, useCreateClient, useSetClientArchived } from "./queries"
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
  const tagsQuery = useClientTags(search.scenario)
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
      openClient(created)
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
    search.status !== "active" ||
    search.contact !== "all" ||
    search.duplicate !== "all" ||
    Boolean(search.tag) ||
    searchText
  const page = query.data
  const selectedId = search.client && search.mode !== "edit" ? search.client : null
  const editingId = search.client && search.mode === "edit" ? search.client : null

  function openClient(client: ClientRecord | string, mode: "edit" | "view" = "view") {
    onSearchChange({
      client: typeof client === "string" ? client : client.id,
      mode: mode === "edit" ? "edit" : undefined,
    })
  }

  function closeClient() {
    onSearchChange({ client: undefined, mode: undefined })
  }

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
            <fieldset className="flex min-w-0 items-center gap-1.5 overflow-x-auto rounded-lg border bg-card p-2">
              <legend className="sr-only">Busca e filtros de clientes</legend>
              <ListSearchField
                id="client-directory-search"
                aria-label="Buscar clientes"
                placeholder="Buscar por nome, telefone ou e-mail"
                value={searchText}
                onChange={(event) => setSearchText(event.currentTarget.value)}
              />
              <SingleSelectListFilter
                icon={SlidersHorizontalIcon}
                id="client-status-filter"
                inactiveValue="active"
                label="Estado"
                value={search.status}
                onValueChange={(value) => onSearchChange({ page: 1, status: value })}
                options={[
                  { label: "Ativos", value: "active" },
                  { label: "Arquivados", value: "archived" },
                ]}
              />
              <SingleSelectListFilter
                icon={ContactIcon}
                id="client-contact-filter"
                inactiveValue="all"
                label="Contato"
                value={search.contact}
                onValueChange={(value) => onSearchChange({ contact: value, page: 1 })}
                options={[
                  { label: "Todos os contatos", value: "all" },
                  { label: "Contato completo", value: "complete" },
                  { label: "Contato incompleto", value: "incomplete" },
                ]}
              />
              <SingleSelectListFilter
                icon={CopyCheckIcon}
                id="client-duplicate-filter"
                inactiveValue="all"
                label="Duplicidade"
                value={search.duplicate}
                onValueChange={(value) => onSearchChange({ duplicate: value, page: 1 })}
                options={[
                  { label: "Todos", value: "all" },
                  { label: "Possível duplicidade", value: "possible" },
                ]}
              />
              <SingleSelectListFilter
                icon={TagsIcon}
                id="client-tag-filter"
                inactiveValue="all"
                label="Tag"
                value={search.tag || "all"}
                onValueChange={(value) =>
                  onSearchChange({ page: 1, tag: value === "all" ? "" : value })
                }
                options={[
                  { label: "Todas as tags", value: "all" },
                  ...(tagsQuery.data ?? []).map((tag) => ({
                    label: formatTagLabel(tag),
                    value: tag,
                  })),
                ]}
              />
            </fieldset>
          </>
        }
        bodyClassName="min-h-0"
        bodyViewportClassName="flex min-h-full flex-col"
      >
        {query.isLoading ? <ClientDirectorySkeleton /> : null}
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
                  onOpen={() => openClient(client)}
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
                  onSelect: () => openClient(rowMenu.client),
                },
                {
                  icon: Edit3Icon,
                  label: "Editar",
                  onSelect: () => openClient(rowMenu.client, "edit"),
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
        onOpenChange={(open) => !open && closeClient()}
        onEditClient={(id) => openClient(id, "edit")}
        onInspectClient={(id) => openClient(id)}
      />
      <ClientEditDrawer
        clientId={editingId}
        scenarioId={search.scenario}
        onOpenChange={(open) => !open && closeClient()}
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

function ClientDirectorySkeleton() {
  const columns = ["client", "contact", "tags", "last", "next", "created", "status"] as const
  const rows = ["one", "two", "three", "four", "five", "six"] as const
  return (
    <div
      aria-label="Carregando clientes"
      className="flex min-h-[22rem] flex-1 flex-col"
      role="status"
    >
      <div className="grid grid-cols-7 gap-4 border-b px-4 py-3">
        {columns.map((column) => (
          <Skeleton className="h-4 w-full max-w-28" key={column} />
        ))}
      </div>
      {rows.map((row) => (
        <div className="grid grid-cols-7 gap-4 border-b px-4 py-4" key={row}>
          {columns.map((column) => (
            <Skeleton
              className={column === "client" ? "h-5 w-32" : "h-4 w-full max-w-24"}
              key={column}
            />
          ))}
        </div>
      ))}
    </div>
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

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(value)) : "-"
}

function formatTagLabel(value: string) {
  return value ? `${value[0]?.toLocaleUpperCase("pt-BR")}${value.slice(1)}` : value
}
