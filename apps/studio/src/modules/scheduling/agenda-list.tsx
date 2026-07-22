import { MoreHorizontalIcon } from "lucide-react"

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
import type { AgendaColumnId } from "./agenda"
import { AgendaAvatar } from "./agenda-avatar"
import { fromMinutes, toMinutes, toneForStatus } from "./agenda-board"
import type { Appointment, Professional, Service } from "./contracts"
import { appointmentStatusPresentation, isTerminalAppointmentStatus } from "./status"

export function AgendaList({
  appointments,
  onAppointment,
  onTransitionRequest,
  professionals,
  services,
}: {
  appointments: readonly Appointment[]
  onAppointment: (appointment: Appointment) => void
  onTransitionRequest: (appointment: Appointment, column?: AgendaColumnId) => void
  professionals: readonly Professional[]
  services: readonly Service[]
}) {
  const professionalById = new Map(professionals.map((item) => [item.id, item]))
  const serviceById = new Map(services.map((item) => [item.id, item]))
  const orderedAppointments = [...appointments].sort((left, right) =>
    `${left.date}-${left.start}-${left.customerName}`.localeCompare(
      `${right.date}-${right.start}-${right.customerName}`,
    ),
  )

  return (
    <section
      aria-label="Lista da agenda"
      className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card"
    >
      <table className="w-full min-w-4xl border-collapse text-sm">
        <caption className="sr-only">Agendamentos filtrados em ordem de data e horário.</caption>
        <thead className="sticky top-0 bg-card">
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Data e horário</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Barbeiro</th>
            <th className="px-4 py-3 font-medium">Serviço</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {orderedAppointments.map((appointment) => {
            const professional = professionalById.get(appointment.professionalId)
            const service = serviceById.get(appointment.serviceId)
            const presentation = appointmentStatusPresentation[appointment.status]
            return (
              <tr
                className="border-b last:border-b-0"
                data-appointment-id={appointment.id}
                key={appointment.id}
              >
                <td className="px-4 py-3 tabular-nums">
                  <span className="block font-medium">{formatDate(appointment.date)}</span>
                  <span className="text-xs text-muted-foreground">
                    {appointment.start} –{" "}
                    {fromMinutes(toMinutes(appointment.start) + appointment.durationMinutes)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    className="flex items-center gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    type="button"
                    onClick={() => onAppointment(appointment)}
                  >
                    <AgendaAvatar name={appointment.customerName} />
                    <span className="font-medium">{appointment.customerName}</span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <AgendaAvatar name={professional?.name ?? "Profissional"} size="sm" />
                    {professional?.name ?? "Profissional sintético"}
                  </span>
                </td>
                <td className="px-4 py-3">{service?.name ?? "Serviço sintético"}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={toneForStatus(appointment.status)}>
                    {presentation.label}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label={`Ações de ${appointment.customerName}`}
                          size="icon-sm"
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
                        <DropdownMenuItem onClick={() => onAppointment(appointment)}>
                          Ver detalhes
                        </DropdownMenuItem>
                        {!isTerminalAppointmentStatus(appointment.status) ? (
                          <DropdownMenuItem onClick={() => onTransitionRequest(appointment)}>
                            Alterar status
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}
