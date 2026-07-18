import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"

const DeferredDriverCreationScreen = createDeferredRouteScreen(async () => {
  const { DriverCreationScreen } = await import("@/modules/fleet/components/driver-creation-form")
  return { default: DriverCreationScreen }
})

export const Route = createLazyFileRoute("/_authenticated/drivers/")({
  component: DeferredDriverCreationScreen,
})
