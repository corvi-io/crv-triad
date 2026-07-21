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

export const appointmentStatusPresentation = {
  arrived: {
    className:
      "border-schedule-arrived-border bg-schedule-arrived text-schedule-arrived-foreground",
    icon: UserCheckIcon,
    label: "Chegou",
    symbol: "◆",
  },
  canceled: {
    className:
      "border-schedule-canceled-border bg-schedule-canceled text-schedule-canceled-foreground",
    icon: CircleSlash2Icon,
    label: "Cancelado",
    symbol: "×",
  },
  completed: {
    className:
      "border-schedule-completed-border bg-schedule-completed text-schedule-completed-foreground",
    icon: CheckCircle2Icon,
    label: "Concluído",
    symbol: "✓",
  },
  confirmed: {
    className:
      "border-schedule-confirmed-border bg-schedule-confirmed text-schedule-confirmed-foreground",
    icon: CircleDotIcon,
    label: "Confirmado",
    symbol: "●",
  },
  "in-progress": {
    className:
      "border-schedule-in-progress-border bg-schedule-in-progress text-schedule-in-progress-foreground",
    icon: PlayCircleIcon,
    label: "Em atendimento",
    symbol: "▶",
  },
  "no-show": {
    className:
      "border-schedule-no-show-border bg-schedule-no-show text-schedule-no-show-foreground",
    icon: UserRoundXIcon,
    label: "Não compareceu",
    symbol: "!",
  },
  scheduled: {
    className:
      "border-schedule-scheduled-border bg-schedule-scheduled text-schedule-scheduled-foreground",
    icon: CalendarClockIcon,
    label: "Agendado",
    symbol: "□",
  },
  waiting: {
    className:
      "border-schedule-waiting-border bg-schedule-waiting text-schedule-waiting-foreground",
    icon: Clock3Icon,
    label: "Aguardando",
    symbol: "…",
  },
} as const satisfies Record<
  AppointmentStatus,
  {
    className: string
    icon: typeof CalendarClockIcon
    label: string
    symbol: string
  }
>
