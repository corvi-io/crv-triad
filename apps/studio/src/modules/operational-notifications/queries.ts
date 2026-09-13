import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { productAnalyticsMeta } from "@/modules/shared/analytics/posthog"
import type { MarkReadInput, NotificationQuery } from "./contracts"
import { useOperationalNotificationsRepository } from "./repository-context"

export const operationalNotificationKeys = {
  all: ["operational-notifications"] as const,
  list: (query: NotificationQuery) => [...operationalNotificationKeys.all, "list", query] as const,
  preview: (query: NotificationQuery) =>
    [...operationalNotificationKeys.all, "preview", query] as const,
}

export function useNotificationPreview(query: NotificationQuery = {}) {
  const repository = useOperationalNotificationsRepository()
  return useQuery({
    queryFn: () => repository.getPreview(query),
    queryKey: operationalNotificationKeys.preview(query),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useNotificationList(query: NotificationQuery = {}) {
  const repository = useOperationalNotificationsRepository()
  return useQuery({
    queryFn: () => repository.listNotifications(query),
    queryKey: operationalNotificationKeys.list(query),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useNotificationMutations() {
  const repository = useOperationalNotificationsRepository()
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: operationalNotificationKeys.all })
  return {
    markAllRead: useMutation({
      meta: productAnalyticsMeta("notification_read"),
      mutationFn: (scenarioId?: string) => repository.markAllActiveRead({ scenarioId }),
      onSuccess: invalidate,
    }),
    markRead: useMutation({
      meta: productAnalyticsMeta("notification_read"),
      mutationFn: (input: MarkReadInput) => repository.markRead(input),
      onSuccess: invalidate,
    }),
    reset: useMutation({
      mutationFn: (scenarioId?: string) => repository.reset({ scenarioId }),
      onSuccess: invalidate,
    }),
  }
}
