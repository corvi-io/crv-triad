import {
  BellRingIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  CircleDotIcon,
  Clock3Icon,
  ListFilterIcon,
  PlusIcon,
  ScissorsIcon,
  UserRoundCheckIcon,
  UsersIcon,
} from "lucide-react"
import { useDeferredValue, useMemo, useState } from "react"
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/modules/shared/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Separator } from "@/modules/shared/components/ui/separator"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import type { QueueEntry, QueueStage, WalkInInput } from "./contracts"
import {
  formatArrival,
  formatWait,
  groupQueueEntries,
  professionalPreferenceLabels,
  queueCounts,
  queuePriorityLabels,
  queueStageLabels,
} from "./projection"
import { useAddWalkIn, useCallQueueEntry, useServiceDeskQueue, useStartQueueEntry } from "./queries"
import type { ServiceDeskSearch } from "./search"
import { WalkInForm } from "./walk-in-form"

export function ServiceDeskPage({
  onOpenSession,
  onSearchChange,
  search,
}: {
  onOpenSession: (sessionId: string) => void
  onSearchChange: (next: Partial<ServiceDeskSearch>) => void
  search: ServiceDeskSearch
}) {
  const [searchText, setSearchText] = useState("")
  const deferredSearch = useDeferredValue(searchText)
  const [adding, setAdding] = useState(false)
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
  const callEntry = useCallQueueEntry()
  const startEntry = useStartQueueEntry()
  const snapshot = query.data
  const entries = snapshot?.entries ?? []
  const groups = groupQueueEntries(entries)
  const counts = queueCounts(entries)
  const hasFilters =
    Boolean(searchText) ||
    search.stage !== "all" ||
    search.priority !== "all" ||
    search.preference !== "all" ||
    search.professional !== "all"
  const oldestWait = useMemo(() => {
    if (!snapshot || groups.waiting.length === 0) return null
    return groups.waiting.reduce((oldest, entry) =>
      entry.arrivalAt < oldest.arrivalAt ? entry : oldest,
    )
  }, [groups.waiting, snapshot])

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
                inactiveValue="centro"
                label="Unidade"
                showSelectedLabel
                value={search.unit}
                onValueChange={(unit) => onSearchChange({ unit })}
                options={[
                  { label: "Centro", value: "centro" },
                  { label: "Artesão", value: "artesao" },
                ]}
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
                  { label: "Pronto para pagamento", value: "ready-for-payment" },
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
            </fieldset>
          </>
        }
        bodyClassName="min-h-0"
        bodyViewportClassName="flex min-h-full flex-col gap-4 p-4 sm:p-6"
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
        {snapshot ? (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {counts.waiting} aguardando, {counts.called} chamado(s), {counts["in-service"]} em
              atendimento e {counts["ready-for-payment"]} pronto(s) para pagamento
              {oldestWait
                ? `. Maior espera visível: ${formatWait(oldestWait.arrivalAt, snapshot.now)}.`
                : "."}
            </p>
            {entries.length === 0 ? (
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
                className="grid min-w-0 flex-1 items-start gap-3 lg:grid-cols-2 xl:grid-cols-4"
                aria-label="Etapas da fila de atendimento"
              >
                {(["waiting", "called", "in-service", "ready-for-payment"] as const).map(
                  (stage) => (
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
                      onStart={start}
                      onOpenSession={onOpenSession}
                    />
                  ),
                )}
              </section>
            )}
          </>
        ) : null}
      </ModuleLayout>
      <ActionDrawer
        isOpen={adding}
        onOpenChange={setAdding}
        context="Atendimentos"
        title="Adicionar à fila"
        description="Crie um contato temporário apenas para esta sessão."
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
            key={adding ? "open" : "closed"}
            formId="service-desk-walk-in-form"
            now={new Date(snapshot.now)}
            onSubmit={add}
            professionals={snapshot.professionals}
            services={snapshot.services}
            unitId={search.unit}
          />
        ) : null}
      </ActionDrawer>
    </>
  )
}

function QueueColumn({
  entries,
  isCalling,
  isStarting,
  now,
  onAssignmentChange,
  onCall,
  onOpenSession,
  onStart,
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
  onOpenSession: (sessionId: string) => void
  onStart: (entry: QueueEntry) => void
  professionals: readonly Professional[]
  services: readonly Service[]
  stage: QueueStage
  startAssignments: Record<string, string>
  unavailableProfessionalIds: readonly string[]
}) {
  return (
    <section
      aria-labelledby={`queue-stage-${stage}`}
      className="flex min-w-0 flex-col gap-3 rounded-xl border bg-muted/30 p-3"
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
        <div className="flex max-h-[48rem] flex-col gap-3 overflow-y-auto pb-1">
          {entries.map((entry) => (
            <QueueCard
              entry={entry}
              isCalling={isCalling}
              isStarting={isStarting}
              key={entry.id}
              now={now}
              onAssignmentChange={onAssignmentChange}
              onCall={onCall}
              onOpenSession={onOpenSession}
              onStart={onStart}
              professionals={professionals}
              selectedProfessionalId={startAssignments[entry.id]}
              services={services}
              unavailableProfessionalIds={unavailableProfessionalIds}
            />
          ))}
        </div>
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
  onOpenSession,
  onStart,
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
  onOpenSession: (sessionId: string) => void
  onStart: (entry: QueueEntry) => void
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
    <Card size="sm">
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
          <Badge variant="outline">{queueStageLabels[entry.stage]}</Badge>
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
      <CardFooter>
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
          <Button
            className="w-full"
            type="button"
            isLoading={isStarting}
            disabled={entry.preferenceKind === "first-available" && !selectedProfessionalId}
            onClick={() => onStart(entry)}
          >
            <BriefcaseBusinessIcon data-icon="inline-start" aria-hidden="true" />
            Iniciar atendimento
          </Button>
        ) : null}
        {entry.stage === "in-service" || entry.stage === "ready-for-payment" ? (
          <Button
            className="w-full"
            type="button"
            variant="outline"
            onClick={() => onOpenSession(entry.sessionId ?? `session-${entry.id}`)}
          >
            <UserRoundCheckIcon data-icon="inline-start" aria-hidden="true" />
            {entry.stage === "in-service" ? "Abrir atendimento" : "Revisar atendimento"}
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
