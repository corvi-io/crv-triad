import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"
import { ReferenceFormPreview } from "@/modules/shared/components/reference-form-preview"

const DeferredCollaboratorCreationScreen = createDeferredRouteScreen(async () => {
  const { CollaboratorCreationPreviewScreen } = await import(
    "@/modules/workforce/components/collaborator-creation-preview"
  )
  return { default: CollaboratorCreationPreviewScreen }
})

export const Route = createLazyFileRoute("/workspace-preview/forms/collaborators/")({
  component: () => (
    <ReferenceFormPreview selectedId="collaborators">
      <DeferredCollaboratorCreationScreen />
    </ReferenceFormPreview>
  ),
})
