import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { cn } from "@/modules/shared/lib/utils"

type MetricCardTone = "neutral" | "success" | "warning" | "info"

type MetricCardProps = {
  label: string
  value: string | number | null
  description?: string
  emptyValue?: string
  isLoading?: boolean
  signal?: string
  tone?: MetricCardTone
}

const signalTones: Record<MetricCardTone, string> = {
  info: "bg-primary/10 text-primary ring-primary/15",
  neutral: "bg-muted text-muted-foreground ring-border",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
}

export function MetricCard({
  description,
  emptyValue = "Aguardando",
  isLoading = false,
  label,
  signal,
  tone = "neutral",
  value,
}: MetricCardProps) {
  return (
    <section className="group min-w-0 overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
        {signal ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
              signalTones[tone],
            )}
          >
            {signal}
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <>
          <Skeleton className="mt-4 h-9 w-24" />
          <Skeleton className="mt-3 h-3 w-40" />
        </>
      ) : (
        <p
          className={cn(
            "mt-4 text-3xl font-semibold tracking-normal",
            value == null && "text-xl text-muted-foreground",
          )}
        >
          {value ?? emptyValue}
        </p>
      )}
      {!isLoading && description ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4 h-px bg-gradient-to-r from-border via-border to-transparent" />
    </section>
  )
}
