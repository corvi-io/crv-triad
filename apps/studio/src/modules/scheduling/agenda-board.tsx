import type {
  Announcements,
  CollisionDetection,
  KeyboardCoordinateGetter,
  Over,
  UniqueIdentifier,
} from "@dnd-kit/core"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { GripVerticalIcon, MoreHorizontalIcon } from "lucide-react"
import { useMemo, useRef, useState, useSyncExternalStore } from "react"

import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
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
import type { AgendaColumnId } from "./agenda"
import { AgendaAvatar } from "./agenda-avatar"
import type { Appointment, Professional, ScheduleDay, Service } from "./contracts"
import { appointmentStatusPresentation, isTerminalAppointmentStatus } from "./status"

export type AgendaDropDestination = { professionalId: string; start: string }

type SlotDropData = AgendaDropDestination & {
  kind: "agenda-slot"
  professionalIndex: number
  professionalName: string
  slotIndex: number
}

type AppointmentDragData = {
  appointment: Appointment
  kind: "agenda-appointment"
  professionalIndex: number
  slotIndex: number
}

type AgendaKeyboardCursor = {
  activeId: UniqueIdentifier
  slot: SlotDropData
}

type AgendaKeyboardCursorRef = {
  current: AgendaKeyboardCursor | null
}

