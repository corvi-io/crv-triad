import { type ComponentType, lazy, Suspense } from "react"

import { PageStatus } from "@/modules/shared/components/feedback/page-status"

type RouteScreenModule = { default: ComponentType }

export function createDeferredRouteScreen(load: () => Promise<RouteScreenModule>) {
  const DeferredScreen = lazy(load)

  return function DeferredRouteScreen() {
    return (
      <Suspense
        fallback={
          <PageStatus
            title="Carregando formulário"
            description="Aguarde enquanto preparamos esta página."
          />
        }
      >
        <DeferredScreen />
      </Suspense>
    )
  }
}
