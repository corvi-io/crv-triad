import { Link } from "@tanstack/react-router"
import {
  BellRingIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  CreditCardIcon,
  TimerOffIcon,
} from "lucide-react"
import { defaultServiceDeskSearch } from "@/modules/service-desk/search"
import { formatDateOnly } from "@/modules/shared/components/forms/date-picker"
import { Button } from "@/modules/shared/components/ui/button"
import { cn } from "@/modules/shared/lib/utils"
import type { OperationalNotification } from "./contracts"
import { resolveNotificationDestination } from "./destinations"
import { notificationCategoryLabels } from "./rules"

const severityLabels = {
  attention: "Atenção",
  critical: "Crítica",
  informational: "Informativa",
} as const

const severityClasses = {
  attention: "bg-feedback-warning text-feedback-warning-foreground",
  critical: "bg-feedback-destructive text-feedback-destructive-foreground",
  informational: "bg-feedback-info text-feedback-info-foreground",
} as const

const categoryIcons = {
  "appointment-change": CalendarClockIcon,
  "blocked-time": TimerOffIcon,
  "excessive-wait": BellRingIcon,
  "overdue-service": TimerOffIcon,
  "pending-payment": CreditCardIcon,
  "scheduling-conflict": CircleAlertIcon,
  "upcoming-appointment": CalendarClockIcon,
} as const

export function NotificationItem({
  compact = false,
  isMarkingRead = false,
  notification,
  onMarkRead,
}: {
  compact?: boolean
  isMarkingRead?: boolean
  notification: OperationalNotification
  onMarkRead?: (id: string) => void
}) {
  const Icon = categoryIcons[notification.category]
  const destination = resolveNotificationDestination(notification.destination)
  return (
    <article
      className={cn(
        "flex min-w-0 gap-3 bg-card text-card-foreground transition-colors hover:bg-muted/25",
        compact ? "px-1 py-3" : "p-4 sm:p-5",
      )}
      data-notification-id={notification.id}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          severityClasses[notification.severity],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {notificationCategoryLabels[notification.category]}
          </h3>
          {!notification.isRead && notification.lifecycle === "active" ? (
            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary">
              <span className="sr-only">Não lida</span>
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium">{notification.summary}</p>
        {!compact ? (
          <details className="mt-2 group/detail">
            <summary className="cursor-pointer text-sm font-medium text-primary">
              Ver detalhes
            </summary>
            <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
              <p className="text-sm text-muted-foreground">{notification.detail}</p>
              <p className="text-xs text-muted-foreground">
                {severityLabels[notification.severity]}
                {notification.lifecycle === "resolved" ? " · Resolvida na origem" : ""}
              </p>
            </div>
          </details>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {destination ? (
            <DestinationLink destination={destination} />
          ) : (
            <Button
              render={
                <Link
                  to="/agenda"
                  search={{
                    date: formatDateOnly(new Date()),
                    period: "today",
                    scenario: "normal",
                    unit: "centro",
                    view: "board",
                  }}
                />
              }
              size="sm"
              variant="ghost"
            >
              Destino indisponível · Abrir Agenda
            </Button>
          )}
          {!notification.isRead && notification.lifecycle === "active" && onMarkRead ? (
            <Button
              isLoading={isMarkingRead}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => onMarkRead(notification.id)}
            >
              Marcar como lida
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function DestinationLink({
  destination,
}: {
  destination: NonNullable<ReturnType<typeof resolveNotificationDestination>>
}) {
  if (destination.kind === "agenda") {
    return (
      <Button
        render={
          <Link
            to="/agenda"
            search={{
              appointment: destination.appointment,
              date: destination.date ?? formatDateOnly(new Date()),
              period: "today",
              scenario: "normal",
              unit: "centro",
              view: "board",
            }}
          />
        }
        size="sm"
        variant="ghost"
      >
        Abrir na agenda
      </Button>
    )
  }
  if (destination.kind === "checkout") {
    return (
      <Button
        render={
          <Link
            params={{ sessionId: destination.sessionId }}
            search={defaultServiceDeskSearch}
            to="/service-desk/$sessionId/checkout"
          />
        }
        size="sm"
        variant="ghost"
      >
        Abrir pagamento
      </Button>
    )
  }
  if (destination.kind === "service-desk") {
    return (
      <Button
        render={
          <Link
            params={{ sessionId: destination.sessionId }}
            search={defaultServiceDeskSearch}
            to="/service-desk/$sessionId"
          />
        }
        size="sm"
        variant="ghost"
      >
        Abrir atendimento
      </Button>
    )
  }
  return (
    <Button
      render={<Link search={{ notificationScenario: undefined }} to="/notifications" />}
      size="sm"
      variant="ghost"
    >
      Abrir notificações
    </Button>
  )
}
