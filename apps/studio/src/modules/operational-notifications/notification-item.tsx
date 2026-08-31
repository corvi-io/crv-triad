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
import { Badge } from "@/modules/shared/components/ui/badge"
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
  attention: "border-feedback-warning-border text-feedback-warning-foreground",
  critical: "border-feedback-destructive-border text-feedback-destructive-foreground",
  informational: "border-feedback-info-border text-feedback-info-foreground",
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
        "flex min-w-0 gap-3 rounded-lg border bg-card text-card-foreground",
        compact ? "p-2.5" : "p-4",
        !notification.isRead && notification.lifecycle === "active" && "border-primary/70",
      )}
      data-notification-id={notification.id}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg border",
          severityClasses[notification.severity],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-sm font-semibold">
            {notificationCategoryLabels[notification.category]}
          </h3>
          <Badge variant="outline" className={severityClasses[notification.severity]}>
            {severityLabels[notification.severity]}
          </Badge>
          <Badge variant={notification.isRead ? "outline" : "secondary"}>
            {notification.isRead ? "Lida" : "Não lida"}
          </Badge>
          {notification.lifecycle === "resolved" ? (
            <Badge variant="outline">Resolvida na origem</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-medium">{notification.summary}</p>
        {!compact ? (
          <p className="mt-1 text-sm text-muted-foreground">{notification.detail}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
              variant="outline"
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
        variant="outline"
      >
        Abrir destino
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
        variant="outline"
      >
        Abrir destino
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
        variant="outline"
      >
        Abrir destino
      </Button>
    )
  }
  return (
    <Button
      render={<Link search={{ notificationScenario: undefined }} to="/notifications" />}
      size="sm"
      variant="outline"
    >
      Abrir destino
    </Button>
  )
}
