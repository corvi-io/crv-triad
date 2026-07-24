import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { schedulingQueryKeys } from "@/modules/scheduling/queries"
import { serviceDeskQueryKeys } from "@/modules/service-desk/queries"
import type {
  CheckoutAdjustmentInput,
  CheckoutLinePriceInput,
  CloseDayInput,
  ClosingHistoryQuery,
  CompletePaymentInput,
  OperationalDayQuery,
  ReplaceTendersInput,
} from "./contracts"
import { useRevenueOperationsRepository } from "./repository-context"

export const revenueOperationsQueryKeys = {
  all: ["revenue-operations"] as const,
  cash: (query: OperationalDayQuery) =>
    [
      ...revenueOperationsQueryKeys.all,
      "cash",
      query.unitId,
      query.date,
      query.scenarioId ?? "cash-typical",
    ] as const,
  checkout: (sessionId: string) =>
    [...revenueOperationsQueryKeys.all, "checkout", sessionId] as const,
  commissions: (sessionId: string) =>
    [...revenueOperationsQueryKeys.all, "commissions", sessionId] as const,
  closing: (id: string) => [...revenueOperationsQueryKeys.all, "closing", id] as const,
  closings: (query: ClosingHistoryQuery) =>
    [
      ...revenueOperationsQueryKeys.all,
      "closings",
      query.unitId,
      query.scenarioId ?? "cash-typical",
      query.limit,
    ] as const,
  dashboard: [...["revenue-operations"], "dashboard"] as const,
  paidSale: (sessionId: string) =>
    [...revenueOperationsQueryKeys.all, "paid-sale", sessionId] as const,
}

export function useOpenDaySummary(query: OperationalDayQuery) {
  const repository = useRevenueOperationsRepository()
  return useQuery({
    queryFn: () => repository.getOpenDaySummary(query),
    queryKey: revenueOperationsQueryKeys.cash(query),
  })
}

export function useDailyClosings(query: ClosingHistoryQuery) {
  const repository = useRevenueOperationsRepository()
  return useQuery({
    queryFn: () => repository.listDailyClosings(query),
    queryKey: revenueOperationsQueryKeys.closings(query),
  })
}

export function useDailyClosing(id: string | null, unitId: OperationalDayQuery["unitId"]) {
  const repository = useRevenueOperationsRepository()
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => repository.getDailyClosing({ id: id ?? "", unitId }),
    queryKey: [...revenueOperationsQueryKeys.closing(id ?? ""), unitId],
  })
}

export function useCloseDay(query: OperationalDayQuery) {
  const repository = useRevenueOperationsRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CloseDayInput) => repository.closeDay(input),
    onSuccess: async (closing) => {
      queryClient.setQueryData(
        [...revenueOperationsQueryKeys.closing(closing.id), closing.unitId],
        closing,
      )
      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: revenueOperationsQueryKeys.cash(query),
        }),
        queryClient.invalidateQueries({
          predicate: ({ queryKey }) =>
            queryKey[0] === "revenue-operations" &&
            queryKey[1] === "closings" &&
            queryKey[2] === query.unitId,
        }),
      ])
    },
  })
}

export function useCheckout(sessionId: string) {
  const repository = useRevenueOperationsRepository()
  return useQuery({
    queryFn: () => repository.getCheckout(sessionId),
    queryKey: revenueOperationsQueryKeys.checkout(sessionId),
  })
}

export function useCommissionPreview(sessionId: string) {
  const repository = useRevenueOperationsRepository()
  return useQuery({
    queryFn: () => repository.previewCommissions(sessionId),
    queryKey: revenueOperationsQueryKeys.commissions(sessionId),
  })
}

export function useRevenueDashboardProjection() {
  const repository = useRevenueOperationsRepository()
  return useQuery({
    queryFn: () => repository.getDashboardProjection(),
    queryKey: revenueOperationsQueryKeys.dashboard,
  })
}

function useCheckoutMutation<TInput>(
  sessionId: string,
  mutationFn: (input: TInput) => Promise<unknown>,
  complete = false,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          exact: true,
          queryKey: revenueOperationsQueryKeys.checkout(sessionId),
        }),
        queryClient.invalidateQueries({
          exact: true,
          queryKey: revenueOperationsQueryKeys.commissions(sessionId),
        }),
        complete
          ? queryClient.invalidateQueries({ queryKey: serviceDeskQueryKeys.all })
          : Promise.resolve(),
        complete
          ? queryClient.invalidateQueries({ queryKey: schedulingQueryKeys.all })
          : Promise.resolve(),
        complete
          ? queryClient.invalidateQueries({
              exact: true,
              queryKey: revenueOperationsQueryKeys.dashboard,
            })
          : Promise.resolve(),
      ])
    },
  })
}

export function useUpdateCheckoutLine(sessionId: string) {
  const repository = useRevenueOperationsRepository()
  return useCheckoutMutation(sessionId, (input: CheckoutLinePriceInput) =>
    repository.updateLinePrice(input),
  )
}

export function useUpdateCheckoutAdjustments(sessionId: string) {
  const repository = useRevenueOperationsRepository()
  return useCheckoutMutation(sessionId, (input: CheckoutAdjustmentInput) =>
    repository.updateAdjustments(input),
  )
}

export function useReplaceTenders(sessionId: string) {
  const repository = useRevenueOperationsRepository()
  return useCheckoutMutation(sessionId, (input: ReplaceTendersInput) =>
    repository.replaceTenders(input),
  )
}

export function useCompletePayment(sessionId: string) {
  const repository = useRevenueOperationsRepository()
  return useCheckoutMutation(
    sessionId,
    (input: CompletePaymentInput) => repository.completePayment(input),
    true,
  )
}
