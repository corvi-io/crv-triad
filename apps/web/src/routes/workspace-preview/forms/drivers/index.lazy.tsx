import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"
import { ReferenceFormPreview } from "@/modules/shared/components/reference-form-preview"

const DeferredDriverCreationScreen = createDeferredRouteScreen(async () => {
  const { DriverCreationPreviewScreen } = await import(
    "@/modules/fleet/components/driver-creation-preview"
  )
  return { default: DriverCreationPreviewScreen }
})

export const Route = createLazyFileRoute("/workspace-preview/forms/drivers/")({
  component: () => (
    <ReferenceFormPreview selectedId="drivers">
      <DeferredDriverCreationScreen />
    </ReferenceFormPreview>
  ),
})
