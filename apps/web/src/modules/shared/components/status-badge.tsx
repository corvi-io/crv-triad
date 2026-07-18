import { cn } from "@/modules/shared/lib/utils"

type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info"

const tones: Record<StatusBadgeTone, string> = {
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-primary/20 bg-primary/10 text-primary",
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
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
