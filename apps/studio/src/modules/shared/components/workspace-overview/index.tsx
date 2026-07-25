import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BadgeDollarSignIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleMinusIcon,
  Clock3Icon,
  GaugeIcon,
  HandCoinsIcon,
  PlusIcon,
  ScissorsIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/modules/shared/components/data-display/data-table"
import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Avatar, AvatarFallback } from "@/modules/shared/components/ui/avatar"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/card"
import { Progress, ProgressLabel } from "@/modules/shared/components/ui/progress"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { cn } from "@/modules/shared/lib/utils"

import { DashboardFiltersBar } from "./dashboard-filters"
import type {
  DashboardFilters,
  DashboardFlowItem,
  DashboardMetric,
  WorkspaceOverviewModel,
} from "./model"

export type { DashboardFilters, DashboardPeriod, WorkspaceOverviewModel } from "./model"

type WorkspaceOverviewProps = {
  attentionState?: "error" | "loading" | "ready" | "unavailable"
  hasActiveFilters?: boolean
  model?: WorkspaceOverviewModel
  onFiltersChange: (next: Partial<DashboardFilters>) => void
  onNavigateAgenda: (filters?: { professionalId?: string; status?: string }) => void
  onNavigateClients?: () => void
  onNavigateNotifications?: () => void
  onOpenAttention?: (id: string) => void
  onNavigateServices: () => void
  onNewAppointment: () => void
  onOpenAppointment: (id: string) => void
  onRetry: () => void
  onRetryAttention?: () => void
  state: "disabled" | "error" | "loading" | "ready"
}

export function WorkspaceOverview({
  attentionState = "ready",
  hasActiveFilters = false,
  model,
  onFiltersChange,
  onNavigateAgenda,
  onNavigateClients,
  onNavigateNotifications,
  onOpenAttention,
  onNavigateServices,
  onNewAppointment,
  onOpenAppointment,
  onRetry,
  onRetryAttention,
  state,
}: WorkspaceOverviewProps) {
  return (
    <ModuleLayout
      bodyViewportClassName="flex flex-col gap-2 pb-4"
      head={
        <PageHeader
          actions={
            state === "ready" ? (
              <Button type="button" onClick={onNewAppointment}>
                <PlusIcon data-icon="inline-start" />
                Novo agendamento
              </Button>
            ) : undefined
          }
          description="Acompanhe a operação, os atendimentos e o desempenho da unidade."
          title="Dashboard"
        />
      }
    >
      {state === "disabled" ? <DashboardDisabled /> : null}
      {state === "error" ? <DashboardError onRetry={onRetry} /> : null}
      {state === "loading" ? <DashboardLoading /> : null}
      {state === "ready" && model ? (
        <DashboardReady
          hasActiveFilters={hasActiveFilters}
          model={model}
          onFiltersChange={onFiltersChange}
          onNavigateAgenda={onNavigateAgenda}
          onNavigateClients={onNavigateClients}
          onNavigateNotifications={onNavigateNotifications}
          onOpenAttention={onOpenAttention}
          onNavigateServices={onNavigateServices}
          onNewAppointment={onNewAppointment}
          onOpenAppointment={onOpenAppointment}
          onRetryAttention={onRetryAttention}
          attentionState={attentionState}
        />
      ) : null}
    </ModuleLayout>
  )
}

