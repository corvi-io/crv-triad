import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"

const DeferredCollaboratorCreationScreen = createDeferredRouteScreen(async () => {
  const { CollaboratorCreationScreen } = await import(
    "@/modules/workforce/components/collaborator-creation-form"
  )
  return { default: CollaboratorCreationScreen }
})

export const Route = createLazyFileRoute("/_authenticated/users/collaborators/")({
  component: DeferredCollaboratorCreationScreen,
})
