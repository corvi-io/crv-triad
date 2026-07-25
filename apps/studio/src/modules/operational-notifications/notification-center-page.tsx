import { BellIcon, CheckCheckIcon } from "lucide-react"
import { useState } from "react"
import { ModuleLayout } from "@/modules/shared/components/layout/module-layout"
import { PageHeader } from "@/modules/shared/components/layout/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/modules/shared/components/ui/alert"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/modules/shared/components/ui/empty"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { NotificationItem } from "./notification-item"
import { useNotificationList, useNotificationMutations } from "./queries"

export function NotificationCenterPage({ scenarioId }: { scenarioId?: string }) {
  const query = useNotificationList({ activeLimit: 120, historyLimit: 24, scenarioId })
  const { markAllRead, markRead } = useNotificationMutations()
  const [announcement, setAnnouncement] = useState("")

  function markOne(id: string) {
    markRead.mutate(
      { id, scenarioId },
      {
        onError: () => setAnnouncement("Não foi possível marcar a notificação como lida."),
        onSuccess: () => setAnnouncement("Notificação marcada como lida."),
      },
    )
  }

  return (
    <ModuleLayout
      head={
        <div className="flex flex-col gap-3">
          <PageHeader
            title="Notificações"
            description="Acompanhe situações operacionais e siga para a próxima ação."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!query.data?.unreadActiveCount}
              isLoading={markAllRead.isPending}
              type="button"
              variant="outline"
              onClick={() =>
                markAllRead.mutate(scenarioId, {
                  onSuccess: (count) =>
                    setAnnouncement(
                      `${count} ${count === 1 ? "notificação marcada" : "notificações marcadas"} como lida.`,
                    ),
                })
              }
            >
              <CheckCheckIcon data-icon="inline-start" aria-hidden="true" />
              Marcar ativas como lidas
            </Button>
          </div>
        </div>
      }
      bodyViewportClassName="pb-6"
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {query.isPending ? (
        <div aria-label="Carregando notificações" className="flex flex-col gap-3" role="status">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar as notificações</AlertTitle>
          <AlertDescription>Tente novamente. Nenhuma situação foi alterada.</AlertDescription>
          <Button
            className="mt-3"
            type="button"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </Button>
        </Alert>
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="active-notifications-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold" id="active-notifications-heading">
                Ativas
              </h2>
              <p className="text-sm text-muted-foreground">
                {query.data?.activeCount ?? 0} ativas · {query.data?.unreadActiveCount ?? 0} não
                lidas
              </p>
            </div>
            {query.data?.active.length ? (
              <div className="flex flex-col gap-3">
                {query.data.active.map((notification) => (
                  <NotificationItem
                    isMarkingRead={markRead.isPending && markRead.variables?.id === notification.id}
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markOne}
                  />
                ))}
              </div>
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BellIcon />
                  </EmptyMedia>
                  <EmptyTitle>Nenhuma notificação ativa</EmptyTitle>
                  <EmptyDescription>
                    Não há situações operacionais exigindo atenção agora.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>
          <section aria-labelledby="resolved-notifications-heading">
            <h2 className="mb-3 text-lg font-semibold" id="resolved-notifications-heading">
              Histórico resolvido
            </h2>
            {query.data?.resolved.length ? (
              <div className="flex flex-col gap-3">
                {query.data.resolved.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nenhuma situação resolvida no histórico limitado.
              </p>
            )}
          </section>
        </div>
      )}
    </ModuleLayout>
  )
}
