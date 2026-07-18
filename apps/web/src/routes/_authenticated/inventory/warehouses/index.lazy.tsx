import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"

const DeferredWarehouseCreationScreen = createDeferredRouteScreen(async () => {
  const { WarehouseCreationScreen } = await import(
    "@/modules/inventory/components/warehouse-creation-form"
  )
  return { default: WarehouseCreationScreen }
})

export const Route = createLazyFileRoute("/_authenticated/inventory/warehouses/")({
  component: DeferredWarehouseCreationScreen,
})
