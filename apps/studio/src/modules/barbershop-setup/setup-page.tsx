import {
  ArchiveIcon,
  ArrowRightIcon,
  Building2Icon,
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  ScissorsIcon,
  SlidersHorizontalIcon,
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
import { SingleSelectListFilter } from "@/modules/shared/components/data-display/list-filter"
import { ListSearchField } from "@/modules/shared/components/data-display/list-search-field"
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
} from "@/modules/shared/components/ui/card"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { cn } from "@/modules/shared/lib/utils"
import { AvailabilityCalendar } from "./availability-calendar"
import { BusinessProfileSection, PaymentsSection } from "./completion-sections"
import type {
  SetupEntity,
  SetupEntityInput,
  SetupEntityKind,
  SetupEntityStatus,
  SetupListQuery,
  SetupScenarioId,
  SetupSection,
} from "./contracts"
import {
  SetupDependencyError,
  SetupOperationInvalidatedError,
  SetupValidationError,
} from "./contracts"
import {
  type EntityDrawerState,
  entityLabels,
  formatMoney,
  SetupEntityDrawer,
} from "./entity-drawer"
import {
  useCreateSetupEntity,
  useSetSetupEntityArchived,
  useSetupAvailability,
  useSetupCompletion,
  useSetupEntities,
  useUpdateSetupEntity,
} from "./queries"
import { useBarbershopSetupRepository } from "./repository-context"
import type { BarbershopSetupSearch } from "./search"

const sectionItems: ReadonlyArray<{ icon: typeof Building2Icon; id: SetupSection; label: string }> =
  [
    { id: "overview", label: "Visão geral", icon: CheckCircle2Icon },
    { id: "business", label: "Dados", icon: Building2Icon },
    { id: "units", label: "Unidades", icon: Building2Icon },
    { id: "professionals", label: "Profissionais", icon: UserRoundIcon },
    { id: "services", label: "Serviços", icon: ScissorsIcon },
    { id: "payments", label: "Pagamentos", icon: ReceiptTextIcon },
    { id: "availability", label: "Disponibilidade", icon: CalendarClockIcon },
  ]

const sectionHeaders: Record<SetupSection, { description: string; title: string }> = {
  overview: {
    title: "Configuração da barbearia",
    description: "Acompanhe o preparo dos catálogos essenciais para a operação.",
  },
  business: {
    title: "Dados da barbearia",
    description: "Mantenha as informações gerais e o contato principal da barbearia.",
  },
  units: {
    title: "Unidades",
    description: "Gerencie endereços, códigos e horários de funcionamento.",
  },
  professionals: {
    title: "Profissionais",
    description: "Gerencie a equipe, os vínculos e as permissões operacionais.",
  },
  services: {
    title: "Serviços",
    description: "Gerencie preços, duração e disponibilidade do catálogo.",
  },
  payments: {
    title: "Pagamentos",
    description: "Configure formas de pagamento e regras de comissão.",
  },
  availability: {
    title: "Disponibilidade",
    description: "Defina os períodos disponíveis para atendimento.",
  },
}

function sectionToEntityKind(section: SetupSection): SetupEntityKind | undefined {
  if (section === "units") return "unit"
  if (section === "professionals") return "professional"
  if (section === "services") return "service"
  return undefined
}

