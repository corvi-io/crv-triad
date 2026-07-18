import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"
import { ReferenceFormPreview } from "@/modules/shared/components/reference-form-preview"

const DeferredPermissionProfileCreationScreen = createDeferredRouteScreen(async () => {
  const { PermissionProfileCreationScreen } = await import(
    "@/modules/access-control/components/permission-profile-creation-form"
  )
  return { default: PermissionProfileCreationScreen }
})

export const Route = createLazyFileRoute("/workspace-preview/forms/permission-profiles/")({
  component: () => (
    <ReferenceFormPreview selectedId="permission-profiles">
      <DeferredPermissionProfileCreationScreen />
    </ReferenceFormPreview>
  ),
})
