import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"
import { ReferenceFormPreview } from "@/modules/shared/components/reference-form-preview"

const DeferredWarehouseCreationScreen = createDeferredRouteScreen(async () => {
  const { WarehouseCreationPreviewScreen } = await import(
    "@/modules/inventory/components/warehouse-creation-preview"
  )
  return { default: WarehouseCreationPreviewScreen }
})

export const Route = createLazyFileRoute("/workspace-preview/forms/warehouses/")({
  component: () => (
    <ReferenceFormPreview selectedId="warehouses">
      <DeferredWarehouseCreationScreen />
    </ReferenceFormPreview>
  ),
})