export function BarbershopSetupPage({
  onSearchChange,
  search,
}: {
  onSearchChange: (next: Partial<BarbershopSetupSearch>) => Promise<void> | void
  search: BarbershopSetupSearch
}) {
  const header = sectionHeaders[search.section]
  const [createRequest, setCreateRequest] = useState<{
    kind: SetupEntityKind
    trigger: HTMLButtonElement
  } | null>(null)
  const entityKind = sectionToEntityKind(search.section)
  return (
    <ModuleLayout
      head={
        <div className="flex flex-col gap-3">
          <PageHeader
            title={header.title}
            description={header.description}
            actions={
              entityKind ? (
                <Button
                  type="button"
                  onClick={(event) =>
                    setCreateRequest({ kind: entityKind, trigger: event.currentTarget })
                  }
                >
                  <PlusIcon aria-hidden="true" />
                  {entityLabels[entityKind].newLabel}
                </Button>
              ) : undefined
            }
          />
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
      bodyViewportClassName="h-full min-h-0"
    >
      <div key={search.scenario} className="h-full min-h-0">
        <SetupSectionContent
          search={search}
          createRequest={createRequest}
          onCreateRequestHandled={() => setCreateRequest(null)}
          onSectionChange={(section) => onSearchChange({ section })}
          onSearchChange={onSearchChange}
        />
      </div>
    </ModuleLayout>
  )
}

function SetupSectionContent({
  createRequest,
  onCreateRequestHandled,
  search,
  onSectionChange,
  onSearchChange,
}: {
  createRequest: { kind: SetupEntityKind; trigger: HTMLButtonElement } | null
  onCreateRequestHandled: () => void
  search: BarbershopSetupSearch
  onSectionChange: (section: SetupSection) => void
  onSearchChange: (next: Partial<BarbershopSetupSearch>) => Promise<void> | void
}) {
  const repository = useBarbershopSetupRepository()
  const usesHttpCatalogs = repository.catalogSource === "http"
  switch (search.section) {
    case "overview":
      return <OverviewSection scenarioId={search.scenario} onSectionChange={onSectionChange} />
    case "business":
      return usesHttpCatalogs ? (
        <UnavailableSetupSection
          title="Dados da barbearia"
          description="A edição dos dados gerais ainda não possui persistência de produção. Unidades, profissionais e serviços continuam disponíveis nas respectivas abas."
        />
      ) : (
        <BusinessProfileSection scenarioId={search.scenario} />
      )
    case "units":
      return (
        <EntitySection
          createRequest={createRequest}
          kind="unit"
          scenarioId={search.scenario}
          onCreateRequestHandled={onCreateRequestHandled}
        />
      )
    case "professionals":
      return (
        <EntitySection
          createRequest={createRequest}
          kind="professional"
          scenarioId={search.scenario}
          onCreateRequestHandled={onCreateRequestHandled}
        />
      )
    case "services":
      return (
        <EntitySection
          createRequest={createRequest}
          kind="service"
          scenarioId={search.scenario}
          onCreateRequestHandled={onCreateRequestHandled}
        />
      )
    case "payments":
      return usesHttpCatalogs ? (
        <UnavailableSetupSection
          title="Formas de pagamento"
          description="A configuração de pagamentos ainda não possui persistência de produção. Nenhuma alteração será simulada ou armazenada somente no navegador."
        />
      ) : (
        <PaymentsSection scenarioId={search.scenario} />
      )
    case "availability":
      return usesHttpCatalogs ? (
        <UnavailableSetupSection
          title="Disponibilidade"
          description="A agenda de disponibilidade ainda não possui persistência de produção. Configure primeiro os vínculos entre unidades, profissionais e serviços."
        />
      ) : (
        <AvailabilityCalendar
          date={search.availabilityDate}
          scenarioId={search.scenario}
          view={search.availabilityView}
          onSearchChange={onSearchChange}
        />
      )
  }
}

function UnavailableSetupSection({ description, title }: { description: string; title: string }) {
  return (
    <section
      aria-labelledby="unavailable-setup-section-title"
      className="rounded-lg border border-dashed bg-card p-6"
    >
      <div className="flex max-w-2xl items-start gap-3">
        <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="grid gap-1">
          <h2 id="unavailable-setup-section-title" className="font-heading text-lg font-medium">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          <StatusBadge tone="info">Disponível em uma próxima etapa</StatusBadge>
        </div>
      </div>
    </section>
  )
}

function OverviewSection({
  scenarioId,
  onSectionChange,
}: {
  scenarioId: SetupScenarioId
  onSectionChange: (section: SetupSection) => void
}) {
  const completion = useSetupCompletion(scenarioId)
  if (completion.isPending) return <LoadingCards label="Carregando visão geral…" />
  if (completion.isError)
    return (
      <ErrorState
        title="Não foi possível carregar a visão geral"
        onRetry={() => completion.refetch()}
      />
    )
  const nextItem = completion.data.readiness.steps.find(({ complete }) => !complete) ??
    completion.data.readiness.steps.at(-1) ?? {
      complete: false,
      description: "Revise os dados da configuração.",
      id: "review",
      section: "overview",
      title: "Revisão",
    }
  const progress = Math.round(
    (completion.data.readiness.completedCount / completion.data.readiness.totalCount) * 100,
  )
  return (
    <section aria-labelledby="overview-title" className="grid gap-5 pb-4">
      <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/8 via-card to-card">
        <CardHeader className="gap-3">
          <div className="grid gap-1">
            <h2 id="overview-title" className="font-heading text-xl font-medium leading-snug">
              Prepare a barbearia para operar
            </h2>
            <CardDescription className="max-w-2xl">
              Cadastre unidades, equipe e serviços. Recursos operacionais que ainda não possuem
              persistência aparecem como etapas futuras.
            </CardDescription>
          </div>
          <CardAction>
            <StatusBadge tone={progress === 100 ? "success" : "info"}>
              {`${completion.data.readiness.completedCount} de ${completion.data.readiness.totalCount}`}
            </StatusBadge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div
            aria-label={`${progress}% da configuração concluída`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {progress === 100
              ? "A configuração principal está completa. Continue revisando sempre que a operação mudar."
              : `Próxima etapa recomendada: ${nextItem.title}.`}
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="button" onClick={() => onSectionChange(nextItem.section)}>
            {progress === 100 ? "Revisar configuração" : "Continuar configuração"}
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>

      <div>
        <h3 className="text-base font-semibold">Etapas da configuração</h3>
        <p className="text-sm text-muted-foreground">
          Cada etapa explica o que será habilitado na operação.
        </p>
      </div>
      <ol className="grid gap-3 md:grid-cols-2">
        {completion.data.readiness.steps.map((item, index) => (
          <li key={item.id}>
            <Card className="h-full">
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
                  {item.complete ? (
                    <CheckCircle2Icon
                      aria-label="Etapa concluída"
                      className="size-5 text-primary"
                    />
                  ) : (
                    <span>
                      <span className="sr-only">Etapa </span>
                      {index + 1}
                    </span>
                  )}
                </div>
                <h4 className="font-heading text-base font-medium leading-snug">{item.title}</h4>
                <CardAction>
                  <StatusBadge tone={item.complete ? "success" : "warning"}>
                    {item.complete ? "Completa" : "Pendente"}
                  </StatusBadge>
                </CardAction>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {item.description}
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onSectionChange(item.section)}
                >
                  {item.complete ? "Revisar" : "Configurar"}
                  <ArrowRightIcon aria-hidden="true" />
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ol>
      {progress === 100 ? (
        <Card>
          <CardHeader>
            <h3 className="font-heading text-base font-medium">Configuração pronta para operar</h3>
            <CardDescription>
              Revise os catálogos quando a operação mudar. Disponibilidade, pagamentos e demais
              configurações operacionais serão habilitados somente com persistência própria.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-end">
            <Button nativeButton={false} render={<a href="/overview" />}>
              Entrar no espaço de trabalho
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </section>
  )
}

type RowMenuState = {
  anchor: ReturnType<typeof createDataTablePointAnchor>
  entity: SetupEntity
  trigger: HTMLTableRowElement
} | null

function EntitySection({
  createRequest,
  kind,
  onCreateRequestHandled,
  scenarioId,
}: {
  createRequest: { kind: SetupEntityKind; trigger: HTMLButtonElement } | null
  kind: SetupEntityKind
  onCreateRequestHandled: () => void
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

  useEffect(() => {
    if (createRequest?.kind !== kind) return
    returnFocusRef.current = createRequest.trigger
    setDrawer({ kind: "create", entityKind: kind })
    onCreateRequestHandled()
  }, [createRequest, kind, onCreateRequestHandled])

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
      toast.success(
        drawer?.kind === "edit"
          ? "Registro atualizado."
          : entityKind === "professional"
            ? "Convite enviado. O profissional aparecerá após aceitar."
            : "Registro criado.",
      )
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
    <section aria-label={labels.plural} className="flex h-full min-h-[32rem] flex-col gap-3">
      <fieldset className="flex min-w-0 shrink-0 items-center gap-1.5 overflow-x-auto rounded-lg border bg-card p-2">
        <legend className="sr-only">
          Busca e filtros de {labels.plural.toLocaleLowerCase("pt-BR")}
        </legend>
        <ListSearchField
          id={`${kind}-search`}
          aria-label={`Buscar ${labels.plural.toLocaleLowerCase("pt-BR")}`}
          value={search}
          placeholder="Buscar por nome ou detalhe"
          onChange={(event) => {
            setSearch(event.currentTarget.value)
            setPage(1)
          }}
        />
        <SingleSelectListFilter
          icon={SlidersHorizontalIcon}
          id={`${kind}-status`}
          inactiveValue="all"
          label="Estado"
          options={[
            { label: "Todos", value: "all" },
            { label: "Ativos", value: "active" },
            { label: "Arquivados", value: "archived" },
          ]}
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        />
      </fieldset>
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
              : "Crie o primeiro registro para continuar a configuração."
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
          className="min-h-80 flex-1"
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
            : "O registro voltará a aparecer como ativo."
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

function ErrorState({ onRetry, title }: { onRetry: () => void; title: string }) {
  return (
    <div
      role="alert"
      className="grid min-h-56 place-items-center rounded-lg border border-feedback-destructive-border bg-feedback-destructive p-6 text-center"
    >
      <div className="grid max-w-md gap-3">
        <CircleAlertIcon aria-hidden="true" className="mx-auto size-7" />
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm">Não foi possível obter os dados. Tente novamente.</p>
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
  if (entity.kind === "professional") return entity.role
  return `${entity.category} · ${entity.durationMinutes} min · ${formatMoney(entity.priceCents)}`
}

function entityRelationships(entity: SetupEntity) {
  if (entity.kind === "unit") return "Horários e catálogos"
  if (entity.kind === "professional")
    return `${entity.unitIds.length} unidade(s) · ${entity.serviceIds.length} serviço(s)`
  return `${entity.unitIds.length} unidade(s) · ${entity.professionalIds.length} profissional(is)`
}

function errorMessage(error: unknown) {
  return error instanceof SetupDependencyError ||
    error instanceof SetupValidationError ||
    error instanceof SetupOperationInvalidatedError
    ? error.message
    : "Não foi possível concluir a ação. Tente novamente."
}

export { sectionItems }
