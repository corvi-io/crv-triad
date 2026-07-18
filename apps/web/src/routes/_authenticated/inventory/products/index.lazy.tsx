import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"

const DeferredProductCreationScreen = createDeferredRouteScreen(async () => {
  const { ProductCreationScreen } = await import(
    "@/modules/inventory/components/product-creation-form"
  )
  return { default: ProductCreationScreen }
})

export const Route = createLazyFileRoute("/_authenticated/inventory/products/")({
  component: DeferredProductCreationScreen,
})
