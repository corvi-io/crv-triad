import { useQueryClient } from "@tanstack/react-query"
import {
  ArchiveIcon,
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  ScissorsIcon,
  SearchIcon,
  Undo2Icon,
  UserRoundIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
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
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/card"
import { Input } from "@/modules/shared/components/ui/input"
import { Label } from "@/modules/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { Switch } from "@/modules/shared/components/ui/switch"
import { cn } from "@/modules/shared/lib/utils"
import type {
  SetupAvailability,
  SetupEntity,
  SetupEntityInput,
  SetupEntityKind,
  SetupEntityStatus,
  SetupListQuery,
  SetupProfessional,
  SetupScenarioId,
  SetupSection,
  TimeRange,
  Weekday,
} from "./contracts"
import {
  type EntityDrawerState,
  entityLabels,
  formatMoney,
  SetupEntityDrawer,
} from "./entity-drawer"
import {
  resetSetupQueries,
  useCopySetupAvailabilityToWeekdays,
  useCreateSetupEntity,
  useSetSetupEntityArchived,
  useSetupAvailability,
  useSetupEntities,
  useSetupOverview,
  useUpdateSetupAvailability,
  useUpdateSetupEntity,
} from "./queries"
import { useBarbershopSetupRepository } from "./repository-context"
import type { BarbershopSetupSearch } from "./search"

const sectionItems: ReadonlyArray<{ icon: typeof Building2Icon; id: SetupSection; label: string }> =
  [
    { id: "overview", label: "Visão geral", icon: CheckCircle2Icon },
    { id: "units", label: "Unidades", icon: Building2Icon },
    { id: "professionals", label: "Profissionais", icon: UserRoundIcon },
    { id: "services", label: "Serviços", icon: ScissorsIcon },
    { id: "availability", label: "Disponibilidade", icon: CalendarClockIcon },
  ]

export function BarbershopSetupPage({
  onSearchChange,
  search,
}: {
  onSearchChange: (next: Partial<BarbershopSetupSearch>) => Promise<void> | void
  search: BarbershopSetupSearch
}) {
  const repository = useBarbershopSetupRepository()
  const queryClient = useQueryClient()
  const [isResetOpen, setResetOpen] = useState(false)
  const [overlayEpoch, setOverlayEpoch] = useState(0)
  const [snapshotRevision, setSnapshotRevision] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const snapshot = repository.snapshot(search.scenario)
  void snapshotRevision

  async function switchScenario(scenarioId: SetupScenarioId) {
    await repository.selectScenario(scenarioId)
    await resetSetupQueries(queryClient)
    setOverlayEpoch((value) => value + 1)
    setSnapshotRevision((value) => value + 1)
    await onSearchChange({ scenario: scenarioId })
    headingRef.current?.focus()
  }

  async function resetScenario() {
    await repository.reset()
    await resetSetupQueries(queryClient)
    setResetOpen(false)
    setOverlayEpoch((value) => value + 1)
    setSnapshotRevision((value) => value + 1)
    toast.success("Cenário restaurado por completo.")
    headingRef.current?.focus()
  }

  const activeScenario = repository.scenarios().find(({ id }) => id === search.scenario)
  return (
    <ModuleLayout
      head={
        <div className="flex flex-col gap-3">
          <PageHeader
            title="Configuração da barbearia"
            description="Protótipo visual local para validar catálogos, vínculos e disponibilidade."
            actions={
              <Button type="button" variant="outline" onClick={() => setResetOpen(true)}>
                <RotateCcwIcon aria-hidden="true" />
                Restaurar cenário
              </Button>
            }
          />
          <div className="rounded-lg border bg-card p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid min-w-0 gap-1">
                <Label htmlFor="setup-scenario">Cenário de apresentação</Label>
                <Select
                  value={search.scenario}
                  onValueChange={(value) => value && switchScenario(value as SetupScenarioId)}
                >
                  <SelectTrigger id="setup-scenario" className="w-full sm:w-64">
                    <SelectValue>{activeScenario?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {repository.scenarios().map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {activeScenario?.description}
              </p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
              Ferramenta exclusiva de desenvolvimento · {snapshot.unitCount} unidades ·{" "}
              {snapshot.professionalCount} profissionais · {snapshot.serviceCount} serviços ·
              latência {snapshot.latencyMs} ms · falha {failureLabel(snapshot.failureMode)}
            </p>
          </div>
          <nav aria-label="Seções da configuração" className="overflow-x-auto">
            <ul className="flex min-w-max gap-1 border-b">
              {sectionItems.map(({ icon: Icon, id, label }) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={search.section === id ? "page" : undefined}
                    className={cn(
                      "inline-flex h-10 cursor-pointer items-center gap-2 border-b-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      search.section === id
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => onSearchChange({ section: id })}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      }
      bodyViewportClassName="space-y-4"
    >
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {sectionItems.find(({ id }) => id === search.section)?.label}
      </h2>
      <div key={`${search.scenario}-${overlayEpoch}`}>
        <SetupSectionContent
          search={search}
          onSectionChange={(section) => onSearchChange({ section })}
        />
      </div>
      <ConfirmationDialog
        isOpen={isResetOpen}
        title="Restaurar todo o cenário?"
        description="Todas as alterações locais, rascunhos, seleções, falhas pendentes e consultas desta apresentação serão descartadas."
        cancelLabel="Manter alterações"
        confirmLabel="Restaurar cenário"
        onCancel={() => setResetOpen(false)}
        onConfirm={resetScenario}
      />
    </ModuleLayout>
  )
}

function SetupSectionContent({
  search,
  onSectionChange,
}: {
  search: BarbershopSetupSearch
  onSectionChange: (section: SetupSection) => void
}) {
  switch (search.section) {
    case "overview":
      return <OverviewSection scenarioId={search.scenario} onSectionChange={onSectionChange} />
    case "units":
      return <EntitySection kind="unit" scenarioId={search.scenario} />
    case "professionals":
      return <EntitySection kind="professional" scenarioId={search.scenario} />
    case "services":
      return <EntitySection kind="service" scenarioId={search.scenario} />
    case "availability":
      return <AvailabilitySection scenarioId={search.scenario} />
  }
}

function OverviewSection({
  scenarioId,
  onSectionChange,
}: {
  scenarioId: SetupScenarioId
  onSectionChange: (section: SetupSection) => void
}) {
  const overview = useSetupOverview(scenarioId)
  if (overview.isPending) return <LoadingCards label="Carregando visão geral…" />
  if (overview.isError)
    return (
      <ErrorState
        title="Não foi possível carregar a visão geral"
        onRetry={() => overview.refetch()}
      />
    )
  return (
    <section aria-labelledby="overview-title" className="grid gap-4">
      <div>
        <h2 id="overview-title" className="text-lg font-semibold">
          Visão geral da configuração
        </h2>
        <p className="text-sm text-muted-foreground">
          {overview.data.completedCount} de {overview.data.totalCount} etapas visuais completas.
          Isto não representa prontidão de produção.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {overview.data.items.map((item) => (
          <Card key={item.section}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
              <CardAction>
                <StatusBadge tone={item.complete ? "success" : "warning"}>
                  {item.complete ? "Completa" : "Pendente"}
                </StatusBadge>
              </CardAction>
            </CardHeader>
            <CardFooter className="justify-end">
              <Button type="button" variant="outline" onClick={() => onSectionChange(item.section)}>
                {item.complete ? "Revisar" : "Configurar"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
}

type RowMenuState = {
  anchor: ReturnType<typeof createDataTablePointAnchor>
  entity: SetupEntity
  trigger: HTMLTableRowElement
} | null

function EntitySection({
  kind,
  scenarioId,
}: {
  kind: SetupEntityKind
  scenarioId: SetupScenarioId
}) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | SetupEntityStatus>("all")
  const [sort, setSort] = useState<SetupListQuery["sort"]>({ field: "name", direction: "asc" })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10)
  const [drawer, setDrawer] = useState<EntityDrawerState>(null)
  const [rowMenu, setRowMenu] = useState<RowMenuState>(null)
  const [archiveTarget, setArchiveTarget] = useState<SetupEntity | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const query = { kind, page, pageSize, scenarioId, search, sort, status } satisfies SetupListQuery
  const entities = useSetupEntities(query)
  const relations = useSetupAvailability({ scenarioId })
  const createEntity = useCreateSetupEntity()
  const updateEntity = useUpdateSetupEntity()
  const setArchived = useSetSetupEntityArchived()

  function closeDrawer() {
    setDrawer(null)
  }

  function restoreDrawerFocus() {
    returnFocusRef.current?.focus()
  }

  async function save(entityKind: SetupEntityKind, input: SetupEntityInput) {
    try {
      if (drawer?.kind === "edit")
        await updateEntity.mutateAsync({ id: drawer.entity.id, input, kind: entityKind })
      else await createEntity.mutateAsync({ input, kind: entityKind })
      toast.success(drawer?.kind === "edit" ? "Registro atualizado." : "Registro criado.")
      closeDrawer()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return
    try {
      const archived = archiveTarget.status === "active"
      await setArchived.mutateAsync({ archived, id: archiveTarget.id, kind })
      toast.success(archived ? "Registro arquivado." : "Registro restaurado.")
      setArchiveTarget(null)
    } catch (error) {
      toast.error(errorMessage(error))
      setArchiveTarget(null)
    }
  }

  function updateSort(next: DataTableSortState<"name" | "status">) {
    setPage(1)
    setSort(
      next.key && next.direction
        ? { field: next.key, direction: next.direction }
        : { field: "name", direction: "asc" },
    )
  }

  function openMenu(entity: SetupEntity, trigger: HTMLTableRowElement, x: number, y: number) {
    setRowMenu({ anchor: createDataTablePointAnchor(x, y), entity, trigger })
  }

  function closeMenu() {
    const trigger = rowMenu?.trigger
    setRowMenu(null)
    trigger?.focus()
  }

  const relationData = relations.data ?? {
    units: [],
    professionals: [],
    services: [],
    records: [],
    conflicts: [],
  }
  const labels = entityLabels[kind]
  return (
    <section aria-labelledby={`${kind}-title`} className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id={`${kind}-title`} className="text-lg font-semibold">
            {labels.plural}
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie registros sintéticos e seus vínculos somente em memória.
          </p>
        </div>
        <Button
          type="button"
          onClick={(event) => {
            returnFocusRef.current = event.currentTarget
            setDrawer({ kind: "create", entityKind: kind })
          }}
        >
          <PlusIcon aria-hidden="true" />
          {labels.newLabel}
        </Button>
      </div>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-end">
        <div className="grid min-w-0 flex-1 gap-1">
          <Label htmlFor={`${kind}-search`}>Buscar</Label>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="absolute top-3 left-3 size-4 text-muted-foreground"
            />
            <Input
              id={`${kind}-search`}
              className="pl-9"
              value={search}
              placeholder="Nome ou detalhe"
              onChange={(event) => {
                setSearch(event.currentTarget.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${kind}-status`}>Estado</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as typeof status)
              setPage(1)
            }}
          >
            <SelectTrigger id={`${kind}-status`} className="w-full sm:w-44">
              <SelectValue>
                {status === "all" ? "Todos" : status === "active" ? "Ativos" : "Arquivados"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="archived">Arquivados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {entities.isPending ? (
        <LoadingTable />
      ) : entities.isError ? (
        <ErrorState
          title={`Não foi possível carregar ${labels.plural.toLocaleLowerCase("pt-BR")}`}
          onRetry={() => entities.refetch()}
        />
      ) : entities.data.items.length === 0 ? (
        <EmptyState
          icon={
            kind === "unit" ? Building2Icon : kind === "professional" ? UserRoundIcon : ScissorsIcon
          }
          title={
            search || status !== "all" ? "Nenhum resultado para os filtros" : labels.emptyLabel
          }
          description={
            search || status !== "all"
              ? "Altere a busca ou o estado para ver outros registros."
              : "Crie o primeiro registro sintético para continuar a apresentação."
          }
          action={
            <Button
              type="button"
              onClick={(event) => {
                returnFocusRef.current = event.currentTarget
                setDrawer({ kind: "create", entityKind: kind })
              }}
            >
              Criar {labels.singular}
            </Button>
          }
        />
      ) : (
        <DataTable
          aria-label={`${labels.plural} da configuração`}
          className="min-h-80"
          footer={
            <DataTablePagination
              page={entities.data.page}
              pageSize={entities.data.pageSize}
              totalCount={entities.data.totalCount}
              totalPages={entities.data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value as 10 | 20 | 50)
                setPage(1)
              }}
              pageSizeOptions={[10, 20, 50]}
            />
          }
        >
          <DataTableHead>
            <DataTableRow>
              <DataTableSortableHeaderCell
                sortKey="name"
                sortedBy={sort.field}
                sortDirection={sort.direction}
                onSortChange={updateSort}
              >
                Nome
              </DataTableSortableHeaderCell>
              <DataTableHeaderCell>Detalhes</DataTableHeaderCell>
              <DataTableHeaderCell>Vínculos</DataTableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="status"
                sortedBy={sort.field}
                sortDirection={sort.direction}
                onSortChange={updateSort}
              >
                Estado
              </DataTableSortableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {entities.data.items.map((entity) => (
              <DataTableRow
                key={entity.id}
                tabIndex={0}
                aria-haspopup="menu"
                data-interactive="true"
                onContextMenu={(event) => {
                  event.preventDefault()
                  openMenu(entity, event.currentTarget, event.clientX, event.clientY)
                }}
                onKeyDown={(event) => {
                  if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                    event.preventDefault()
                    const bounds = event.currentTarget.getBoundingClientRect()
                    openMenu(
                      entity,
                      event.currentTarget,
                      bounds.right - 8,
                      bounds.top + bounds.height / 2,
                    )
                  }
                }}
              >
                <DataTableCell>
                  <button
                    type="button"
                    className="cursor-pointer font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={(event) => {
                      returnFocusRef.current = event.currentTarget
                      setDrawer({ kind: "view", entity })
                    }}
                  >
                    {entity.name}
                  </button>
                </DataTableCell>
                <DataTableCell className="max-w-96">
                  <span className="line-clamp-2">{entityDetail(entity)}</span>
                </DataTableCell>
                <DataTableCell>{entityRelationships(entity)}</DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={entity.status === "active" ? "success" : "neutral"}>
                    {entity.status === "active" ? "Ativo" : "Arquivado"}
                  </StatusBadge>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
      <DataTableRowActionsMenu
        isOpen={rowMenu !== null}
        anchor={rowMenu?.anchor}
        onOpenChange={(open) => !open && closeMenu()}
        actions={
          rowMenu
            ? [
                {
                  icon: EyeIcon,
                  label: "Visualizar",
                  onSelect: () => {
                    returnFocusRef.current = rowMenu.trigger
                    const entity = rowMenu.entity
                    closeMenu()
                    setDrawer({ kind: "view", entity })
                  },
                },
                {
                  icon: PencilIcon,
                  label: "Editar",
                  disabled: rowMenu.entity.status === "archived",
                  onSelect: () => {
                    returnFocusRef.current = rowMenu.trigger
                    const entity = rowMenu.entity
                    closeMenu()
                    setDrawer({ kind: "edit", entity })
                  },
                },
                {
                  icon: rowMenu.entity.status === "active" ? ArchiveIcon : Undo2Icon,
                  label: rowMenu.entity.status === "active" ? "Arquivar" : "Restaurar",
                  variant: rowMenu.entity.status === "active" ? "destructive" : "default",
                  onSelect: () => {
                    const entity = rowMenu.entity
                    closeMenu()
                    setArchiveTarget(entity)
                  },
                },
              ]
            : []
        }
      />
      <SetupEntityDrawer
        state={drawer}
        isSaving={createEntity.isPending || updateEntity.isPending}
        onClose={closeDrawer}
        onCloseComplete={restoreDrawerFocus}
        onSave={save}
        units={relationData.units}
        professionals={relationData.professionals}
        services={relationData.services}
      />
      <ConfirmationDialog
        isOpen={archiveTarget !== null}
        title={
          archiveTarget?.status === "active"
            ? "Arquivar este registro?"
            : "Restaurar este registro?"
        }
        description={
          archiveTarget?.status === "active"
            ? "Vínculos ativos bloquearão a ação para evitar registros órfãos."
            : "O registro voltará a aparecer como ativo nesta apresentação."
        }
        cancelLabel="Cancelar"
        confirmLabel={archiveTarget?.status === "active" ? "Arquivar" : "Restaurar"}
        confirmVariant={archiveTarget?.status === "active" ? "destructive" : "default"}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />
    </section>
  )
}

function AvailabilitySection({ scenarioId }: { scenarioId: SetupScenarioId }) {
  const availability = useSetupAvailability({ scenarioId })
  const copyAvailability = useCopySetupAvailabilityToWeekdays()
  const updateAvailability = useUpdateSetupAvailability()
  const [professionalId, setProfessionalId] = useState<string>()
  const [unitId, setUnitId] = useState<string>()
  if (availability.isPending) return <LoadingCards label="Carregando disponibilidade…" />
  if (availability.isError)
    return (
      <ErrorState
        title="Não foi possível carregar a disponibilidade"
        onRetry={() => availability.refetch()}
      />
    )
  if (availability.data.professionals.length === 0 || availability.data.units.length === 0)
    return (
      <EmptyState
        icon={CalendarClockIcon}
        title="Disponibilidade ainda não configurável"
        description="Adicione uma unidade e um profissional antes de definir horários."
      />
    )
  const selectedProfessional =
    availability.data.professionals.find(({ id }) => id === professionalId) ??
    availability.data.professionals[0]
  const selectedUnitId =
    unitId && selectedProfessional.unitIds.includes(unitId)
      ? unitId
      : (selectedProfessional.unitIds[0] ?? availability.data.units[0].id)
  const records = availability.data.records.filter(
    (record) =>
      record.professionalId === selectedProfessional.id && record.unitId === selectedUnitId,
  )

  async function save(record: SetupAvailability) {
    try {
      await updateAvailability.mutateAsync(record)
      toast.success("Disponibilidade atualizada.")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function copyWeekdays(source: SetupAvailability) {
    try {
      const targets = records.filter(
        ({ day }) => day !== source.day && day !== "saturday" && day !== "sunday",
      )
      await copyAvailability.mutateAsync({
        source,
        targetIds: targets.map(({ id }) => id),
      })
      toast.success("Horários copiados para os dias úteis.")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <section aria-labelledby="availability-title" className="grid gap-4">
      <div>
        <h2 id="availability-title" className="text-lg font-semibold">
          Disponibilidade semanal
        </h2>
        <p className="text-sm text-muted-foreground">
          Edição por controles explícitos, sem depender de arrastar.
        </p>
      </div>
      <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="availability-professional">Profissional</Label>
          <Select
            value={selectedProfessional.id}
            onValueChange={(value) => {
              setProfessionalId(value ?? undefined)
              setUnitId(undefined)
            }}
          >
            <SelectTrigger id="availability-professional">
              <SelectValue>{selectedProfessional.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availability.data.professionals.map((professional) => (
                <SelectItem key={professional.id} value={professional.id}>
                  {professional.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="availability-unit">Unidade</Label>
          <Select value={selectedUnitId} onValueChange={(value) => setUnitId(value ?? undefined)}>
            <SelectTrigger id="availability-unit">
              <SelectValue>
                {availability.data.units.find(({ id }) => id === selectedUnitId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availability.data.units
                .filter(({ id }) => selectedProfessional.unitIds.includes(id))
                .map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {availability.data.conflicts.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-feedback-destructive-border bg-feedback-destructive p-4 text-feedback-destructive-foreground"
        >
          <div className="flex items-center gap-2 font-medium">
            <CircleAlertIcon aria-hidden="true" className="size-5" />
            Conflitos encontrados
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {availability.data.conflicts.map((conflict) => (
              <li key={conflict}>{conflict}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {records.length === 0 ? (
        <EmptyState
          icon={CalendarClockIcon}
          title="Nenhuma semana cadastrada"
          description="Escolha outro vínculo ou restaure o cenário para recuperar a agenda sintética."
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {records.map((record) => (
            <AvailabilityDayCard
              key={record.id}
              record={record}
              isSaving={updateAvailability.isPending || copyAvailability.isPending}
              onSave={save}
              onCopy={copyWeekdays}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function AvailabilityDayCard({
  record,
  isSaving,
  onCopy,
  onSave,
}: {
  record: SetupAvailability
  isSaving: boolean
  onCopy: (record: SetupAvailability) => Promise<void>
  onSave: (record: SetupAvailability) => Promise<void>
}) {
  const [draft, setDraft] = useState(() => availabilityDraft(record))
  const previousRecordRef = useRef(record)

  useEffect(() => {
    setDraft((current) => {
      const previousRecord = previousRecordRef.current
      previousRecordRef.current = record
      return availabilityDraftMatches(current, previousRecord) ? availabilityDraft(record) : current
    })
  }, [record])

  const next = (): SetupAvailability => ({
    ...record,
    closed: draft.closed,
    periods: draft.closed ? [] : draft.periods,
    breaks: draft.closed ? [] : draft.breaks,
    timeOff: draft.timeOff.trim() || undefined,
  })
  const titleId = `${record.id}-title`
  return (
    <Card role="group" aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId}>{weekdayLabels[record.day]}</CardTitle>
        <CardDescription>
          {draft.timeOff ||
            (draft.closed
              ? "Fechado"
              : `${draft.periods.length} período(s) · ${draft.breaks.length} pausa(s)`)}
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Label htmlFor={`${record.id}-closed`}>Fechado</Label>
            <Switch
              id={`${record.id}-closed`}
              checked={draft.closed}
              onCheckedChange={(closed) => setDraft((current) => ({ ...current, closed }))}
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <RangeEditor
          id={`${record.id}-period`}
          label="Períodos de trabalho"
          ranges={draft.periods}
          disabled={draft.closed}
          onChange={(periods) => setDraft((current) => ({ ...current, periods }))}
          emptyRange={{ start: "09:00", end: "18:00" }}
        />
        <RangeEditor
          id={`${record.id}-break`}
          label="Pausas"
          ranges={draft.breaks}
          disabled={draft.closed}
          onChange={(breaks) => setDraft((current) => ({ ...current, breaks }))}
          emptyRange={{ start: "12:00", end: "13:00" }}
        />
        <div className="grid gap-1">
          <Label htmlFor={`${record.id}-time-off`}>Ausência ou observação (opcional)</Label>
          <Input
            id={`${record.id}-time-off`}
            value={draft.timeOff}
            disabled={draft.closed}
            placeholder="Ex.: ausência sintética das 14:00 às 16:00"
            onChange={(event) =>
              setDraft((current) => ({ ...current, timeOff: event.currentTarget.value }))
            }
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={record.day === "sunday" || isSaving}
          onClick={() => onCopy(next())}
        >
          Copiar para dias úteis
        </Button>
        <Button type="button" isLoading={isSaving} onClick={() => onSave(next())}>
          Salvar dia
        </Button>
      </CardFooter>
    </Card>
  )
}

type AvailabilityDraft = {
  breaks: readonly TimeRange[]
  closed: boolean
  periods: readonly TimeRange[]
  timeOff: string
}

function availabilityDraft(record: SetupAvailability): AvailabilityDraft {
  return {
    breaks: structuredClone(record.breaks),
    closed: record.closed,
    periods: structuredClone(record.periods),
    timeOff: record.timeOff ?? "",
  }
}

function availabilityDraftMatches(draft: AvailabilityDraft, record: SetupAvailability) {
  return (
    draft.closed === record.closed &&
    draft.timeOff === (record.timeOff ?? "") &&
    JSON.stringify(draft.periods) === JSON.stringify(record.periods) &&
    JSON.stringify(draft.breaks) === JSON.stringify(record.breaks)
  )
}

function RangeEditor({
  disabled,
  emptyRange,
  id,
  label,
  onChange,
  ranges,
}: {
  disabled: boolean
  emptyRange: TimeRange
  id: string
  label: string
  onChange: (ranges: readonly TimeRange[]) => void
  ranges: readonly TimeRange[]
}) {
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="text-sm font-medium">{label}</legend>
      {ranges.map((range, index) => (
        <div
          key={`${id}-${range.start}-${range.end}`}
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <TimeInput
            id={`${id}-${index}-start`}
            label="Início"
            value={range.start}
            disabled={disabled}
            onChange={(value) =>
              onChange(
                ranges.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, start: value } : item,
                ),
              )
            }
          />
          <TimeInput
            id={`${id}-${index}-end`}
            label="Fim"
            value={range.end}
            disabled={disabled}
            onChange={(value) =>
              onChange(
                ranges.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, end: value } : item,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(ranges.filter((_, itemIndex) => itemIndex !== index))}
          >
            Remover
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        disabled={disabled}
        onClick={() => onChange([...ranges, emptyRange])}
      >
        Adicionar {label === "Pausas" ? "pausa" : "período"}
      </Button>
    </fieldset>
  )
}

function TimeInput({
  disabled,
  id,
  label,
  onChange,
  value,
}: {
  disabled: boolean
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="time"
        step={900}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </div>
  )
}

function ErrorState({ onRetry, title }: { onRetry: () => void; title: string }) {
  return (
    <div
      role="alert"
      className="grid min-h-56 place-items-center rounded-lg border border-feedback-destructive-border bg-feedback-destructive p-6 text-center"
    >
      <div className="grid max-w-md gap-3">
        <CircleAlertIcon aria-hidden="true" className="mx-auto size-7" />
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm">
          Falha controlada desta apresentação local. Tente novamente ou troque o cenário.
        </p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}

function LoadingCards({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-3 md:grid-cols-2">
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

function LoadingTable() {
  return (
    <div
      role="status"
      aria-label="Carregando registros"
      className="grid gap-2 rounded-lg border p-4"
    >
      <Skeleton className="h-10" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  )
}

function entityDetail(entity: SetupEntity) {
  if (entity.kind === "unit") return `${entity.code} · ${entity.address}`
  if (entity.kind === "professional")
    return `${entity.role} · ${accountAccessLabel(entity.accountAccess)}`
  return `${entity.category} · ${entity.durationMinutes} min · ${formatMoney(entity.priceCents)}`
}

function entityRelationships(entity: SetupEntity) {
  if (entity.kind === "unit") return "Horários e catálogos"
  if (entity.kind === "professional")
    return `${entity.unitIds.length} unidade(s) · ${entity.serviceIds.length} serviço(s)`
  return `${entity.unitIds.length} unidade(s) · ${entity.professionalIds.length} profissional(is)`
}

function accountAccessLabel(value: SetupProfessional["accountAccess"]) {
  return value === "connected"
    ? "Acesso conectado (visual)"
    : value === "invited"
      ? "Convite pendente (visual)"
      : "Sem acesso configurado"
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a ação."
}

function failureLabel(mode: "always" | "never" | "next") {
  return mode === "always" ? "persistente" : mode === "next" ? "na próxima mutação" : "desativada"
}

const weekdayLabels: Record<Weekday, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
}

export { sectionItems }
