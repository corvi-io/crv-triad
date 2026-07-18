import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"

const DeferredCustomerCreationScreen = createDeferredRouteScreen(async () => {
  const { CustomerCreationScreen } = await import(
    "@/modules/customers/components/customer-creation-form"
  )
  return { default: CustomerCreationScreen }
})

export const Route = createLazyFileRoute("/_authenticated/customers/")({
  component: DeferredCustomerCreationScreen,
})