function DashboardReady({
  attentionState,
  hasActiveFilters,
  model,
  onFiltersChange,
  onNavigateAgenda,
  onNavigateClients,
  onNavigateNotifications,
  onOpenAttention,
  onNavigateServices,
  onNewAppointment,
  onOpenAppointment,
  onRetryAttention,
}: Omit<WorkspaceOverviewProps, "attentionState" | "model" | "onRetry" | "state"> & {
  attentionState: NonNullable<WorkspaceOverviewProps["attentionState"]>
  model: WorkspaceOverviewModel
}) {
  const isEmpty = model.metrics[0]?.value === "0"
  return (
    <>
      <DashboardFiltersBar
        filters={model.filters}
        professionalOptions={model.professionalOptions}
        unitOptions={model.unitOptions}
        updatedLabel={model.updatedLabel}
        onChange={onFiltersChange}
      />

      {isEmpty ? (
        <EmptyState
          action={
            hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onFiltersChange({
                    customEnd: undefined,
                    customStart: undefined,
                    period: "today",
                    professionalId: undefined,
                    unitId: "centro",
                  })
                }
              >
                Limpar filtros
              </Button>
            ) : (
              <Button type="button" onClick={onNewAppointment}>
                <PlusIcon data-icon="inline-start" />
                Novo agendamento
              </Button>
            )
          }
          description={
            hasActiveFilters
              ? "Os filtros atuais não correspondem a nenhum agendamento."
              : "Ainda não há dados para este período."
          }
          icon={CalendarDaysIcon}
          title={hasActiveFilters ? "Nenhum resultado para os filtros" : "Período sem agendamentos"}
        />
      ) : null}

      <section aria-labelledby="dashboard-kpis-title">
        <h2 className="sr-only" id="dashboard-kpis-title">
          Indicadores principais
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {model.metrics.map((metric) => (
            <MetricSurface
              key={metric.id}
              metric={metric}
              onOpen={() =>
                onNavigateAgenda(metric.id === "completed" ? { status: "completed" } : undefined)
              }
            />
          ))}
        </div>
      </section>

      <div
        className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,1fr)]"
        data-dashboard-row="upcoming-attention"
      >
        <UpcomingCard
          appointments={model.upcoming}
          onNavigateAgenda={onNavigateAgenda}
          onOpenAppointment={onOpenAppointment}
        />
        <AttentionCard
          attention={model.attention}
          state={attentionState}
          onNavigateNotifications={onNavigateNotifications ?? (() => onNavigateAgenda())}
          onOpenAttention={onOpenAttention ?? (() => onNavigateNotifications?.())}
          onRetry={onRetryAttention}
        />
      </div>

      <div
        className="grid min-w-0 gap-2 xl:grid-cols-[minmax(24rem,1.08fr)_minmax(0,1fr)]"
        data-dashboard-row="flow-professionals"
      >
        <FlowCard flow={model.flow} onNavigateAgenda={onNavigateAgenda} />
        <ProfessionalsCard
          professionals={model.professionals}
          onNavigateAgenda={onNavigateAgenda}
        />
      </div>

      <div
        className="grid min-w-0 gap-2 lg:grid-cols-2 2xl:grid-cols-3"
        data-dashboard-row="capacity-finance-services"
      >
        <CapacityCard capacity={model.capacity} />
        <FinanceCard finance={model.finance} />
        <ServicesCard services={model.services} onNavigateServices={onNavigateServices} />
      </div>

      <div className="grid min-w-0 gap-2 lg:grid-cols-2" data-dashboard-row="cancellations-clients">
        <CancellationsCard cancellations={model.cancellations} />
        <ClientsCard clients={model.clients} onNavigateClients={onNavigateClients} />
      </div>
    </>
  )
}

function MetricSurface({ metric, onOpen }: { metric: DashboardMetric; onOpen: () => void }) {
  const presentation = metricPresentation[metric.id]
  const MetricIcon = presentation.icon
  const ComparisonIcon =
    metric.comparison.direction === "up"
      ? ArrowUpIcon
      : metric.comparison.direction === "down"
        ? ArrowDownIcon
        : CircleMinusIcon
  return (
    <Card size="sm" className="min-w-0 gap-1 py-2" data-dashboard-metric={metric.id}>
      <CardHeader className="grid-cols-[auto_1fr_auto] items-center gap-x-2 px-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "row-span-2 grid size-9 place-items-center rounded-lg border",
            presentation.iconClassName,
          )}
        >
          <MetricIcon className="size-4" />
        </span>
        <CardTitle className="col-start-2">
          <h3 className="text-xs text-muted-foreground">{metric.label}</h3>
        </CardTitle>
        <CardAction>
          <Button
            aria-label={`Abrir ${metric.label} na Agenda`}
            className="size-7"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={onOpen}
          >
            <ArrowRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2.5">
        <p className="text-xl font-semibold tracking-tight tabular-nums">{metric.value}</p>
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-[0.6875rem] leading-4",
            metric.comparison.direction === "up"
              ? "text-feedback-success-foreground"
              : metric.comparison.direction === "down"
                ? "text-feedback-destructive-foreground"
                : "text-muted-foreground",
          )}
        >
          <ComparisonIcon aria-hidden="true" className="size-3" />
          <span className="font-medium tabular-nums">{metric.comparison.amount}</span>
          {metric.comparison.percentage ? <span>({metric.comparison.percentage})</span> : null}
          <span className="text-muted-foreground">vs. {metric.comparison.periodLabel}</span>
        </p>
        <p className="mt-0.5 truncate text-[0.6875rem] leading-4 text-muted-foreground">
          {metric.description}
        </p>
      </CardContent>
    </Card>
  )
}

