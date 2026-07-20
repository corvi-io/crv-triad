import { cn } from "@/modules/shared/lib/utils"

type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info"

const tones: Record<StatusBadgeTone, string> = {
  danger:
    "border-feedback-destructive-border bg-feedback-destructive text-feedback-destructive-foreground",
  info: "border-feedback-info-border bg-feedback-info text-feedback-info-foreground",
  neutral: "border-border bg-muted text-foreground",
  success: "border-feedback-success-border bg-feedback-success text-feedback-success-foreground",
  warning: "border-feedback-warning-border bg-feedback-warning text-feedback-warning-foreground",
}

type StatusBadgeProps = {
  children: string
  tone?: StatusBadgeTone
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-full items-center rounded-md border px-2 text-xs font-medium",
        tones[tone],
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}
