import { AlertCircleIcon, CheckCircle2Icon, InfoIcon } from "lucide-react"

import { cn } from "@/modules/shared/lib/utils"

type AuthFeedbackProps = {
  children: React.ReactNode
  tone: "error" | "info" | "success"
}

const toneClasses = {
  error:
    "border-feedback-destructive-border bg-feedback-destructive text-feedback-destructive-foreground",
  info: "border-feedback-info-border bg-feedback-info text-feedback-info-foreground",
  success: "border-feedback-success-border bg-feedback-success text-feedback-success-foreground",
} as const

const toneIcons = {
  error: AlertCircleIcon,
  info: InfoIcon,
  success: CheckCircle2Icon,
} as const

export function AuthFeedback({ children, tone }: AuthFeedbackProps) {
  const Icon = toneIcons[tone]

  return (
    <div
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("flex gap-3 rounded-lg border p-3 text-sm", toneClasses[tone])}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
