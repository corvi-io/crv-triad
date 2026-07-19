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
  arrived: { icon: UserCheckIcon, label: "Chegou", symbol: "◆", tone: "info" },
  canceled: { icon: CircleSlash2Icon, label: "Cancelado", symbol: "×", tone: "danger" },
  completed: { icon: CheckCircle2Icon, label: "Concluído", symbol: "✓", tone: "success" },
  confirmed: { icon: CircleDotIcon, label: "Confirmado", symbol: "●", tone: "success" },
  "in-progress": { icon: PlayCircleIcon, label: "Em atendimento", symbol: "▶", tone: "info" },
  "no-show": { icon: UserRoundXIcon, label: "Não compareceu", symbol: "!", tone: "danger" },
  scheduled: { icon: CalendarClockIcon, label: "Agendado", symbol: "□", tone: "neutral" },
  waiting: { icon: Clock3Icon, label: "Aguardando", symbol: "…", tone: "warning" },
} as const satisfies Record<
  AppointmentStatus,
  {
    icon: typeof CalendarClockIcon
    label: string
    symbol: string
    tone: "danger" | "info" | "neutral" | "success" | "warning"
  }
>
