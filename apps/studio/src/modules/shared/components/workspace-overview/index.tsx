import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  PlusIcon,
  ScissorsIcon,
  UsersIcon,
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
  hasActiveFilters?: boolean
  model?: WorkspaceOverviewModel
  onFiltersChange: (next: Partial<DashboardFilters>) => void
  onNavigateAgenda: (filters?: { professionalId?: string; status?: string }) => void
  onNavigateClients?: () => void
  onNavigateServices: () => void
  onNewAppointment: () => void
  onOpenAppointment: (id: string) => void
  onRetry: () => void
  state: "disabled" | "error" | "loading" | "ready"
}

export function WorkspaceOverview({
  hasActiveFilters = false,
  model,
  onFiltersChange,
  onNavigateAgenda,
  onNavigateClients,
  onNavigateServices,
  onNewAppointment,
  onOpenAppointment,
  onRetry,
  state,
}: WorkspaceOverviewProps) {
  return (
    <ModuleLayout
      bodyViewportClassName="flex flex-col gap-4 pb-6"
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
          onNavigateServices={onNavigateServices}
          onNewAppointment={onNewAppointment}
          onOpenAppointment={onOpenAppointment}
        />
      ) : null}
    </ModuleLayout>
  )
}

function DashboardReady({
  hasActiveFilters,
  model,
  onFiltersChange,
  onNavigateAgenda,
  onNavigateClients,
  onNavigateServices,
  onNewAppointment,
  onOpenAppointment,
}: Omit<WorkspaceOverviewProps, "model" | "onRetry" | "state"> & {
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <UpcomingCard
          appointments={model.upcoming}
          onNavigateAgenda={onNavigateAgenda}
          onOpenAppointment={onOpenAppointment}
        />
        <AttentionCard
          attention={model.attention}
          onNavigateAgenda={onNavigateAgenda}
          onOpenAppointment={onOpenAppointment}
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(22rem,1fr)_minmax(0,1.35fr)]">
        <FlowCard flow={model.flow} onNavigateAgenda={onNavigateAgenda} />
        <ProfessionalsCard
          professionals={model.professionals}
          onNavigateAgenda={onNavigateAgenda}
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <CapacityCard capacity={model.capacity} />
        <FinanceCard finance={model.finance} />
        <ServicesCard services={model.services} onNavigateServices={onNavigateServices} />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <CancellationsCard cancellations={model.cancellations} />
        <ClientsCard clients={model.clients} onNavigateClients={onNavigateClients} />
      </div>
    </>
  )
}

function MetricSurface({ metric, onOpen }: { metric: DashboardMetric; onOpen: () => void }) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle>
          <h3 className="text-sm text-muted-foreground">{metric.label}</h3>
        </CardTitle>
        <CardAction>
          <Button
            aria-label={`Abrir ${metric.label} na Agenda`}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={onOpen}
          >
            <ArrowRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{metric.value}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.description}</p>
      </CardContent>
    </Card>
  )
}

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
        <DataTable aria-label="Próximos atendimentos" className="max-h-80 shadow-none">
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Horário</DataTableHeaderCell>
              <DataTableHeaderCell>Cliente</DataTableHeaderCell>
              <DataTableHeaderCell>Serviço</DataTableHeaderCell>
              <DataTableHeaderCell>Barbeiro</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {appointments.map((appointment) => (
              <DataTableRow key={appointment.id}>
                <DataTableCell className="whitespace-nowrap tabular-nums">
                  {appointment.date} · {appointment.start}
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
                <DataTableCell>{appointment.professionalName}</DataTableCell>
                <DataTableCell>
                  <StatusBadge className={appointment.statusClassName}>
                    {appointment.status}
                  </StatusBadge>
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
  onNavigateAgenda,
  onOpenAppointment,
}: {
  attention: WorkspaceOverviewModel["attention"]
  onNavigateAgenda: WorkspaceOverviewProps["onNavigateAgenda"]
  onOpenAppointment: WorkspaceOverviewProps["onOpenAppointment"]
}) {
  return (
    <DashboardCard
      action={
        <Button type="button" size="sm" variant="ghost" onClick={() => onNavigateAgenda()}>
          Ver todos
        </Button>
      }
      description="Somente situações sustentadas pelos dados atuais."
      title="Atenção necessária"
    >
      {attention.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Nenhuma situação acionável no período.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attention.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                onClick={() =>
                  item.appointmentId ? onOpenAppointment(item.appointmentId) : onNavigateAgenda()
                }
              >
                <CircleAlertIcon
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    item.tone === "danger"
                      ? "text-destructive"
                      : item.tone === "warning"
                        ? "text-feedback-warning-foreground"
                        : "text-feedback-info-foreground",
                  )}
                />
                <span className="min-w-0">
                  <span className="block font-medium">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {flow.map((item) => (
          <button
            key={item.id}
            type="button"
            className="min-h-14 cursor-pointer rounded-lg border p-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            onClick={() => onNavigateAgenda({ status: item.status })}
          >
            <span className="flex items-center justify-between gap-2">
              <StatusBadge className={item.statusClassName}>{item.label}</StatusBadge>
              <span className="font-semibold tabular-nums">{item.count}</span>
            </span>
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
      <DataTable aria-label="Ocupação dos barbeiros" className="max-h-96 shadow-none">
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
              <DataTableCell>{professional.appointmentCount}</DataTableCell>
              <DataTableCell className="min-w-48">
                <Progress value={clampPercent(professional.occupancyPercent)}>
                  <ProgressLabel>{professional.bookedMinutes} min reservados</ProgressLabel>
                  <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                    {professional.occupancyPercent}%
                  </span>
                </Progress>
              </DataTableCell>
              <DataTableCell>{professional.paidValue}</DataTableCell>
              <DataTableCell>{professional.state}</DataTableCell>
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
      <div className="flex flex-col gap-4">
        {capacity.bands.map((band) => (
          <Progress key={band.id} value={clampPercent(band.occupancyPercent)}>
            <ProgressLabel>
              {band.label} <span className="font-normal text-muted-foreground">({band.range})</span>
            </ProgressLabel>
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {band.occupancyPercent}%
            </span>
          </Progress>
        ))}
        <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
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
      <dl className="grid grid-cols-2 gap-3">
        <TextStat label="Valor em estado pago" value={finance.paidValue} />
        <TextStat label="Valor agendado" value={finance.scheduledValue} />
        <TextStat label="Concluído pendente" value={finance.pendingCompletedValue} />
        <UnavailableStat label="Descontos" />
      </dl>
      <div className="mt-4 border-t pt-3">
        <h3 className="text-xs font-medium">Formas de pagamento</h3>
        <p className="mt-2 text-sm text-muted-foreground">
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
        <ul className="flex flex-col gap-3">
          {services.map((service) => (
            <li
              key={service.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b pb-3 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{service.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Valor agendado {service.scheduledValue} · Valor em estado pago {service.paidValue}
                </p>
              </div>
              <span className="tabular-nums">{service.count}</span>
            </li>
          ))}
        </ul>
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
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TextStat label="Clientes concluídos únicos" value={String(clients.completedUniqueCount)} />
        <UnavailableStat label="Clientes novos" />
        <TextStat
          label="Mais de um atendimento no período"
          value={String(clients.repeatedInPeriodCount)}
        />
      </dl>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
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
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
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
    <div className="min-w-0 rounded-lg bg-muted/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function UnavailableStat({ label }: { label: string }) {
  return <TextStat label={label} value="Indisponível" />
}

function DurationStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
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
