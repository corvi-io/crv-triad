import {
  CalendarPlusIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  ScissorsIcon,
  UserRoundIcon,
} from "lucide-react"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@/modules/shared/components/kibo-ui/kanban"
import { Button } from "@/modules/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/dropdown-menu"
import { cn } from "@/modules/shared/lib/utils"
import { type AgendaColumnId, type AgendaResult, agendaColumns, columnForStatus } from "./agenda"
import type { Appointment, Professional, Service } from "./contracts"
import { appointmentStatusPresentation } from "./status"

type KanbanAppointment = Appointment & { column: AgendaColumnId; name: string }

export function AgendaKanban({
  announcement,
  dateLabel,
  onAdd,
  onEdit,
  onOpen,
  onTransitionRequest,
  pendingAppointmentId,
  professionals,
  result,
  services,
}: {
  announcement: string
  dateLabel: string
  onAdd: () => void
  onEdit: (appointment: Appointment) => void
  onOpen: (appointment: Appointment) => void
  onTransitionRequest: (appointment: Appointment, column?: AgendaColumnId) => void
  pendingAppointmentId?: string
  professionals: readonly Professional[]
  result: AgendaResult
  services: readonly Service[]
}) {
  const items: KanbanAppointment[] = result.boardAppointments.map((appointment) => ({
    ...appointment,
    column: columnForStatus(appointment.status) ?? "confirmed",
    name: `${appointment.customerName}, ${appointment.start}`,
  }))
  const columns = agendaColumns.map(({ id, label }) => ({ id, name: label }))

  function handleDataChange(next: KanbanAppointment[]) {
    const moved = next.find((candidate) => {
      const current = items.find(({ id }) => id === candidate.id)
      return current && current.column !== candidate.column
    })
    if (!moved || moved.id === pendingAppointmentId) return
    const appointment = result.boardAppointments.find(({ id }) => id === moved.id)
    if (appointment) onTransitionRequest(appointment, moved.column)
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Arraste pelo controle do cartão ou use “Alterar status”. A rolagem horizontal preserva
        cartões legíveis em telas estreitas.
      </p>
      <div
        className="min-h-[30rem] overflow-x-auto rounded-lg border bg-muted/30 p-3"
        data-testid="agenda-kanban-scroll"
      >
        <KanbanProvider
          className="min-w-[94rem] items-stretch min-[1440px]:min-w-0"
          columns={columns}
          data={items}
          onDataChange={handleDataChange}
        >
          {(column) => {
            const definition = agendaColumns.find(({ id }) => id === column.id)
            const count = definition ? result.counts[definition.id] : 0
            const status = definition?.statuses[0] ?? "confirmed"
            const presentation = appointmentStatusPresentation[status]
            const StatusIcon = presentation.icon
            return (
              <KanbanBoard
                aria-labelledby={`kanban-column-${column.id}`}
                className="w-[15rem] min-w-[15rem] bg-card min-[1440px]:w-auto min-[1440px]:min-w-0 min-[1440px]:flex-1"
                id={column.id}
                key={column.id}
              >
                <KanbanHeader className="flex items-center gap-2 border-b">
                  <StatusIcon aria-hidden="true" />
                  <h2 className="min-w-0 flex-1 text-sm" id={`kanban-column-${column.id}`}>
                    {column.name}
                  </h2>
                  <span className="rounded-full border px-2 py-0.5 tabular-nums" data-column-count>
                    <span aria-hidden="true">{count}</span>
                    <span className="sr-only">{count} agendamentos</span>
                  </span>
                </KanbanHeader>
                <KanbanCards<KanbanAppointment> id={column.id}>
                  {(appointment) => (
                    <AppointmentKanbanCard
                      appointment={appointment}
                      disabled={pendingAppointmentId === appointment.id}
                      key={appointment.id}
                      professional={professionals.find(
                        ({ id }) => id === appointment.professionalId,
                      )}
                      service={services.find(({ id }) => id === appointment.serviceId)}
                      onEdit={() => onEdit(appointment)}
                      onOpen={() => onOpen(appointment)}
                      onTransition={(target) => onTransitionRequest(appointment, target)}
                    />
                  )}
                </KanbanCards>
                {count === 0 ? (
                  <p className="m-2 rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Nenhum agendamento neste status.
                  </p>
                ) : null}
              </KanbanBoard>
            )
          }}
        </KanbanProvider>
      </div>

      {result.scheduledOutsideBoard > 0 ? (
        <p
          role="note"
          className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
        >
          {result.scheduledOutsideBoard} agendamento(s) permanecem com o status “Agendado” e ficam
          fora das seis colunas até confirmação.
        </p>
      ) : null}

      <section
        aria-label="Resumo operacional"
        className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Resumo da agenda</h2>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>
          <Button type="button" variant="outline" onClick={onAdd}>
            <CalendarPlusIcon data-icon="inline-start" />
            Adicionar agendamento
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {agendaColumns.map((column) => (
            <span className="rounded-md border bg-background px-2 py-1 text-xs" key={column.id}>
              {column.label}: <strong>{result.counts[column.id]}</strong>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>
            <strong>{result.total}</strong> atendimentos visíveis
          </span>
          <span>
            Valor visível: <strong>{formatPrice(result.totalValueCents)}</strong>
          </span>
        </div>
      </section>
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

function AppointmentKanbanCard({
  appointment,
  disabled,
  onEdit,
  onOpen,
  onTransition,
  professional,
  service,
}: {
  appointment: KanbanAppointment
  disabled: boolean
  onEdit: () => void
  onOpen: () => void
  onTransition: (column?: AgendaColumnId) => void
  professional?: Professional
  service?: Service
}) {
  const presentation = appointmentStatusPresentation[appointment.status]
  const cancellationLabel = appointment.cancellationReason
    ? { barbershop: "Barbearia cancelou", client: "Cliente cancelou", "no-show": "Não compareceu" }[
        appointment.cancellationReason
      ]
    : undefined
  return (
    <KanbanCard
      aria-label={`${appointment.customerName}, ${appointment.start}, ${presentation.label}`}
      className={cn("gap-3 p-3", disabled && "opacity-60")}
      column={appointment.column}
      data-appointment-id={appointment.id}
      data-appointment-status={appointment.status}
      dragHandle={<GripVerticalIcon aria-hidden="true" />}
      dragHandleLabel={`Mover agendamento de ${appointment.customerName}`}
      id={appointment.id}
      name={appointment.name}
    >
      <div className="flex items-start gap-2">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold"
          aria-hidden="true"
        >
          {initials(appointment.customerName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold">{appointment.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {appointment.rating ? `★ ${appointment.rating.toFixed(1)} · ` : ""}
            {appointment.start}
          </p>
        </div>
        <AppointmentMenu
          appointment={appointment}
          disabled={disabled}
          onEdit={onEdit}
          onOpen={onOpen}
          onTransition={onTransition}
        />
      </div>
      <div className="flex flex-col gap-1 text-xs">
        <p className="flex items-center gap-1">
          <ScissorsIcon aria-hidden="true" /> {service?.name ?? "Serviço sintético"}
        </p>
        <p className="flex items-center gap-1">
          <UserRoundIcon aria-hidden="true" /> {professional?.name ?? "Profissional sintético"}
        </p>
        <p className="flex items-center gap-1">
          <Clock3Icon aria-hidden="true" /> {appointment.durationMinutes} min ·{" "}
          {formatPrice(appointment.priceCents)}
        </p>
      </div>
      {appointment.notes ? (
        <p className="break-words rounded-md bg-muted p-2 text-xs">{appointment.notes}</p>
      ) : null}
      <div className="flex flex-wrap gap-1">
        <StatusBadge tone={toneForStatus(appointment.status)}>{presentation.label}</StatusBadge>
        <StatusBadge tone={appointment.paymentStatus === "paid" ? "success" : "warning"}>
          {appointment.paymentStatus === "paid" ? "Pago" : "Pagamento pendente"}
        </StatusBadge>
        {cancellationLabel ? <StatusBadge tone="danger">{cancellationLabel}</StatusBadge> : null}
        {appointment.tags.map((tag) => (
          <StatusBadge key={tag}>{tag}</StatusBadge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} size="sm" type="button" variant="outline" onClick={onOpen}>
          Ver detalhes
        </Button>
        {appointment.status === "in-progress" ? (
          <Button
            disabled={disabled}
            size="sm"
            type="button"
            onClick={() => onTransition("completed")}
          >
            Finalizar
          </Button>
        ) : null}
      </div>
    </KanbanCard>
  )
}

function AppointmentMenu({
  appointment,
  disabled,
  onEdit,
  onOpen,
  onTransition,
}: {
  appointment: Appointment
  disabled: boolean
  onEdit: () => void
  onOpen: () => void
  onTransition: (column?: AgendaColumnId) => void
}) {
  const isTerminal = appointment.status === "canceled" || appointment.status === "no-show"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Ações de ${appointment.customerName}`}
            disabled={disabled}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontalIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Ações do agendamento</DropdownMenuLabel>
          <DropdownMenuItem onClick={onOpen}>Ver detalhes</DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>Editar agendamento</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTransition()}>Alterar status</DropdownMenuItem>
          {!isTerminal ? (
            <>
              <DropdownMenuItem onClick={() => onTransition("canceled-no-show")}>
                Cancelar atendimento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTransition("canceled-no-show")}>
                Marcar como no-show
              </DropdownMenuItem>
            </>
          ) : null}
          {appointment.status === "in-progress" ? (
            <DropdownMenuItem onClick={() => onTransition("completed")}>
              Finalizar atendimento
            </DropdownMenuItem>
          ) : null}
          {appointment.paymentStatus === "pending" ? (
            <DropdownMenuItem onClick={() => onTransition("completed")}>
              <CircleDollarSignIcon aria-hidden="true" /> Registrar pagamento
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function toneForStatus(status: Appointment["status"]) {
  if (status === "canceled" || status === "no-show") return "danger" as const
  if (status === "completed" || status === "confirmed") return "success" as const
  if (status === "waiting") return "warning" as const
  if (status === "in-progress" || status === "arrived") return "info" as const
  return "neutral" as const
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(value / 100)
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR")
}
