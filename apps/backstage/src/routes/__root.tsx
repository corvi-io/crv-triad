import { createRootRoute, Outlet } from "@tanstack/react-router"
import { Toaster } from "@/modules/shared/components/ui/sonner"

export const Route = createRootRoute({ component: Root })

function Root() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  )
}
