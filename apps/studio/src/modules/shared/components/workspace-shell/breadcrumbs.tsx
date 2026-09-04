import { useLocation } from "@tanstack/react-router"

import { getWorkspaceRouteByPath } from "@/modules/shared/workspace/module-registry"

export function Breadcrumbs() {
  const location = useLocation()
  const currentRoute = getWorkspaceRouteByPath(location.pathname)

  return (
    <nav aria-label="Breadcrumb" className="flex h-8 min-w-0 items-center text-sm leading-5">
      <ol className="flex h-8 min-w-0 items-center">
        <li
          className="flex h-8 min-w-0 items-center truncate px-1.5 font-medium leading-5 text-foreground"
          aria-current="page"
        >
          {currentRoute?.breadcrumbLabel ?? "Área de trabalho"}
        </li>
      </ol>
    </nav>
  )
}
