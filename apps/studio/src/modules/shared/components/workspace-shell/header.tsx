import { Link } from "@tanstack/react-router"

import { SidebarTrigger } from "@/modules/shared/components/ui/sidebar"
import { getWorkspaceRouteByPath } from "@/modules/shared/workspace/module-registry"

import { Breadcrumbs } from "./breadcrumbs"

export function WorkspaceShellHeader({ pathname }: { pathname: string }) {
  const currentRoute = getWorkspaceRouteByPath(pathname)

  return (
    <header
      className="flex h-workspace-header shrink-0 items-center gap-2 bg-inherit px-4 text-inherit"
      data-slot="workspace-header"
    >
      <div className="flex h-10 min-w-0 items-center gap-2">
        <SidebarTrigger aria-label="Alternar menu de navegação" className="-ml-1 size-10" />
        <span aria-hidden="true" className="mr-2 h-4 w-px shrink-0 self-center bg-border" />
        <div className="hidden h-10 min-w-0 items-center sm:flex">
          <Breadcrumbs />
        </div>
        <Link
          className="truncate rounded-md px-1.5 text-sm font-semibold text-foreground sm:hidden"
          to={currentRoute?.path ?? "/overview"}
        >
          {currentRoute?.label ?? "Dashboard"}
        </Link>
      </div>
    </header>
  )
}
