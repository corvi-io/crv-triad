import { cn } from "@/modules/shared/lib/utils"

type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info"

const tones: Record<StatusBadgeTone, string> = {
  danger: "border-destructive bg-destructive text-destructive-foreground",
  info: "border-info bg-info text-info-foreground",
  neutral: "border-border bg-muted text-foreground",
  success: "border-success bg-success text-success-foreground",
  warning: "border-warning bg-warning text-warning-foreground",
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
