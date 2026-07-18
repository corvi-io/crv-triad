import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"
import { ReferenceFormPreview } from "@/modules/shared/components/reference-form-preview"

const DeferredCustomerCreationScreen = createDeferredRouteScreen(async () => {
  const { CustomerCreationScreen } = await import(
    "@/modules/customers/components/customer-creation-form"
  )
  return { default: CustomerCreationScreen }
})

export const Route = createLazyFileRoute("/workspace-preview/forms/customers/")({
  component: () => (
    <ReferenceFormPreview selectedId="customers">
      <DeferredCustomerCreationScreen />
    </ReferenceFormPreview>
  ),
})
