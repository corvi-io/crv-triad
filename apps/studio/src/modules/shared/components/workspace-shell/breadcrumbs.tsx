import { Link, useLocation } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"

import { getWorkspaceRouteByPath } from "@/modules/shared/workspace/module-registry"

export function Breadcrumbs() {
  const location = useLocation()
  const currentRoute = getWorkspaceRouteByPath(location.pathname)

  return (
    <nav aria-label="Breadcrumb" className="flex h-8 min-w-0 items-center text-sm leading-5">
      <ol className="flex h-8 min-w-0 items-center gap-1 text-muted-foreground">
        <li className="flex h-8 min-w-0 items-center">
          <Link
            className="flex h-8 min-w-0 items-center rounded-md px-1.5 font-medium leading-5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            to="/overview"
          >
            TRIAD Studio
          </Link>
        </li>
        {currentRoute && currentRoute.path !== "/overview" ? (
          <>
            <li className="flex h-8 w-5 items-center justify-center" aria-hidden="true">
              <ChevronRightIcon className="block size-3.5 translate-y-px" />
            </li>
            <li
              className="flex h-8 min-w-0 items-center truncate px-1.5 font-medium leading-5 text-foreground"
              aria-current="page"
            >
              {currentRoute.breadcrumbLabel}
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  )
}
