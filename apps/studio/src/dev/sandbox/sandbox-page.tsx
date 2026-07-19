import { useQueryClient } from "@tanstack/react-query"
import {
  CircleAlertIcon,
  DatabaseIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { type FormEvent, useRef, useState } from "react"
import { toast } from "sonner"
import { MemoryScenarioEngine } from "@/dev/mock-engine"
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTablePagination,
  DataTableRow,
  DataTableSortableHeaderCell,
  type DataTableSortState,
} from "@/modules/shared/components/data-display/data-table"
import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"
import { Label } from "@/modules/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import { WorkspacePreviewShell } from "@/modules/shared/components/workspace-shell"
import type {
  SandboxListQuery,
  SandboxRecord,
  SandboxRecordInput,
  SandboxRecordState,
  SandboxSort,
} from "./module/contracts"
import { SandboxMemoryRepository } from "./module/memory-repository"
import {
  sandboxQueryKeys,
  useCreateSandboxRecord,
  useDeleteSandboxRecord,
  useSandboxRecords,
  useUpdateSandboxRecord,
} from "./module/queries"
import { SandboxRepositoryProvider } from "./module/repository-context"
import { sandboxScenarios } from "./module/seeds"

type DrawerState =
  | { kind: "create" }
  | { kind: "delete" | "edit" | "view"; record: SandboxRecord }
  | null

export default function SandboxPage() {
  const queryClient = useQueryClient()
  const [engine] = useState(() => new MemoryScenarioEngine(sandboxScenarios, "default"))
  const [repository] = useState(() => new SandboxMemoryRepository(engine))
  const [snapshot, setSnapshot] = useState(engine.snapshot)

  async function refresh() {
    setSnapshot(engine.snapshot)
    await queryClient.invalidateQueries({ queryKey: sandboxQueryKeys.all })
  }

  async function handleScenarioChange(scenarioId: string) {
    engine.selectScenario(scenarioId)
    await refresh()
  }

  async function handleReset() {
    engine.reset()
    await refresh()
    toast.success("Cenário restaurado.")
  }

  return (
    <SandboxRepositoryProvider repository={repository}>
      <WorkspacePreviewShell pathname="/workspace-preview/sandbox">
        <div className="flex h-full min-h-0 flex-col gap-4">
          <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                Ambiente exclusivo de desenvolvimento
              </p>
              <h1 className="text-xl font-semibold tracking-tight">Sandbox de componentes</h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Valida composição, dados locais substituíveis e estados de interface. Os registros
                são sintéticos e não representam um domínio do produto.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1">
                <Label htmlFor="sandbox-scenario">Cenário</Label>
                <Select
                  value={snapshot.scenarioId}
                  onValueChange={(value) => value && handleScenarioChange(value)}
                >
                  <SelectTrigger id="sandbox-scenario" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sandboxScenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={handleReset}>
                <RotateCcwIcon aria-hidden="true" />
                Restaurar cenário
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  engine.failNext()
                  await refresh()
                }}
              >
                <CircleAlertIcon aria-hidden="true" />
                Falhar próxima operação
              </Button>
            </div>
          </header>
          <p className="sr-only" role="status" aria-live="polite">
            Cenário {snapshot.scenarioId}, {snapshot.recordCount} registros, latência de{" "}
            {snapshot.latencyMs}
            milissegundos.
          </p>
          <SandboxRecords scenarioId={snapshot.scenarioId} />
        </div>
      </WorkspacePreviewShell>
    </SandboxRepositoryProvider>
  )
}

