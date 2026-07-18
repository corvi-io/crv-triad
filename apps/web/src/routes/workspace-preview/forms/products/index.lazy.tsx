import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"
import { ReferenceFormPreview } from "@/modules/shared/components/reference-form-preview"

const DeferredProductCreationScreen = createDeferredRouteScreen(async () => {
  const { ProductCreationScreen } = await import(
    "@/modules/inventory/components/product-creation-form"
  )
  return { default: ProductCreationScreen }
})

export const Route = createLazyFileRoute("/workspace-preview/forms/products/")({
  component: () => (
    <ReferenceFormPreview selectedId="products">
      <DeferredProductCreationScreen />
    </ReferenceFormPreview>
  ),
})
