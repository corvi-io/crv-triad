import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"

const DeferredTruckCreationScreen = createDeferredRouteScreen(async () => {
  const { TruckCreationScreen } = await import("@/modules/fleet/components/truck-creation-form")
  return { default: TruckCreationScreen }
})

export const Route = createLazyFileRoute("/_authenticated/fleet/trucks/")({
  component: DeferredTruckCreationScreen,
})