function SandboxRecords({ scenarioId }: { scenarioId: string }) {
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<"all" | SandboxRecordState>("all")
  const [sort, setSort] = useState<SandboxSort>({ field: "title", direction: "asc" })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10)
  const [drawer, setDrawer] = useState<DrawerState>(null)

  const query: SandboxListQuery = { page, pageSize, search, sort, state: stateFilter }
  const records = useSandboxRecords(query)
  const createRecord = useCreateSandboxRecord()
  const updateRecord = useUpdateSandboxRecord()
  const deleteRecord = useDeleteSandboxRecord()

  function updateSort(next: DataTableSortState<"title" | "updatedAt">) {
    setPage(1)
    setSort(
      next.key && next.direction
        ? { field: next.key, direction: next.direction }
        : { field: "title", direction: "asc" },
    )
  }

  async function save(input: SandboxRecordInput) {
    if (drawer?.kind === "edit") {
      await updateRecord.mutateAsync({ id: drawer.record.id, input })
      toast.success("Registro atualizado.")
    } else {
      await createRecord.mutateAsync(input)
      toast.success("Registro criado.")
    }
    setDrawer(null)
  }

  async function remove(record: SandboxRecord) {
    await deleteRecord.mutateAsync(record.id)
    setDrawer(null)
    toast.success("Registro excluído.")
  }

  const activeScenario = sandboxScenarios.find((scenario) => scenario.id === scenarioId)

  return (
    <section aria-labelledby="sandbox-records-title" className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-end">
        <div className="grid min-w-0 flex-1 gap-1">
          <Label htmlFor="sandbox-search">Buscar registros</Label>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="absolute top-3 left-3 size-4 text-muted-foreground"
            />
            <Input
              id="sandbox-search"
              className="pl-9"
              placeholder="Título ou resumo"
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="sandbox-state">Estado</Label>
          <Select
            value={stateFilter}
            onValueChange={(value) => {
              setStateFilter(value as "all" | SandboxRecordState)
              setPage(1)
            }}
          >
            <SelectTrigger id="sandbox-state" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={() => setDrawer({ kind: "create" })}>
          <PlusIcon aria-hidden="true" />
          Novo registro
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="sandbox-records-title" className="font-semibold">
            Registros sintéticos
          </h2>
          <p className="text-sm text-muted-foreground">{activeScenario?.description}</p>
        </div>
        {records.isFetching ? (
          <span role="status" className="text-sm text-muted-foreground">
            Atualizando…
          </span>
        ) : null}
      </div>

      {records.isError ? (
        <div
          className="grid min-h-56 place-items-center rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
          role="alert"
        >
          <div className="space-y-3">
            <CircleAlertIcon aria-hidden="true" className="mx-auto size-7 text-destructive" />
            <div>
              <h3 className="font-semibold">Não foi possível carregar</h3>
              <p className="text-sm text-muted-foreground">
                Falha intencional do cenário de desenvolvimento.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => records.refetch()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : records.isPending ? (
        <div className="grid min-h-56 place-items-center rounded-lg border" role="status">
          Carregando registros…
        </div>
      ) : records.data.items.length === 0 ? (
        <EmptyState
          icon={DatabaseIcon}
          title="Nenhum registro encontrado"
          description="Altere os filtros, escolha outro cenário ou crie um registro sintético."
          action={
            <Button type="button" onClick={() => setDrawer({ kind: "create" })}>
              Criar registro
            </Button>
          }
        />
      ) : (
        <DataTable
          aria-label="Registros sintéticos do sandbox"
          className={scenarioId === "dense" ? "max-h-[24rem]" : "min-h-0 flex-1"}
          footer={
            <DataTablePagination
              page={records.data.page}
              pageSize={records.data.pageSize}
              totalCount={records.data.totalCount}
              totalPages={records.data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size as 10 | 20 | 50)
                setPage(1)
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          }
        >
          <DataTableHead>
            <DataTableRow>
              <DataTableSortableHeaderCell
                sortKey="title"
                sortedBy={sort.field}
                sortDirection={sort.direction}
                onSortChange={updateSort}
              >
                Título
              </DataTableSortableHeaderCell>
              <DataTableHeaderCell>Resumo</DataTableHeaderCell>
              <DataTableHeaderCell>Estado</DataTableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="updatedAt"
                sortedBy={sort.field}
                sortDirection={sort.direction}
                onSortChange={updateSort}
              >
                Atualização
              </DataTableSortableHeaderCell>
              <DataTableHeaderCell>
                <span className="sr-only">Ações</span>
              </DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {records.data.items.map((record) => (
              <DataTableRow key={record.id}>
                <DataTableCell>{record.title}</DataTableCell>
                <DataTableCell className="max-w-96">
                  <span className="line-clamp-2">{record.summary}</span>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={record.state === "active" ? "success" : "warning"}>
                    {record.state === "active" ? "Ativo" : "Pausado"}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell>
                  {new Intl.DateTimeFormat("pt-BR").format(new Date(record.updatedAt))}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      aria-label={`Visualizar ${record.title}`}
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDrawer({ kind: "view", record })}
                    >
                      <EyeIcon aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={`Editar ${record.title}`}
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDrawer({ kind: "edit", record })}
                    >
                      <PencilIcon aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={`Excluir ${record.title}`}
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDrawer({ kind: "delete", record })}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      <RecordDrawer
        key={drawer?.kind === "create" ? "create" : (drawer?.record.id ?? "closed")}
        state={drawer}
        isSaving={createRecord.isPending || updateRecord.isPending || deleteRecord.isPending}
        onClose={() => setDrawer(null)}
        onDelete={remove}
        onSave={save}
      />
    </section>
  )
}

function RecordDrawer({
  isSaving,
  onClose,
  onDelete,
  onSave,
  state,
}: {
  isSaving: boolean
  onClose: () => void
  onDelete: (record: SandboxRecord) => Promise<void>
  onSave: (input: SandboxRecordInput) => Promise<void>
  state: DrawerState
}) {
  const record = state && state.kind !== "create" ? state.record : undefined
  if (!state) return null

  if (state.kind === "view") {
    return (
      <ActionDrawer
        isOpen
        onOpenChange={(open) => !open && onClose()}
        context="Registros"
        title="Visualizar registro"
        description="Detalhes do registro sintético."
        secondaryActions={
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        }
      >
        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="font-medium">Título</dt>
            <dd className="text-muted-foreground">{record?.title}</dd>
          </div>
          <div>
            <dt className="font-medium">Resumo</dt>
            <dd className="text-muted-foreground">{record?.summary}</dd>
          </div>
          <div>
            <dt className="font-medium">Estado</dt>
            <dd className="text-muted-foreground">
              {record?.state === "active" ? "Ativo" : "Pausado"}
            </dd>
          </div>
        </dl>
      </ActionDrawer>
    )
  }

  if (state.kind === "delete" && record) {
    return (
      <ActionDrawer
        isOpen
        onOpenChange={(open) => !open && onClose()}
        context="Registros"
        title="Excluir registro"
        description="Esta ação afeta somente a memória local e pode ser desfeita restaurando o cenário."
        secondaryActions={
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        }
        primaryAction={
          <Button variant="destructive" isLoading={isSaving} onClick={() => onDelete(record)}>
            Excluir registro
          </Button>
        }
      >
        <p className="text-sm">
          Confirme a exclusão de <strong>{record.title}</strong>.
        </p>
      </ActionDrawer>
    )
  }

  return <RecordFormDrawer record={record} isSaving={isSaving} onClose={onClose} onSave={onSave} />
}

function RecordFormDrawer({
  record,
  isSaving,
  onClose,
  onSave,
}: {
  record?: SandboxRecord
  isSaving: boolean
  onClose: () => void
  onSave: (input: SandboxRecordInput) => Promise<void>
}) {
  const [title, setTitle] = useState(record?.title ?? "")
  const [summary, setSummary] = useState(record?.summary ?? "")
  const [state, setState] = useState<SandboxRecordState>(record?.state ?? "active")
  const [errors, setErrors] = useState<{ summary?: string; title?: string }>({})
  const titleRef = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = {
      title: title.trim() ? undefined : "Informe um título.",
      summary: summary.trim() ? undefined : "Informe um resumo.",
    }
    setErrors(nextErrors)
    if (nextErrors.title || nextErrors.summary) {
      titleRef.current?.focus()
      return
    }
    await onSave({ title: title.trim(), summary: summary.trim(), state })
  }

  const formId = "sandbox-record-form"
  return (
    <ActionDrawer
      isOpen
      onOpenChange={(open) => !open && onClose()}
      context="Registros"
      title={record ? "Editar registro" : "Novo registro"}
      description="Formulário de desenvolvimento com dados sintéticos."
      secondaryActions={
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      }
      primaryAction={
        <Button type="submit" form={formId} isLoading={isSaving}>
          Salvar registro
        </Button>
      }
    >
      <form id={formId} noValidate className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-1.5">
          <Label htmlFor="record-title">Título</Label>
          <Input
            ref={titleRef}
            id="record-title"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "record-title-error" : undefined}
          />
          {errors.title ? (
            <p id="record-title-error" role="alert" className="text-sm text-destructive">
              {errors.title}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="record-summary">Resumo</Label>
          <Textarea
            id="record-summary"
            value={summary}
            onChange={(event) => setSummary(event.currentTarget.value)}
            aria-invalid={Boolean(errors.summary)}
            aria-describedby={errors.summary ? "record-summary-error" : undefined}
          />
          {errors.summary ? (
            <p id="record-summary-error" role="alert" className="text-sm text-destructive">
              {errors.summary}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="record-state">Estado</Label>
          <Select value={state} onValueChange={(value) => setState(value as SandboxRecordState)}>
            <SelectTrigger id="record-state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>
    </ActionDrawer>
  )
}
