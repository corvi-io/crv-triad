import {
  BellRingIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  CircleDotIcon,
  Clock3Icon,
  ListFilterIcon,
  PlusIcon,
  ScissorsIcon,
  Settings2Icon,
  UserRoundCheckIcon,
  UsersIcon,
} from "lucide-react"
import { useDeferredValue, useState } from "react"
import { toast } from "sonner"
import type { Professional, Service } from "@/modules/scheduling/contracts"
import { SingleSelectListFilter } from "@/modules/shared/components/data-display/list-filter"
import { ListSearchField } from "@/modules/shared/components/data-display/list-search-field"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { Avatar, AvatarFallback } from "@/modules/shared/components/ui/avatar"
import { Badge } from "@/modules/shared/components/ui/badge"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/modules/shared/components/ui/empty"
import { ScrollArea } from "@/modules/shared/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Separator } from "@/modules/shared/components/ui/separator"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { Textarea } from "@/modules/shared/components/ui/textarea"
import type { QueueEntry, QueueStage, ServiceDeskScenarioId, WalkInInput } from "./contracts"
import {
  formatArrival,
  formatWait,
  groupQueueEntries,
  professionalPreferenceLabels,
  queuePriorityLabels,
  queueStageLabels,
} from "./projection"
import {
  useAddWalkIn,
  useAdmitScheduled,
  useCallQueueEntry,
  useCancelQueueEntry,
  useReturnQueueEntry,
  useServiceDeskQueue,
  useStartQueueEntry,
} from "./queries"
import type { ServiceDeskSearch } from "./search"
import { WalkInForm } from "./walk-in-form"

