import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { Toaster } from "@/modules/shared/components/ui/sonner"
import { env } from "@/modules/shared/config/env"

export const Route = createRootRoute({
  component: RootRoute,
})

function RootRoute() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const isPreviewSurface = pathname.startsWith("/workspace-preview")

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
      {env.isDevServer && !env.isTest && !isPreviewSurface ? <StudioDevtools /> : null}
    </>
  )
}

function StudioDevtools() {
  return (
    <>
      <TanStackDevtools
        config={{
          customTrigger: <span data-triad-devtools-internal-trigger />,
          defaultOpen: false,
          hideUntilHover: false,
          position: "bottom-right",
          triggerMode: "fixed",
        }}
        plugins={[
          {
            id: "tanstack-query",
            name: "TanStack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
          {
            id: "tanstack-router",
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
      <button
        aria-label="Abrir TanStack Devtools"
        className="fixed right-4 bottom-4 z-[2147483647] flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-foreground text-xs font-bold text-background shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        type="button"
        onClick={() =>
          document
            .querySelector<HTMLButtonElement>(
              'button[data-tsd-control][aria-label="Open TanStack Devtools"]',
            )
            ?.click()
        }
      >
        TS
      </button>
    </>
  )
}
