import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"

const DeferredPermissionProfileCreationScreen = createDeferredRouteScreen(async () => {
  const { PermissionProfileCreationScreen } = await import(
    "@/modules/access-control/components/permission-profile-creation-form"
  )
  return { default: PermissionProfileCreationScreen }
})

export const Route = createLazyFileRoute("/_authenticated/users/permission-profiles/")({
  component: DeferredPermissionProfileCreationScreen,
})
