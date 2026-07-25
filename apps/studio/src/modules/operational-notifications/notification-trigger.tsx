import { Link } from "@tanstack/react-router"
import { BellIcon } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/modules/shared/components/ui/popover"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { NotificationItem } from "./notification-item"
import { useNotificationMutations, useNotificationPreview } from "./queries"

export function OperationalNotificationTrigger({ scenarioId }: { scenarioId?: string }) {
  const preview = useNotificationPreview({ activeLimit: 4, historyLimit: 0, scenarioId })
  const { markRead } = useNotificationMutations()
  const [announcement, setAnnouncement] = useState("")
  const [readFailed, setReadFailed] = useState(false)
  const unread = preview.data?.unreadActiveCount ?? 0
  const accessibleLabel = preview.isPending
    ? "Abrir notificações. Carregando contagem."
    : preview.isError
      ? "Abrir notificações. Contagem indisponível."
      : unread === 0
        ? "Abrir notificações. Nenhuma notificação ativa não lida."
        : `Abrir notificações. ${unread} ${unread === 1 ? "notificação ativa não lida" : "notificações ativas não lidas"}.`

  return (
    <Popover>
      <PopoverTrigger
        aria-label={accessibleLabel}
        render={
          <Button className="relative" size="icon" type="button" variant="ghost">
            <BellIcon aria-hidden="true" />
            {unread > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full border border-background bg-primary px-1 text-[0.625rem] font-bold text-primary-foreground"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] p-3">
        <PopoverTitle>Notificações operacionais</PopoverTitle>
        <PopoverDescription>Situações ativas ordenadas por prioridade.</PopoverDescription>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
        {readFailed ? (
          <Alert className="mt-3" variant="destructive">
            <AlertTitle>Não foi possível marcar como lida</AlertTitle>
            <AlertDescription>Tente novamente. A notificação continua não lida.</AlertDescription>
          </Alert>
        ) : null}
        <div className="mt-3 flex max-h-[min(26rem,70vh)] flex-col gap-2 overflow-y-auto">
          {preview.isPending ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : preview.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível carregar</AlertTitle>
              <AlertDescription>Tente novamente ou abra o centro de notificações.</AlertDescription>
            </Alert>
          ) : preview.data?.active.length ? (
            preview.data.active.map((notification) => (
              <NotificationItem
                compact
                isMarkingRead={markRead.isPending && markRead.variables?.id === notification.id}
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => {
                  setAnnouncement("")
                  setReadFailed(false)
                  markRead.mutate(
                    { id, scenarioId },
                    {
                      onError: () => {
                        setAnnouncement("Não foi possível marcar a notificação como lida.")
                        setReadFailed(true)
                      },
                      onSuccess: () => {
                        setAnnouncement("Notificação marcada como lida.")
                        setReadFailed(false)
                      },
                    },
                  )
                }}
              />
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Nenhuma notificação ativa.
            </p>
          )}
        </div>
        <Button
          className="mt-3 w-full"
          render={<Link search={{ notificationScenario: scenarioId }} to="/notifications" />}
          variant="outline"
        >
          Ver todas as notificações
        </Button>
      </PopoverContent>
    </Popover>
  )
}
