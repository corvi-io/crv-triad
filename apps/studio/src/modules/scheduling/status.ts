import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  CircleSlash2Icon,
  Clock3Icon,
  PlayCircleIcon,
  UserCheckIcon,
  UserRoundXIcon,
} from "lucide-react"
import type { AppointmentStatus } from "./contracts"

export function isTerminalAppointmentStatus(status: AppointmentStatus) {
  return status === "completed" || status === "canceled" || status === "no-show"
}

export const appointmentStatusPresentation = {
  arrived: {
    badgeClassName:
      "border-schedule-arrived-border bg-schedule-arrived text-schedule-arrived-foreground",
    icon: UserCheckIcon,
    label: "Check-in",
    symbol: "◆",
  },
  canceled: {
    badgeClassName:
      "border-schedule-canceled-border bg-schedule-canceled text-schedule-canceled-foreground",
    icon: CircleSlash2Icon,
    label: "Cancelado",
    symbol: "×",
  },
  completed: {
    badgeClassName:
      "border-schedule-completed-border bg-schedule-completed text-schedule-completed-foreground",
    icon: CheckCircle2Icon,
    label: "Finalizado",
    symbol: "✓",
  },
  confirmed: {
    badgeClassName:
      "border-schedule-confirmed-border bg-schedule-confirmed text-schedule-confirmed-foreground",
    icon: CircleDotIcon,
    label: "Confirmado",
    symbol: "●",
  },
  "in-progress": {
    badgeClassName:
      "border-schedule-in-progress-border bg-schedule-in-progress text-schedule-in-progress-foreground",
    icon: PlayCircleIcon,
    label: "Em atendimento",
    symbol: "▶",
  },
  "no-show": {
    badgeClassName:
      "border-schedule-no-show-border bg-schedule-no-show text-schedule-no-show-foreground",
    icon: UserRoundXIcon,
    label: "No-show",
    symbol: "!",
  },
  scheduled: {
    badgeClassName:
      "border-schedule-scheduled-border bg-schedule-scheduled text-schedule-scheduled-foreground",
    icon: CalendarClockIcon,
    label: "Agendado",
    symbol: "□",
  },
  waiting: {
    badgeClassName:
      "border-schedule-waiting-border bg-schedule-waiting text-schedule-waiting-foreground",
    icon: Clock3Icon,
    label: "Em espera",
    symbol: "…",
  },
} as const satisfies Record<
  AppointmentStatus,
  {
    badgeClassName: string
    icon: typeof CalendarClockIcon
    label: string
    symbol: string
  }
>
