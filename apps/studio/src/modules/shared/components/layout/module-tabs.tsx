import { Link, useLocation } from "@tanstack/react-router"

import { cn } from "@/modules/shared/lib/utils"

export type ModuleTabItem = {
  label: string
  to: string
  match?: "exact" | "prefix"
}

type ModuleTabsProps = {
  className?: string
  items: readonly ModuleTabItem[]
  label: string
}

export function isModuleTabActive(pathname: string, item: ModuleTabItem) {
  const target = normalizePath(item.to)
  const current = normalizePath(pathname)

  if (current === target) {
    return true
  }

  if (item.match !== "prefix" || target === "/") {
    return false
  }

  return current.startsWith(`${target}/`)
}

export function ModuleTabs({ className, items, label }: ModuleTabsProps) {
  const location = useLocation()

  return (
    <nav aria-label={label} className={cn("overflow-x-auto", className)}>
      <ul className="inline-flex min-w-full gap-1 border-b">
        {items.map((item) => {
          const isActive = isModuleTabActive(location.pathname, item)

          return (
            <li key={item.to} className="shrink-0">
              <Link
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function normalizePath(path: string) {
  if (path === "/") {
    return path
  }

  return path.replace(/\/+$/, "")
}