export function ServiceDeskPage({
  onCheckout,
  onOpenSession,
  onSearchChange,
  search,
  scenarioGroupLabels,
  scenarioGroups,
  scenarioIds,
  scenarioPresentation,
}: {
  onCheckout: (sessionId: string) => void
  onOpenSession: (sessionId: string) => void
  onSearchChange: (next: Partial<ServiceDeskSearch>) => void
  search: ServiceDeskSearch
  scenarioGroupLabels?: Readonly<Record<DevelopmentScenarioGroup, string>>
  scenarioGroups?: readonly DevelopmentScenarioGroup[]
  scenarioIds?: readonly ServiceDeskScenarioId[]
  scenarioPresentation?: Readonly<Record<ServiceDeskScenarioId, DevelopmentScenarioPresentation>>
}) {
  const [searchText, setSearchText] = useState("")
  const deferredSearch = useDeferredValue(searchText)
  const [adding, setAdding] = useState(false)
  const [leaving, setLeaving] = useState<QueueEntry | null>(null)
  const [leavingReason, setLeavingReason] = useState("")
  const [startAssignments, setStartAssignments] = useState<Record<string, string>>({})
  const queryInput = {
    preference: search.preference,
    priority: search.priority,
    professionalId: search.professional,
    scenarioId: search.scenario,
    search: deferredSearch,
    stage: search.stage,
    unitId: search.unit,
  } as const
  const query = useServiceDeskQueue(queryInput)
  const addWalkIn = useAddWalkIn()
  const admitScheduled = useAdmitScheduled()
  const callEntry = useCallQueueEntry()
  const cancelEntry = useCancelQueueEntry()
  const returnEntry = useReturnQueueEntry()
  const startEntry = useStartQueueEntry()
  const snapshot = query.data
  const entries = snapshot?.entries ?? []
  const groups = groupQueueEntries(entries)
  const hasFilters =
    Boolean(searchText) ||
    search.stage !== "all" ||
    search.priority !== "all" ||
    search.preference !== "all" ||
    search.professional !== "all"

  async function add(input: WalkInInput) {
    if (addWalkIn.isPending) return
    try {
      await addWalkIn.mutateAsync(input)
      toast.success("Cliente adicionado à fila.")
      setAdding(false)
    } catch {
      toast.error("Não foi possível adicionar à fila. Revise os dados e tente novamente.")
    }
  }

  async function call(entry: QueueEntry) {
    if (callEntry.isPending) return
    try {
      await callEntry.mutateAsync(entry.id)
      toast.success("Cliente chamado.")
    } catch {
      toast.error("Não foi possível chamar o cliente. Tente novamente.")
    }
  }

  async function start(entry: QueueEntry) {
    if (startEntry.isPending) return
    try {
      await startEntry.mutateAsync({
        entryId: entry.id,
        professionalId: startAssignments[entry.id],
      })
      toast.success("Atendimento iniciado.")
    } catch {
      toast.error("Não foi possível iniciar. Revise o profissional e tente novamente.")
    }
  }

  async function returnToWaiting(entry: QueueEntry) {
    try {
      await returnEntry.mutateAsync(entry.id)
      toast.success("Cliente voltou para a espera.")
    } catch {
      toast.error("Não foi possível voltar para a espera.")
    }
  }

  async function registerDeparture() {
    if (!leaving || leavingReason.trim().length < 3 || cancelEntry.isPending) return
    try {
      await cancelEntry.mutateAsync({ entryId: leaving.id, reason: leavingReason.trim() })
      setLeaving(null)
      setLeavingReason("")
      toast.success("Saída registrada.")
    } catch {
      toast.error("Não foi possível registrar a saída. Revise os dados atuais.")
    }
  }

  return (
    <>
      <ModuleLayout
        head={
          <>
            <PageHeader
              title="Atendimentos"
              description="Acompanhe chegadas, chamadas e serviços iniciados."
              actions={
                <Button type="button" onClick={() => setAdding(true)}>
                  <PlusIcon data-icon="inline-start" aria-hidden="true" />
                  Adicionar à fila
                </Button>
              }
            />
            <fieldset className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg border bg-card p-2">
              <legend className="sr-only">Busca e filtros de atendimentos</legend>
              <ListSearchField
                id="service-desk-search"
                aria-label="Buscar na fila"
                placeholder="Buscar cliente ou serviço"
                value={searchText}
                onChange={(event) => setSearchText(event.currentTarget.value)}
              />
              <SingleSelectListFilter
                icon={Building2Icon}
                id="service-desk-unit-filter"
                inactiveValue=""
                label="Unidade"
                showSelectedLabel
                value={snapshot?.unitId ?? search.unit}
                onValueChange={(unit) => onSearchChange({ unit })}
                options={(snapshot?.units ?? []).map(({ id, name }) => ({
                  label: name,
                  value: id,
                }))}
              />
              <SingleSelectListFilter
                icon={ListFilterIcon}
                id="service-desk-stage-filter"
                inactiveValue="all"
                label="Etapa"
                value={search.stage}
                onValueChange={(stage) => onSearchChange({ stage })}
                options={[
                  { label: "Todas as etapas", value: "all" },
                  { label: "Aguardando", value: "waiting" },
                  { label: "Chamados", value: "called" },
                  { label: "Em atendimento", value: "in-service" },
                  ...(scenarioIds
                    ? [{ label: "Pronto para pagamento", value: "ready-for-payment" as const }]
                    : []),
                ]}
              />
              <SingleSelectListFilter
                icon={CircleDotIcon}
                id="service-desk-priority-filter"
                inactiveValue="all"
                label="Prioridade"
                value={search.priority}
                onValueChange={(priority) => onSearchChange({ priority })}
                options={[
                  { label: "Todas as prioridades", value: "all" },
                  { label: "Normal", value: "normal" },
                  { label: "Encaixe", value: "fit-in" },
                ]}
              />
              <SingleSelectListFilter
                icon={UserRoundCheckIcon}
                id="service-desk-preference-filter"
                inactiveValue="all"
                label="Preferência"
                value={search.preference}
                onValueChange={(preference) => onSearchChange({ preference })}
                options={[
                  { label: "Todas as preferências", value: "all" },
                  { label: "Profissional específico", value: "specific" },
                  { label: "Primeiro disponível", value: "first-available" },
                ]}
              />
              {snapshot && snapshot.professionals.length > 1 ? (
                <SingleSelectListFilter
                  icon={UsersIcon}
                  id="service-desk-professional-filter"
                  inactiveValue="all"
                  label="Profissional"
                  value={search.professional}
                  onValueChange={(professional) => onSearchChange({ professional })}
                  options={[
                    { label: "Todos os profissionais", value: "all" },
                    ...snapshot.professionals.map(({ id, name }) => ({ label: name, value: id })),
                  ]}
                />
              ) : null}
              {scenarioIds && scenarioGroups && scenarioGroupLabels && scenarioPresentation ? (
                <DevelopmentScenarioLauncher
                  onScenarioChange={(scenario) => onSearchChange({ scenario })}
                  scenarioGroupLabels={scenarioGroupLabels}
                  scenarioGroups={scenarioGroups}
                  scenarioIds={scenarioIds}
                  scenarioPresentation={scenarioPresentation}
                  selectedScenario={search.scenario}
                />
              ) : null}
            </fieldset>
          </>
        }
        bodyClassName="min-h-0"
        bodyViewportClassName="flex h-full min-h-0 flex-col gap-4 overflow-hidden"
      >
        {query.isLoading ? <QueueSkeleton /> : null}
        {query.isError ? (
          <Alert>
            <BellRingIcon aria-hidden="true" />
            <AlertTitle>Não foi possível carregar os atendimentos</AlertTitle>
            <AlertDescription>
              A fila anterior foi preservada. Tente carregar novamente.
            </AlertDescription>
            <Button type="button" variant="outline" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </Alert>
        ) : null}
        {snapshot?.arrivals?.length ? (
          <section
            aria-labelledby="service-desk-arrivals"
            className="rounded-lg border bg-card p-4"
          >
            <h2 id="service-desk-arrivals" className="mb-3 font-semibold">
              Chegadas confirmadas
            </h2>
            <div className="grid gap-2">
              {snapshot.arrivals.map((arrival) => (
                <div
                  key={arrival.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{arrival.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      {arrival.serviceName} · {arrival.professionalName}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={admitScheduled.isPending}
                    onClick={() =>
                      admitScheduled.mutate({
                        appointmentId: arrival.id,
                        appointmentVersion: arrival.version,
                      })
                    }
                  >
                    Adicionar à fila
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {snapshot?.history?.length ? (
          <section aria-labelledby="service-desk-history" className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="service-desk-history" className="font-semibold">
                Histórico recente
              </h2>
              <span className="text-sm text-muted-foreground">Últimos 10 atendimentos</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {snapshot.history.map((visit) => (
                <button
                  key={visit.id}
                  type="button"
                  className="min-h-11 rounded-md border p-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onOpenSession(visit.id)}
                >
                  <span className="block font-medium">{visit.customerName}</span>
                  <span className="text-sm text-muted-foreground">
                    {visit.status === "completed" ? "Atendimento concluído" : "Saída registrada"} ·{" "}
                    {formatArrival(visit.finishedAt)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {snapshot ? (
          entries.length === 0 ? (
            <Empty className="min-h-64">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters ? "Nenhum atendimento encontrado" : "Fila sem atendimentos"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Revise a busca ou os filtros selecionados."
                    : "Adicione um cliente sem agendamento ou registre uma chegada pela Agenda."}
                </EmptyDescription>
              </EmptyHeader>
              {!hasFilters ? (
                <EmptyContent>
                  <Button type="button" variant="outline" onClick={() => setAdding(true)}>
                    Adicionar à fila
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <section
              className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-4 gap-3 sm:h-full sm:grid-cols-2 sm:grid-rows-2 xl:grid-cols-4 xl:grid-rows-1"
              aria-label="Etapas da fila de atendimento"
            >
              {(scenarioIds
                ? (["waiting", "called", "in-service", "ready-for-payment"] as const)
                : (["waiting", "called", "in-service"] as const)
              ).map((stage) => (
                <QueueColumn
                  entries={groups[stage]}
                  key={stage}
                  now={snapshot.now}
                  professionals={snapshot.professionals}
                  services={snapshot.services}
                  stage={stage}
                  startAssignments={startAssignments}
                  unavailableProfessionalIds={snapshot.unavailableProfessionalIds}
                  isCalling={callEntry.isPending}
                  isStarting={startEntry.isPending}
                  onAssignmentChange={(entryId, professionalId) =>
                    setStartAssignments((current) => ({
                      ...current,
                      [entryId]: professionalId,
                    }))
                  }
                  onCall={call}
                  onCancel={setLeaving}
                  onCheckout={onCheckout}
                  onStart={start}
                  onReturn={returnToWaiting}
                  onOpenSession={onOpenSession}
                />
              ))}
            </section>
          )
        ) : null}
      </ModuleLayout>
      <ActionDrawer
        isOpen={adding}
        onOpenChange={setAdding}
        context="Atendimentos"
        title="Adicionar à fila"
        description="Selecione um cliente cadastrado ou identifique esta visita como sem cadastro."
        size="form"
        secondaryActions={
          <Button type="button" variant="outline" onClick={() => setAdding(false)}>
            Cancelar
          </Button>
        }
        primaryAction={
          <Button form="service-desk-walk-in-form" type="submit" isLoading={addWalkIn.isPending}>
            Adicionar à fila
          </Button>
        }
      >
        {snapshot ? (
          <WalkInForm
            clients={snapshot.clients ?? []}
            key={adding ? "open" : "closed"}
            formId="service-desk-walk-in-form"
            now={new Date(snapshot.now)}
            onSubmit={add}
            professionals={snapshot.professionals}
            services={snapshot.services}
            unitId={snapshot.unitId ?? search.unit}
          />
        ) : null}
      </ActionDrawer>
      <ActionDrawer
        isOpen={Boolean(leaving)}
        onOpenChange={(open) => !open && setLeaving(null)}
        context="Atendimentos"
        title="Registrar saída"
        description="Retire o cliente da fila sem criar um serviço concluído."
        secondaryActions={
          <Button type="button" variant="outline" onClick={() => setLeaving(null)}>
            Cancelar
          </Button>
        }
        primaryAction={
          <Button
            type="button"
            isLoading={cancelEntry.isPending}
            disabled={leavingReason.trim().length < 3}
            onClick={registerDeparture}
          >
            Registrar saída
          </Button>
        }
      >
        <label className="grid gap-2 font-medium" htmlFor="service-desk-departure-reason">
          Motivo da saída
          <Textarea
            id="service-desk-departure-reason"
            minLength={3}
            maxLength={160}
            value={leavingReason}
            onChange={(event) => setLeavingReason(event.currentTarget.value)}
          />
          <span className="text-sm font-normal text-muted-foreground">
            Use de 3 a 160 caracteres. O motivo fica restrito à operação.
          </span>
        </label>
      </ActionDrawer>
    </>
  )
}

type DevelopmentScenarioGroup = "queue" | "reliability" | "fulfillment" | "checkout"

type DevelopmentScenarioPresentation = {
  description: string
  group: DevelopmentScenarioGroup
  label: string
}

function DevelopmentScenarioLauncher({
  onScenarioChange,
  scenarioGroupLabels,
  scenarioGroups,
  scenarioIds,
  scenarioPresentation,
  selectedScenario,
}: {
  onScenarioChange: (scenario: ServiceDeskScenarioId) => void
  scenarioGroupLabels: Readonly<Record<DevelopmentScenarioGroup, string>>
  scenarioGroups: readonly DevelopmentScenarioGroup[]
  scenarioIds: readonly ServiceDeskScenarioId[]
  scenarioPresentation: Readonly<Record<ServiceDeskScenarioId, DevelopmentScenarioPresentation>>
  selectedScenario: ServiceDeskScenarioId
}) {
  const groups = scenarioGroups.map((group) => ({
    group,
    scenarios: scenarioIds.filter((scenario) => scenarioPresentation[scenario]?.group === group),
  }))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Cenários de desenvolvimento"
            size="icon"
            type="button"
            variant="outline"
          >
            <Settings2Icon aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-80">
        {groups.map(({ group, scenarios }, index) =>
          scenarios.length > 0 ? (
            <DropdownMenuGroup key={group}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel>
                {index === 0 ? "Cenários de desenvolvimento · " : null}
                {scenarioGroupLabels[group]}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={selectedScenario}
                onValueChange={(value) => onScenarioChange(value as ServiceDeskScenarioId)}
              >
                {scenarios.map((scenario) => {
                  const presentation = scenarioPresentation[scenario]
                  return (
                    <DropdownMenuRadioItem closeOnClick key={scenario} value={scenario}>
                      <span className="flex min-w-0 flex-col">
                        <span>{presentation.label}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {presentation.description}
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  )
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          ) : null,
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function QueueColumn({
  entries,
  isCalling,
  isStarting,
  now,
  onAssignmentChange,
  onCall,
  onCancel,
  onCheckout,
  onOpenSession,
  onStart,
  onReturn,
  professionals,
  services,
  stage,
  startAssignments,
  unavailableProfessionalIds,
}: {
  entries: readonly QueueEntry[]
  isCalling: boolean
  isStarting: boolean
  now: string
  onAssignmentChange: (entryId: string, professionalId: string) => void
  onCall: (entry: QueueEntry) => void
  onCancel: (entry: QueueEntry) => void
  onCheckout: (sessionId: string) => void
  onOpenSession: (sessionId: string) => void
  onStart: (entry: QueueEntry) => void
  onReturn: (entry: QueueEntry) => void
  professionals: readonly Professional[]
  services: readonly Service[]
  stage: QueueStage
  startAssignments: Record<string, string>
  unavailableProfessionalIds: readonly string[]
}) {
  return (
    <section
      aria-labelledby={`queue-stage-${stage}`}
      className="flex min-h-0 min-w-0 flex-col gap-3 rounded-xl border bg-muted/30 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading font-semibold" id={`queue-stage-${stage}`}>
          {stage === "called" ? "Chamados" : queueStageLabels[stage]}
        </h2>
        <Badge variant="outline">{entries.length}</Badge>
      </div>
      <Separator />
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Nenhum cliente nesta etapa.
        </p>
      ) : (
        <ScrollArea
          className="min-h-0 flex-1"
          scrollbars="vertical"
          scrollbarVisibility="overflow"
          viewportClassName="flex h-full min-h-0 flex-col gap-3 pb-1"
        >
          {entries.map((entry) => (
            <QueueCard
              entry={entry}
              isCalling={isCalling}
              isStarting={isStarting}
              key={entry.id}
              now={now}
              onAssignmentChange={onAssignmentChange}
              onCall={onCall}
              onCancel={onCancel}
              onCheckout={onCheckout}
              onOpenSession={onOpenSession}
              onStart={onStart}
              onReturn={onReturn}
              professionals={professionals}
              selectedProfessionalId={startAssignments[entry.id]}
              services={services}
              unavailableProfessionalIds={unavailableProfessionalIds}
            />
          ))}
        </ScrollArea>
      )}
    </section>
  )
}

function QueueCard({
  entry,
  isCalling,
  isStarting,
  now,
  onAssignmentChange,
  onCall,
  onCancel,
  onCheckout,
  onOpenSession,
  onStart,
  onReturn,
  professionals,
  selectedProfessionalId,
  services,
  unavailableProfessionalIds,
}: {
  entry: QueueEntry
  isCalling: boolean
  isStarting: boolean
  now: string
  onAssignmentChange: (entryId: string, professionalId: string) => void
  onCall: (entry: QueueEntry) => void
  onCancel: (entry: QueueEntry) => void
  onCheckout: (sessionId: string) => void
  onOpenSession: (sessionId: string) => void
  onStart: (entry: QueueEntry) => void
  onReturn: (entry: QueueEntry) => void
  professionals: readonly Professional[]
  selectedProfessionalId?: string
  services: readonly Service[]
  unavailableProfessionalIds: readonly string[]
}) {
  const service = services.find(({ id }) => id === entry.serviceId)
  const professionalId = entry.professionalId ?? entry.assignedProfessionalId
  const professional = professionals.find(({ id }) => id === professionalId)
  const eligibleProfessionals = professionals.filter(
    ({ id }) =>
      service?.eligibleProfessionalIds.includes(id) && !unavailableProfessionalIds.includes(id),
  )
  const professionalItems = eligibleProfessionals.map(({ id, name }) => ({
    label: name,
    value: id,
  }))
  const initials = entry.customerName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR")

  return (
    <Card className="shrink-0 ring-inset" size="sm">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate">{entry.customerName}</CardTitle>
            <CardDescription>
              {entry.source === "scheduled" ? "Agendado" : "Sem agendamento"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="flex items-center gap-2">
          <ScissorsIcon aria-hidden="true" />
          <span>{service?.name ?? "Serviço indisponível"}</span>
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock3Icon aria-hidden="true" />
          <span>
            Chegada {formatArrival(entry.arrivalAt)}
            {entry.stage === "waiting" ? ` · espera ${formatWait(entry.arrivalAt, now)}` : ""}
          </span>
        </p>
        <p className="text-muted-foreground">
          {professionalPreferenceLabels[entry.preferenceKind]}
          {professional ? ` · ${professional.name}` : ""}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">
            {entry.paymentStatus === "paid" ? "Concluído · Pago" : queueStageLabels[entry.stage]}
          </Badge>
          <Badge variant="secondary">{queuePriorityLabels[entry.priority]}</Badge>
        </div>
        {entry.stage === "called" && entry.preferenceKind === "first-available" ? (
          <Select
            items={professionalItems}
            value={selectedProfessionalId ?? null}
            onValueChange={(value) => onAssignmentChange(entry.id, value ?? "")}
          >
            <SelectTrigger aria-label={`Profissional para ${entry.customerName}`}>
              <SelectValue>
                {eligibleProfessionals.find(({ id }) => id === selectedProfessionalId)?.name ??
                  "Escolha quem atenderá"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {eligibleProfessionals.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {entry.stage === "waiting" ? (
          <Button
            className="w-full"
            type="button"
            variant="outline"
            isLoading={isCalling}
            onClick={() => onCall(entry)}
          >
            <BellRingIcon data-icon="inline-start" aria-hidden="true" />
            Chamar cliente
          </Button>
        ) : null}
        {entry.stage === "called" ? (
          <>
            <Button
              className="flex-1"
              type="button"
              variant="outline"
              onClick={() => onReturn(entry)}
            >
              Voltar para espera
            </Button>
            <Button
              className="flex-1"
              type="button"
              isLoading={isStarting}
              disabled={entry.preferenceKind === "first-available" && !selectedProfessionalId}
              onClick={() => onStart(entry)}
            >
              <BriefcaseBusinessIcon data-icon="inline-start" aria-hidden="true" />
              Iniciar atendimento
            </Button>
          </>
        ) : null}
        {entry.stage === "waiting" || entry.stage === "called" ? (
          <Button className="w-full" type="button" variant="ghost" onClick={() => onCancel(entry)}>
            Registrar saída
          </Button>
        ) : null}
        {entry.stage === "ready-for-payment" && entry.paymentStatus !== "paid" ? (
          <Button
            className="w-full"
            type="button"
            onClick={() => onCheckout(entry.sessionId ?? `session-${entry.id}`)}
          >
            Receber pagamento
          </Button>
        ) : entry.stage === "in-service" || entry.stage === "ready-for-payment" ? (
          <Button
            className="w-full"
            type="button"
            variant="outline"
            onClick={() => onOpenSession(entry.sessionId ?? `session-${entry.id}`)}
          >
            <UserRoundCheckIcon data-icon="inline-start" aria-hidden="true" />
            {entry.stage === "in-service"
              ? "Abrir atendimento"
              : entry.paymentStatus === "paid"
                ? "Ver pagamento"
                : "Revisar atendimento"}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}

function QueueSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-3" aria-label="Carregando atendimentos" role="status">
      {["waiting", "called", "in-service", "ready-for-payment"].map((stage) => (
        <Card key={stage}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-12" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
