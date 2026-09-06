import type { RevenueOperationsRepository } from "./contracts"

export async function openCheckoutBeforeNavigation(
  repository: Pick<RevenueOperationsRepository, "openCheckout"> | undefined,
  sessionId: string,
  navigate: () => Promise<unknown>,
) {
  if (repository?.openCheckout) await repository.openCheckout(sessionId, crypto.randomUUID())
  await navigate()
}