export function AgendaBoard({
  day,
  isReschedulePending,
  onAnnouncement,
  onAppointment,
  onReschedule,
  onSlot,
  onTransitionRequest,
}: {
  day: ScheduleDay
  isReschedulePending: boolean
  onAnnouncement: (message: string) => void
  onAppointment: (appointment: Appointment) => void
  onReschedule: (appointment: Appointment, destination: AgendaDropDestination) => void
  onSlot: (slot: AgendaDropDestination) => void
  onTransitionRequest: (appointment: Appointment, column?: AgendaColumnId) => void
}) {
  const slots = useMemo(() => makeSlots(day.startTime, day.endTime), [day.endTime, day.startTime])
  const services = useMemo(
    () => new Map(day.services.map((service) => [service.id, service])),
    [day.services],
  )
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)
  const reduceMotion = useReducedMotion()
  const keyboardCursorRef = useRef<AgendaKeyboardCursor | null>(null)
  const keyboardCoordinateGetter = useMemo(
    () => createAgendaKeyboardCoordinates(keyboardCursorRef),
    [],
  )
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinateGetter,
      scrollBehavior: "auto",
    }),
  )
  const professionalNames = useMemo(
    () => new Map(day.professionals.map(({ id, name }) => [id, name])),
    [day.professionals],
  )
  const announcements = useMemo<Announcements>(
    () => ({
      onDragStart({ active }) {
        const appointment = appointmentFromDragData(active.data.current)
        return appointment
          ? `Agendamento de ${appointment.customerName} selecionado para remarcação.`
          : "Agendamento selecionado para remarcação."
      },
      onDragOver({ active, over }) {
        const appointment = appointmentFromDragData(active.data.current)
        const destination = slotFromOver(over)
        if (!destination) {
          return appointment
            ? `Agendamento de ${appointment.customerName} fora de um horário válido.`
            : "Destino inválido."
        }
        return `Destino ${destination.start} com ${destination.professionalName} para ${appointment?.customerName ?? "o agendamento"}.`
      },
      onDragEnd({ active, over }) {
        const appointment = appointmentFromDragData(active.data.current)
        const destination = slotFromOver(over)
        if (!destination) return "Remarcação rejeitada porque o destino é inválido."
        return `Destino ${destination.start} com ${destination.professionalName} escolhido para ${appointment?.customerName ?? "o agendamento"}.`
      },
      onDragCancel({ active }) {
        const appointment = appointmentFromDragData(active.data.current)
        return `Remarcação de ${appointment?.customerName ?? "agendamento"} cancelada.`
      },
    }),
    [],
  )

  return (
    <DndContext
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Para remarcar, pressione Espaço. Use as setas para escolher horário e barbeiro, pressione Espaço para confirmar ou Escape para cancelar.",
        },
      }}
      collisionDetection={agendaCollisionDetection}
      sensors={sensors}
      onDragCancel={() => {
        keyboardCursorRef.current = null
        setActiveAppointment(null)
        onAnnouncement("Remarcação cancelada.")
      }}
      onDragEnd={({ active, delta, over }) => {
        keyboardCursorRef.current = null
        setActiveAppointment(null)
        const appointment = appointmentFromDragData(active.data.current)
        if (appointment && delta.x === 0 && delta.y === 0) {
          onAnnouncement("O agendamento já está nesse horário e barbeiro.")
          return
        }
        const destination = slotFromOver(over)
        if (!appointment || !destination) {
          onAnnouncement("Destino inválido. O agendamento não foi alterado.")
          return
        }
        onReschedule(appointment, destination)
      }}
      onDragStart={({ active }) => {
        const appointment = appointmentFromDragData(active.data.current)
        setActiveAppointment(appointment ?? null)
        if (appointment) {
          onAnnouncement(
            `Remarcando ${appointment.customerName}. Use as setas para escolher horário e barbeiro.`,
          )
        }
      }}
    >
      <section
        aria-label={`Quadro da agenda de ${day.date}`}
        className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-card"
        data-testid="agenda-board"
      >
        <div className="h-full max-h-[calc(100vh-13rem)] overflow-auto">
          <table
            className="w-full table-fixed border-collapse text-sm"
            style={{ minWidth: `${80 + day.professionals.length * 196}px` }}
          >
            <caption className="sr-only">
              Horários em linhas e barbeiros em colunas, em intervalos de quinze minutos.
            </caption>
            <colgroup>
              <col className="w-20" />
              {day.professionals.map((professional) => (
                <col className="w-[12.25rem]" key={professional.id} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-50 bg-card">
              <tr>
                <th className="sticky left-0 z-30 min-w-20 border-r border-b bg-card px-3 py-4 text-left text-xs font-medium text-muted-foreground">
                  Horário
                </th>
                {day.professionals.map((professional) => (
                  <ProfessionalHeading
                    appointmentCount={
                      day.appointments.filter(
                        ({ professionalId }) => professionalId === professional.id,
                      ).length
                    }
                    key={professional.id}
                    professional={professional}
                    unitName={day.unitName}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, slotIndex) => (
                <tr className="h-9" key={slot}>
                  <th
                    className="sticky left-0 z-40 h-9 border-r border-b bg-card px-3 text-left text-xs font-medium tabular-nums text-muted-foreground"
                    scope="row"
                  >
                    {slot}
                  </th>
                  {day.professionals.map((professional, professionalIndex) => (
                    <ScheduleCell
                      day={day}
                      isReschedulePending={isReschedulePending}
                      key={professional.id}
                      professional={professional}
                      professionalIndex={professionalIndex}
                      service={services}
                      slot={slot}
                      slotIndex={slotIndex}
                      slots={slots}
                      onAppointment={onAppointment}
                      onSlot={onSlot}
                      onTransitionRequest={onTransitionRequest}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <DragOverlay dropAnimation={reduceMotion ? null : undefined}>
        {activeAppointment ? (
          <AppointmentDragPreview
            appointment={activeAppointment}
            professionalName={professionalNames.get(activeAppointment.professionalId)}
            service={services.get(activeAppointment.serviceId)}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function ProfessionalHeading({
  appointmentCount,
  professional,
  unitName,
}: {
  appointmentCount: number
  professional: Professional
  unitName: string
}) {
  return (
    <th className="border-r border-b bg-card px-3 py-2 text-left" scope="col">
      <div className="flex items-center gap-2">
        <AgendaAvatar name={professional.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{professional.name}</p>
          <p className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
            Unidade {unitName}
            <span className="text-feedback-success-foreground" aria-hidden="true">
              ●
            </span>
            <span aria-hidden="true" className="tabular-nums">
              {appointmentCount}
            </span>
            <span className="sr-only">{appointmentCount} agendamentos</span>
          </p>
        </div>
      </div>
    </th>
  )
}

function ScheduleCell({
  day,
  isReschedulePending,
  onAppointment,
  onSlot,
  onTransitionRequest,
  professional,
  professionalIndex,
  service,
  slot,
  slotIndex,
  slots,
}: {
  day: ScheduleDay
  isReschedulePending: boolean
  onAppointment: (appointment: Appointment) => void
  onSlot: (slot: AgendaDropDestination) => void
  onTransitionRequest: (appointment: Appointment, column?: AgendaColumnId) => void
  professional: Professional
  professionalIndex: number
  service: ReadonlyMap<string, Service>
  slot: string
  slotIndex: number
  slots: readonly string[]
}) {
  const appointment = day.appointments.find(
    (item) => item.professionalId === professional.id && item.start === slot,
  )
  const occupancy = day.occupancies.find(
    (item) => item.professionalId === professional.id && item.start === slot,
  )
  const period = day.periods.find(
    (item) => item.professionalId === professional.id && item.start === slot,
  )
  const slotMinutes = toMinutes(slot)
  const coveredByAppointment = day.appointments.some(
    (item) =>
      item.professionalId === professional.id &&
      slotMinutes > toMinutes(item.start) &&
      slotMinutes < toMinutes(item.start) + item.durationMinutes,
  )
  const coveredByOccupancy = day.occupancies.some(
    (item) =>
      item.professionalId === professional.id &&
      slotMinutes > toMinutes(item.start) &&
      slotMinutes < toMinutes(item.start) + item.durationMinutes,
  )
  const coveredByPeriod = day.periods.some(
    (item) =>
      item.professionalId === professional.id &&
      slotMinutes > toMinutes(item.start) &&
      slotMinutes < toMinutes(item.end),
  )
  if (coveredByAppointment || coveredByOccupancy || coveredByPeriod) return null

  if (appointment) {
    const rowSpan = Math.ceil(appointment.durationMinutes / 15)
    return (
      <td className="border-r border-b p-1 align-top" rowSpan={rowSpan}>
        <div className="relative" style={{ height: spannedContentHeight(rowSpan) }}>
          <SpannedDropTargets
            professional={professional}
            professionalIndex={professionalIndex}
            slotIndex={slotIndex}
            slots={slots.slice(slotIndex, slotIndex + rowSpan)}
          />
          <AppointmentCard
            appointment={appointment}
            isReschedulePending={isReschedulePending}
            professionalIndex={professionalIndex}
            rowSpan={rowSpan}
            service={service.get(appointment.serviceId)}
            slotIndex={slotIndex}
            onAppointment={() => onAppointment(appointment)}
            onTransition={() => onTransitionRequest(appointment)}
          />
        </div>
      </td>
    )
  }

  if (occupancy) {
    const rowSpan = Math.ceil(occupancy.durationMinutes / 15)
    return (
      <td className="border-r border-b p-1 align-top" rowSpan={rowSpan}>
        <div className="relative" style={{ height: spannedContentHeight(rowSpan) }}>
          <SpannedDropTargets
            professional={professional}
            professionalIndex={professionalIndex}
            slotIndex={slotIndex}
            slots={slots.slice(slotIndex, slotIndex + rowSpan)}
          />
          <div className="relative z-10 flex h-full items-center rounded-md border border-dashed bg-muted p-2 text-xs text-muted-foreground">
            Ocupado · {occupancy.start}–
            {fromMinutes(toMinutes(occupancy.start) + occupancy.durationMinutes)}
          </div>
        </div>
      </td>
    )
  }

  if (period) {
    const rowSpan = Math.ceil((toMinutes(period.end) - toMinutes(period.start)) / 15)
    return (
      <td className="border-r border-b p-1 align-top" rowSpan={rowSpan}>
        <div className="relative" style={{ height: spannedContentHeight(rowSpan) }}>
          <SpannedDropTargets
            professional={professional}
            professionalIndex={professionalIndex}
            slotIndex={slotIndex}
            slots={slots.slice(slotIndex, slotIndex + rowSpan)}
          />
          <div className="relative z-10 flex h-full items-center rounded-md border border-dashed bg-muted p-2 text-xs text-muted-foreground">
            {period.label} · {period.start}–{period.end}
          </div>
        </div>
      </td>
    )
  }

  return (
    <DroppableSlotButton
      professional={professional}
      professionalIndex={professionalIndex}
      slot={slot}
      slotIndex={slotIndex}
      onSlot={onSlot}
    />
  )
}

function AppointmentCard({
  appointment,
  isReschedulePending,
  onAppointment,
  onTransition,
  professionalIndex,
  rowSpan,
  service,
  slotIndex,
}: {
  appointment: Appointment
  isReschedulePending: boolean
  onAppointment: () => void
  onTransition: () => void
  professionalIndex: number
  rowSpan: number
  service?: Service
  slotIndex: number
}) {
  const isTerminal = isTerminalAppointmentStatus(appointment.status)
  const isDragDisabled = isTerminal || isReschedulePending
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef } = useDraggable({
    attributes: { roleDescription: "agendamento arrastável" },
    data: {
      appointment,
      kind: "agenda-appointment",
      professionalIndex,
      slotIndex,
    } satisfies AppointmentDragData,
    disabled: isDragDisabled,
    id: `appointment:${appointment.id}`,
  })
  const presentation = appointmentStatusPresentation[appointment.status]
  const end = fromMinutes(toMinutes(appointment.start) + appointment.durationMinutes)
  const layout = appointmentCardLayout(rowSpan)
  const serviceName = service?.name ?? "Serviço sintético"

  return (
    <div
      className={cn(
        "group relative z-10 flex h-full overflow-hidden rounded-md border-2",
        layout === "compact" && "items-center",
        layout === "medium" && "items-start gap-1 p-1 pr-8",
        layout === "full" && "items-start gap-2 p-2 pr-8",
        presentation.className,
        isDragging && "opacity-35",
      )}
      data-appointment-id={appointment.id}
      data-appointment-status={appointment.status}
      data-card-layout={layout}
      data-duration-minutes={appointment.durationMinutes}
      ref={setNodeRef}
    >
      {layout !== "compact" ? (
        <AgendaAvatar
          className={layout === "full" ? "mt-0.5" : undefined}
          name={appointment.customerName}
          size="sm"
        />
      ) : null}
      <button
        aria-label={`${appointment.customerName}, ${appointment.start} às ${end}, ${serviceName}, situação ${presentation.label}. Ver detalhes`}
        className={cn(
          "min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-inset",
          layout === "compact" && "flex h-full items-center gap-1 px-1 pr-12 text-xs",
        )}
        type="button"
        onClick={onAppointment}
      >
        {layout === "compact" ? (
          <>
            <span className="shrink-0 text-[0.68rem] tabular-nums">{appointment.start}</span>
            <span className="truncate font-semibold">{appointment.customerName}</span>
          </>
        ) : (
          <>
            <span className="flex items-start justify-between gap-1">
              <span className="truncate font-semibold">{appointment.customerName}</span>
              <span className="shrink-0 text-[0.68rem] tabular-nums">
                {appointment.start} – {end}
              </span>
            </span>
            {layout === "full" ? (
              <span className="mt-0.5 block truncate text-xs text-current/75">{serviceName}</span>
            ) : null}
            <span className="mt-1 flex">
              <StatusBadge tone={toneForStatus(appointment.status)}>
                {presentation.label}
              </StatusBadge>
            </span>
          </>
        )}
      </button>
      <button
        {...attributes}
        {...listeners}
        aria-label={
          isTerminal
            ? `Remarcação indisponível para ${appointment.customerName}`
            : isReschedulePending
              ? `Remarcação em andamento para ${appointment.customerName}`
              : `Remarcar ${appointment.customerName}`
        }
        className={cn(
          "absolute z-30 flex size-7 touch-none items-center justify-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-inset",
          layout === "compact" ? "top-0 right-0 size-6" : "right-1 bottom-1",
          isDragDisabled
            ? "cursor-not-allowed text-current/40"
            : "cursor-grab text-current/70 hover:bg-background/30 active:cursor-grabbing",
        )}
        data-drag-disabled={isDragDisabled || undefined}
        data-drag-handle
        disabled={isDragDisabled}
        ref={setActivatorNodeRef}
        type="button"
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>
      <AppointmentActions
        appointment={appointment}
        layout={layout}
        onOpen={onAppointment}
        onTransition={onTransition}
      />
    </div>
  )
}

function AppointmentDragPreview({
  appointment,
  professionalName,
  service,
}: {
  appointment: Appointment
  professionalName?: string
  service?: Service
}) {
  return (
    <div className="w-48 rounded-md border-2 border-primary bg-card p-3 text-card-foreground shadow-lg">
      <p className="truncate font-semibold text-sm">{appointment.customerName}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {appointment.start} · {professionalName ?? "Barbeiro"}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {service?.name ?? "Serviço sintético"}
      </p>
    </div>
  )
}

function DroppableSlotButton({
  onSlot,
  professional,
  professionalIndex,
  slot,
  slotIndex,
}: {
  onSlot: (slot: AgendaDropDestination) => void
  professional: Professional
  professionalIndex: number
  slot: string
  slotIndex: number
}) {
  const data = slotDropData(professional, professionalIndex, slot, slotIndex)
  const { isOver, setNodeRef } = useDroppable({ data, id: slotTargetId(data) })
  return (
    <td className="h-9 border-r border-b p-0.5">
      <button
        aria-label={`Novo agendamento às ${slot} com ${professional.name}`}
        className={cn(
          "size-full min-h-8 rounded-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          isOver && "bg-primary/15 ring-2 ring-primary ring-inset",
        )}
        data-drop-professional-id={professional.id}
        data-drop-start={slot}
        ref={setNodeRef}
        type="button"
        onClick={() => onSlot({ professionalId: professional.id, start: slot })}
      >
        <span className="sr-only">Horário disponível</span>
      </button>
    </td>
  )
}

function SpannedDropTargets({
  professional,
  professionalIndex,
  slotIndex,
  slots,
}: {
  professional: Professional
  professionalIndex: number
  slotIndex: number
  slots: readonly string[]
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      {slots.map((slot, segmentIndex) => (
        <SpannedDropTarget
          count={slots.length}
          data={slotDropData(professional, professionalIndex, slot, slotIndex + segmentIndex)}
          index={segmentIndex}
          key={slot}
        />
      ))}
    </div>
  )
}

function SpannedDropTarget({
  count,
  data,
  index,
}: {
  count: number
  data: SlotDropData
  index: number
}) {
  const { isOver, setNodeRef } = useDroppable({ data, id: slotTargetId(data) })
  return (
    <div
      className={cn(
        "absolute right-0 left-0 ring-inset",
        isOver && "bg-primary/15 ring-2 ring-primary",
      )}
      data-drop-professional-id={data.professionalId}
      data-drop-start={data.start}
      ref={setNodeRef}
      style={{ height: `${100 / count}%`, top: `${(index * 100) / count}%` }}
    />
  )
}

function AppointmentActions({
  appointment,
  layout,
  onOpen,
  onTransition,
}: {
  appointment: Appointment
  layout: AppointmentCardLayout
  onOpen: () => void
  onTransition: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Ações de ${appointment.customerName}`}
            className={cn(
              "absolute z-30 focus-visible:ring-inset",
              layout === "compact"
                ? "top-0 right-6 opacity-100"
                : "top-1 right-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100",
            )}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <MoreHorizontalIcon aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Ações do agendamento</DropdownMenuLabel>
          <DropdownMenuItem onClick={onOpen}>Ver detalhes</DropdownMenuItem>
          {!isTerminalAppointmentStatus(appointment.status) ? (
            <DropdownMenuItem onClick={onTransition}>Alterar status</DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const agendaCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  if (args.pointerCoordinates) return closestCenter(args)

  return args.droppableContainers
    .map((droppableContainer) => {
      const rect = args.droppableRects.get(droppableContainer.id)
      if (!rect) return undefined
      const x = rect.left - args.collisionRect.left
      const y = rect.top - args.collisionRect.top
      return {
        data: { droppableContainer, value: x * x + y * y },
        id: droppableContainer.id,
      }
    })
    .filter((collision) => collision !== undefined)
    .sort((first, second) => first.data.value - second.data.value)
}

export function createAgendaKeyboardCoordinates(
  cursorRef: AgendaKeyboardCursorRef,
): KeyboardCoordinateGetter {
  return (event, { active, context }) => {
    const activeData = context.draggableNodes.get(active)?.data.current as
      | AppointmentDragData
      | undefined
    let cursor = cursorRef.current
    if (!cursor || cursor.activeId !== active) {
      const activeSlot = slotFromActiveData(activeData)
      if (!activeSlot) return undefined
      cursor = { activeId: active, slot: activeSlot }
      cursorRef.current = cursor
    }

    const delta = {
      ArrowDown: { professional: 0, slot: 1 },
      ArrowLeft: { professional: -1, slot: 0 },
      ArrowRight: { professional: 1, slot: 0 },
      ArrowUp: { professional: 0, slot: -1 },
    }[event.code]
    if (!delta) return undefined
    event.preventDefault()

    const targetProfessional = cursor.slot.professionalIndex + delta.professional
    const targetSlot = cursor.slot.slotIndex + delta.slot
    const target = context.droppableContainers.getEnabled().find((container) => {
      const data = container.data.current as SlotDropData | undefined
      return (
        data?.kind === "agenda-slot" &&
        data.professionalIndex === targetProfessional &&
        data.slotIndex === targetSlot
      )
    })
    const targetData = target?.data.current as SlotDropData | undefined
    const rect = target?.rect.current
    if (targetData?.kind !== "agenda-slot" || !rect) return undefined

    cursorRef.current = { activeId: active, slot: targetData }
    return { x: rect.left, y: rect.top }
  }
}

function slotFromActiveData(activeData: AppointmentDragData | undefined): SlotDropData | undefined {
  return activeData
    ? {
        kind: "agenda-slot",
        professionalId: activeData.appointment.professionalId,
        professionalIndex: activeData.professionalIndex,
        professionalName: "",
        slotIndex: activeData.slotIndex,
        start: activeData.appointment.start,
      }
    : undefined
}

function slotDropData(
  professional: Professional,
  professionalIndex: number,
  start: string,
  slotIndex: number,
): SlotDropData {
  return {
    kind: "agenda-slot",
    professionalId: professional.id,
    professionalIndex,
    professionalName: professional.name,
    slotIndex,
    start,
  }
}

function slotTargetId({ professionalId, start }: SlotDropData) {
  return `slot:${professionalId}:${start}`
}

const AGENDA_SLOT_HEIGHT_PX = 36
const SPANNED_CELL_VERTICAL_PADDING_PX = 8

type AppointmentCardLayout = "compact" | "medium" | "full"

function appointmentCardLayout(rowSpan: number): AppointmentCardLayout {
  if (rowSpan === 1) return "compact"
  if (rowSpan === 2) return "medium"
  return "full"
}

function spannedContentHeight(rowSpan: number) {
  return `${rowSpan * AGENDA_SLOT_HEIGHT_PX - SPANNED_CELL_VERTICAL_PADDING_PX}px`
}

function slotFromOver(over: Over | null): SlotDropData | undefined {
  const data = over?.data.current as SlotDropData | undefined
  return data?.kind === "agenda-slot" ? data : undefined
}

function appointmentFromDragData(data: Record<string, unknown> | undefined) {
  return data?.kind === "agenda-appointment" ? (data.appointment as Appointment) : undefined
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function useReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia(REDUCED_MOTION_QUERY)
      query.addEventListener("change", onStoreChange)
      return () => query.removeEventListener("change", onStoreChange)
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )
}

export function toneForStatus(status: Appointment["status"]) {
  if (status === "canceled" || status === "no-show") return "danger" as const
  if (status === "completed" || status === "confirmed") return "success" as const
  if (status === "waiting") return "warning" as const
  if (status === "in-progress" || status === "arrived") return "info" as const
  return "neutral" as const
}

export function makeSlots(start: string, end: string) {
  const values = []
  for (let value = toMinutes(start); value < toMinutes(end); value += 15) {
    values.push(fromMinutes(value))
  }
  return values
}

export function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return hour * 60 + minute
}

export function fromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`
}
