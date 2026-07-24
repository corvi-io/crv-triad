import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { schedulingQueryKeys } from "@/modules/scheduling/queries"
import { serviceDeskQueryKeys } from "@/modules/service-desk/queries"
import type {
  CheckoutAdjustmentInput,
  CheckoutLinePriceInput,
  CompletePaymentInput,
  ReplaceTendersInput,
} from "./contracts"
import { useRevenueOperationsRepository } from "./repository-context"

export const revenueOperationsQueryKeys = {
  all: ["revenue-operations"] as const,
  checkout: (sessionId: string) =>
    [...revenueOperationsQueryKeys.all, "checkout", sessionId] as const,
  commissions: (sessionId: string) =>
    [...revenueOperationsQueryKeys.all, "commissions", sessionId] as const,
  dashboard: [...["revenue-operations"], "dashboard"] as const,
  paidSale: (sessionId: string) =>
    [...revenueOperationsQueryKeys.all, "paid-sale", sessionId] as const,
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
