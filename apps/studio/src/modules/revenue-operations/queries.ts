import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CancelReceiptInput,
  CheckoutAdjustmentInput,
  CheckoutLinePriceInput,
  CloseDayInput,
  ClosingDetailQuery,
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
  closing: (query: ClosingDetailQuery) =>
    [
      ...revenueOperationsQueryKeys.all,
      "closing",
      query.id,
      query.unitId,
      query.date,
      query.scenarioId ?? "cash-typical",
    ] as const,
  closings: (query: ClosingHistoryQuery) =>
    [
      ...revenueOperationsQueryKeys.all,
      "closings",
      query.unitId,
      query.date,
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
    refetchInterval: () =>
      typeof document === "undefined" || document.visibilityState === "visible" ? 15_000 : false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
}

export function useRevenueUnits() {
  const repository = useRevenueOperationsRepository()
  return useQuery({
    queryFn: () => repository.units?.() ?? Promise.resolve([]),
    queryKey: [...revenueOperationsQueryKeys.all, "units"],
    staleTime: 60_000,
  })
}

function useCashMutation<TInput>(
  query: OperationalDayQuery,
  mutationFn: (input: TInput) => Promise<unknown>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        exact: true,
        queryKey: revenueOperationsQueryKeys.cash(query),
      })
    },
  })
}

export function useOpenCashDay(query: OperationalDayQuery) {
  const repository = useRevenueOperationsRepository()
  return useCashMutation(query, (input: { openingCashCents: number; operationId: string }) => {
    if (!repository.openCashDay) throw new Error("Cash opening is unavailable.")
    return repository.openCashDay(query.unitId, input.openingCashCents, input.operationId)
  })
}

export function useCashMovement(query: OperationalDayQuery) {
  const repository = useRevenueOperationsRepository()
  return useCashMutation(
    query,
    (input: {
      cashDayId: string
      kind: "supply" | "withdrawal"
      amountCents: number
      reason: string
      operationId: string
    }) => {
      if (!repository.addCashMovement) throw new Error("Cash movements are unavailable.")
      return repository.addCashMovement(input)
    },
  )
}

export function useReopenCashDay(query: OperationalDayQuery) {
  const repository = useRevenueOperationsRepository()
  return useCashMutation(
    query,
    (input: { cashDayId: string; operationId: string; reason: string }) => {
      if (!repository.reopenDay) throw new Error("Cash reopening is unavailable.")
      return repository.reopenDay(input.cashDayId, input.operationId, input.reason)
    },
  )
}

export function useDailyClosings(query: ClosingHistoryQuery) {
  const repository = useRevenueOperationsRepository()
  return useQuery({
    queryFn: () => repository.listDailyClosings(query),
    queryKey: revenueOperationsQueryKeys.closings(query),
  })
}

export function useDailyClosing(id: string | null, query: OperationalDayQuery) {
  const repository = useRevenueOperationsRepository()
  const detailQuery = { ...query, id: id ?? "" }
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => repository.getDailyClosing(detailQuery),
    queryKey: revenueOperationsQueryKeys.closing(detailQuery),
  })
}

export function useCloseDay(query: OperationalDayQuery) {
  const repository = useRevenueOperationsRepository()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CloseDayInput) => repository.closeDay(input),
    onSuccess: async (closing) => {
      queryClient.setQueryData(
        revenueOperationsQueryKeys.closing({ ...query, id: closing.id }),
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
        queryClient.invalidateQueries({
          exact: true,
          queryKey: revenueOperationsQueryKeys.dashboard,
        }),
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
  return useCheckoutMutation(sessionId, (input: CompletePaymentInput) =>
    repository.completePayment(input),
  )
}

export function useCancelReceipt(sessionId: string) {
  const repository = useRevenueOperationsRepository()
  return useCheckoutMutation(sessionId, (input: CancelReceiptInput) => {
    if (!repository.cancelReceipt) throw new Error("Receipt correction is unavailable.")
    return repository.cancelReceipt(input)
  })
}
