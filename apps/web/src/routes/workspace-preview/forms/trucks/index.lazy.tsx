import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"
import { ReferenceFormPreview } from "@/modules/shared/components/reference-form-preview"

const DeferredTruckCreationScreen = createDeferredRouteScreen(async () => {
  const { TruckCreationPreviewScreen } = await import(
    "@/modules/fleet/components/truck-creation-preview"
  )
  return { default: TruckCreationPreviewScreen }
})

export const Route = createLazyFileRoute("/workspace-preview/forms/trucks/")({
  component: () => (
    <ReferenceFormPreview selectedId="trucks">
      <DeferredTruckCreationScreen />
    </ReferenceFormPreview>
  ),
})
