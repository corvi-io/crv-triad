import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { Toaster } from "@/modules/shared/components/ui/sonner"
import { env } from "@/modules/shared/config/env"
import { workspaceReferenceRoutes } from "@/modules/shared/workspace/module-registry"

export const Route = createRootRoute({
  component: RootRoute,
})

function RootRoute() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isReferenceFormSurface =
    pathname.startsWith("/workspace-preview/forms") ||
    workspaceReferenceRoutes.some(
      (route) => pathname === route.path || pathname.startsWith(`${route.path}/`),
    )

  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow"
        href="#main-content"
      >
        Ir para o conteúdo
      </a>
      <Outlet />
      <Toaster />
      {env.isDevServer && !isReferenceFormSurface ? (
        <TanStackRouterDevtools position="bottom-left" />
      ) : null}
    </>
  )
}