const metricPresentation = {
  appointments: {
    icon: CalendarDaysIcon,
    iconClassName:
      "border-schedule-in-progress-border bg-schedule-in-progress text-schedule-in-progress-foreground",
  },
  completed: {
    icon: CheckCircle2Icon,
    iconClassName:
      "border-feedback-success-border bg-feedback-success text-feedback-success-foreground",
  },
  occupancy: {
    icon: GaugeIcon,
    iconClassName: "border-feedback-info-border bg-feedback-info text-feedback-info-foreground",
  },
  "paid-average": {
    icon: BadgeDollarSignIcon,
    iconClassName:
      "border-schedule-arrived-border bg-schedule-arrived text-schedule-arrived-foreground",
  },
  "paid-value": {
    icon: HandCoinsIcon,
    iconClassName:
      "border-schedule-scheduled-border bg-schedule-scheduled text-schedule-scheduled-foreground",
  },
} as const

function UpcomingCard({
  appointments,
  onNavigateAgenda,
  onOpenAppointment,
}: {
  appointments: WorkspaceOverviewModel["upcoming"]
  onNavigateAgenda: WorkspaceOverviewProps["onNavigateAgenda"]
  onOpenAppointment: WorkspaceOverviewProps["onOpenAppointment"]
}) {
  return (
    <DashboardCard
      action={
        <Button type="button" size="sm" variant="outline" onClick={() => onNavigateAgenda()}>
          Ver agenda
        </Button>
      }
      description="Próximos registros não finalizados no período."
      title="Próximos atendimentos"
    >
      {appointments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Não há próximos atendimentos neste período.
        </p>
      ) : (
        <DataTable
          aria-label="Próximos atendimentos"
          className="max-h-44 shadow-none"
          tableClassName="text-xs [&_td]:py-1 [&_th]:py-1.5"
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Horário</DataTableHeaderCell>
              <DataTableHeaderCell>Cliente</DataTableHeaderCell>
              <DataTableHeaderCell>Serviço</DataTableHeaderCell>
              <DataTableHeaderCell>Barbeiro</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Falta</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {appointments.map((appointment) => (
              <DataTableRow key={appointment.id}>
                <DataTableCell className="whitespace-nowrap tabular-nums">
                  {shortDate(appointment.date)} · {appointment.start}
                </DataTableCell>
                <DataTableCell>
                  <button
                    type="button"
                    className="inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-md text-left font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => onOpenAppointment(appointment.id)}
                  >
                    <DashboardAvatar name={appointment.customerName} />
                    {appointment.customerName}
                  </button>
                </DataTableCell>
                <DataTableCell>{appointment.serviceName}</DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center gap-2">
                    <DashboardAvatar name={appointment.professionalName} />
                    {appointment.professionalName}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge className={appointment.statusClassName}>
                    {appointment.status}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {appointment.timeContext}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </DashboardCard>
  )
}

function AttentionCard({
  attention,
  onNavigateNotifications,
  onOpenAttention,
  onRetry,
  state,
}: {
  attention: WorkspaceOverviewModel["attention"]
  onNavigateNotifications: () => void
  onOpenAttention: (id: string) => void
  onRetry?: () => void
  state: NonNullable<WorkspaceOverviewProps["attentionState"]>
}) {
  return (
    <DashboardCard
      action={
        <Button type="button" size="sm" variant="ghost" onClick={onNavigateNotifications}>
          Ver todos
        </Button>
      }
      description="Somente situações sustentadas pelos dados atuais."
      title="Atenção necessária"
    >
      {state === "loading" ? (
        <div aria-label="Carregando situações operacionais" className="grid gap-2" role="status">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : null}
      {state === "error" || state === "unavailable" ? (
        <div className="rounded-lg border border-dashed p-4 text-sm" role="status">
          <p className="font-medium">
            {state === "error"
              ? "Não foi possível carregar as situações."
              : "Situações operacionais indisponíveis."}
          </p>
          <p className="mt-1 text-muted-foreground">
            {state === "error"
              ? "Tente novamente sem perder os demais dados do Dashboard."
              : "A fonte de notificações não está habilitada neste ambiente."}
          </p>
          {state === "error" && onRetry ? (
            <Button className="mt-3" size="sm" type="button" variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : null}
      {state === "ready" && attention.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Nenhuma situação acionável no período.
        </p>
      ) : null}
      {state === "ready" && attention.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {attention.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border p-1.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                  item.tone === "danger"
                    ? "border-feedback-destructive-border/70"
                    : item.tone === "warning"
                      ? "border-feedback-warning-border/70"
                      : "border-feedback-info-border/70",
                )}
                onClick={() => onOpenAttention(item.id)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg border",
                    item.tone === "danger"
                      ? "border-feedback-destructive-border bg-feedback-destructive text-feedback-destructive-foreground"
                      : item.tone === "warning"
                        ? "border-feedback-warning-border bg-feedback-warning text-feedback-warning-foreground"
                        : "border-feedback-info-border bg-feedback-info text-feedback-info-foreground",
                  )}
                >
                  <CircleAlertIcon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium leading-4">{item.title}</span>
                  <span className="block truncate text-[0.6875rem] leading-4 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                <ArrowRightIcon aria-hidden="true" className="ml-auto size-4 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </DashboardCard>
  )
}

function FlowCard({
  flow,
  onNavigateAgenda,
}: {
  flow: readonly DashboardFlowItem[]
  onNavigateAgenda: WorkspaceOverviewProps["onNavigateAgenda"]
}) {
  return (
    <DashboardCard
      description="Distribuição pelos estados atuais da Agenda."
      title="Fluxo dos atendimentos"
    >
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-7">
        {flow.map((item) => (
          <button
            key={item.id}
            type="button"
            className="min-h-16 cursor-pointer rounded-lg border p-2 text-center outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            onClick={() => onNavigateAgenda(item.status ? { status: item.status } : undefined)}
          >
            <FlowIcon status={item.id} statusClassName={item.statusClassName} />
            <span className="mt-1 block truncate text-[0.6875rem] text-muted-foreground">
              {item.label}
            </span>
            <span className="block text-lg font-semibold leading-5 tabular-nums">{item.count}</span>
          </button>
        ))}
      </div>
    </DashboardCard>
  )
}

function ProfessionalsCard({
  onNavigateAgenda,
  professionals,
}: {
  onNavigateAgenda: WorkspaceOverviewProps["onNavigateAgenda"]
  professionals: WorkspaceOverviewModel["professionals"]
}) {
  return (
    <DashboardCard
      description="Minutos reservados sobre a disponibilidade do período, sem ranking."
      title="Ocupação dos barbeiros"
    >
      <DataTable
        aria-label="Ocupação dos barbeiros"
        className="max-h-44 shadow-none"
        tableClassName="text-xs [&_td]:py-1 [&_th]:py-1.5"
      >
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>Barbeiro</DataTableHeaderCell>
            <DataTableHeaderCell>Atendimentos</DataTableHeaderCell>
            <DataTableHeaderCell>Ocupação</DataTableHeaderCell>
            <DataTableHeaderCell>Valor em estado pago</DataTableHeaderCell>
            <DataTableHeaderCell>Estado atual</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {professionals.map((professional) => (
            <DataTableRow key={professional.id}>
              <DataTableCell>
                <button
                  type="button"
                  className="inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-md text-left font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => onNavigateAgenda({ professionalId: professional.id })}
                >
                  <DashboardAvatar name={professional.name} />
                  {professional.name}
                </button>
              </DataTableCell>
              <DataTableCell className="whitespace-nowrap text-xs">
                {professional.appointmentCount} atendimentos
              </DataTableCell>
              <DataTableCell className="min-w-36">
                <Progress className="gap-1" value={clampPercent(professional.occupancyPercent)}>
                  <ProgressLabel className="sr-only">
                    {professional.bookedMinutes} min reservados
                  </ProgressLabel>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {professional.occupancyPercent}%
                  </span>
                </Progress>
              </DataTableCell>
              <DataTableCell>{professional.paidValue}</DataTableCell>
              <DataTableCell>
                <StatusBadge tone={professional.stateTone}>{professional.state}</StatusBadge>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </DashboardCard>
  )
}

function CapacityCard({ capacity }: { capacity: WorkspaceOverviewModel["capacity"] }) {
  return (
    <DashboardCard
      description="Disponibilidade líquida de pausas e bloqueios."
      title="Capacidade do período"
    >
      <div className="flex flex-col gap-2.5">
        {capacity.bands.map((band) => (
          <Progress key={band.id} value={clampPercent(band.occupancyPercent)}>
            <ProgressLabel>
              {band.label} <span className="font-normal text-muted-foreground">({band.range})</span>
            </ProgressLabel>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {band.occupancyPercent}%
            </span>
          </Progress>
        ))}
        <dl className="grid grid-cols-3 gap-1.5 border-t pt-2 text-xs">
          <DurationStat label="Disponível" value={capacity.availableMinutes} />
          <DurationStat label="Reservado" value={capacity.bookedMinutes} />
          <DurationStat label="Livre" value={capacity.freeMinutes} />
        </dl>
      </div>
    </DashboardCard>
  )
}

function FinanceCard({ finance }: { finance: WorkspaceOverviewModel["finance"] }) {
  return (
    <DashboardCard
      description="Projeções de preço e estado visual; não representam contabilidade."
      title="Financeiro operacional"
    >
      <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <TextStat label="Valor em estado pago" value={finance.paidValue} />
        <TextStat label="Valor agendado" value={finance.scheduledValue} />
        <TextStat label="Concluído pendente" value={finance.pendingCompletedValue} />
        <UnavailableStat label="Descontos" />
      </dl>
      <div className="mt-2 border-t pt-2">
        <h3 className="text-xs font-medium">Formas de pagamento</h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Indisponível — a fonte atual não informa a forma de pagamento.
        </p>
      </div>
    </DashboardCard>
  )
}

function ServicesCard({
  onNavigateServices,
  services,
}: {
  onNavigateServices: () => void
  services: WorkspaceOverviewModel["services"]
}) {
  return (
    <DashboardCard
      action={
        <Button type="button" size="sm" variant="outline" onClick={onNavigateServices}>
          <ScissorsIcon data-icon="inline-start" />
          Ver serviços
        </Button>
      }
      description="Até cinco serviços, ordenados pela quantidade."
      title="Serviços do período"
    >
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum serviço no período.</p>
      ) : (
        <DataTable
          aria-label="Serviços do período"
          className="max-h-44 shadow-none"
          tableClassName="text-xs [&_td]:py-1.5 [&_th]:py-1.5"
        >
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Serviço</DataTableHeaderCell>
              <DataTableHeaderCell>Quantidade</DataTableHeaderCell>
              <DataTableHeaderCell>Agendado</DataTableHeaderCell>
              <DataTableHeaderCell>Pago</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {services.map((service) => (
              <DataTableRow key={service.id}>
                <DataTableCell className="font-medium">{service.name}</DataTableCell>
                <DataTableCell>{service.count}</DataTableCell>
                <DataTableCell>{service.scheduledValue}</DataTableCell>
                <DataTableCell>{service.paidValue}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </DashboardCard>
  )
}

function CancellationsCard({
  cancellations,
}: {
  cancellations: WorkspaceOverviewModel["cancellations"]
}) {
  return (
    <DashboardCard
      description="Valor potencial dos horários, não receita reconhecida perdida."
      title="Cancelamentos e no-show"
    >
      <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <TextStat label="Cancelamentos" value={String(cancellations.canceledCount)} />
        <TextStat label="No-show" value={String(cancellations.noShowCount)} />
        <TextStat label="Taxa no período" value={cancellations.rate} />
        <TextStat label="Valor potencial" value={cancellations.potentialValue} />
      </dl>
    </DashboardCard>
  )
}

function ClientsCard({
  clients,
  onNavigateClients,
}: {
  clients: WorkspaceOverviewModel["clients"]
  onNavigateClients?: () => void
}) {
  return (
    <DashboardCard
      action={
        onNavigateClients ? (
          <Button type="button" size="sm" variant="outline" onClick={onNavigateClients}>
            <UsersIcon data-icon="inline-start" />
            Ver clientes
          </Button>
        ) : undefined
      }
      description="Atividade observada apenas dentro do período selecionado."
      title="Clientes do período"
    >
      <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <TextStat label="Clientes concluídos únicos" value={String(clients.completedUniqueCount)} />
        <UnavailableStat label="Clientes novos" />
        <TextStat
          label="Mais de um atendimento no período"
          value={String(clients.repeatedInPeriodCount)}
        />
      </dl>
      <p className="mt-2 text-xs leading-4 text-muted-foreground">
        A fonte atual não comprova primeira visita nem retenção de longo prazo.
      </p>
    </DashboardCard>
  )
}

function DashboardCard({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <Card size="sm" className="min-w-0 gap-2">
      <CardHeader className="gap-0.5">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription className="text-xs leading-4 xl:sr-only">{description}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function DashboardAvatar({ name }: { name: string }) {
  return (
    <Avatar size="sm" aria-hidden="true">
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

function TextStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/40 p-2">
      <dt className="text-[0.6875rem] leading-4 text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function UnavailableStat({ label }: { label: string }) {
  return <TextStat label={label} value="Indisponível" />
}

function DurationStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/40 p-2 text-center">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{duration(value)}</dd>
    </div>
  )
}

function DashboardLoading() {
  return (
    <div aria-label="Carregando Dashboard" className="flex flex-col gap-4" role="status">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {["appointments", "completed", "paid-value", "paid-average", "occupancy"].map((id) => (
          <Skeleton className="h-32 w-full" key={id} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-80 w-full xl:col-span-2" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="grid min-h-64 place-items-center rounded-xl border border-destructive p-6 text-center"
      role="alert"
    >
      <div>
        <CircleAlertIcon aria-hidden="true" className="mx-auto size-8 text-destructive" />
        <h2 className="mt-3 font-semibold">Não foi possível carregar o Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tente novamente.</p>
        <Button className="mt-4" type="button" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}

function DashboardDisabled() {
  return (
    <div
      className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"
      role="status"
    >
      O Dashboard operacional está desativado neste ambiente porque a fonte de agendamentos não está
      disponível.
    </div>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR")
}

function duration(value: number) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function FlowIcon({ status, statusClassName }: { status: string; statusClassName: string }) {
  const Icon = flowIcons[status as keyof typeof flowIcons] ?? CircleAlertIcon
  return (
    <span
      aria-hidden="true"
      className={cn("mx-auto grid size-7 place-items-center rounded-full border", statusClassName)}
    >
      <Icon className="size-3.5" />
    </span>
  )
}

const flowIcons = {
  arrived: UsersRoundIcon,
  canceled: CircleAlertIcon,
  completed: CheckCircle2Icon,
  "in-progress": GaugeIcon,
  "no-show": CircleMinusIcon,
  "scheduled-confirmed": CalendarDaysIcon,
  waiting: Clock3Icon,
} as const

function shortDate(value: string) {
  const [year, month, day] = value.split("-")
  return year && month && day ? `${day}/${month}` : value
}
