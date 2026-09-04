import type * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/modules/shared/components/ui/sidebar"
import { workspacePrimaryNavigation } from "@/modules/shared/workspace/module-registry"

import { SidebarPrimaryNavigation } from "./sidebar-primary-navigation"
import { SidebarUserMenu } from "./sidebar-user-menu"
import { WorkspaceBrand } from "./workspace-brand"

export function WorkspaceShellSidebar({
  isSigningOut,
  onSignOut,
  pathname,
  workspaceSwitcher,
  hiddenPrimaryPaths = [],
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  isSigningOut?: boolean
  onSignOut?: () => void
  pathname: string
  workspaceSwitcher?: React.ReactNode
  hiddenPrimaryPaths?: readonly string[]
  user: {
    email: string
    image?: string | null
    initial: string
    name: string
  }
}) {
  const primaryItems = workspacePrimaryNavigation.filter(
    (item) => !hiddenPrimaryPaths.includes(item.path),
  )

  return (
    <Sidebar aria-label="Navegação do TRIAD Studio" collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader className="h-20 p-2">
        <WorkspaceBrand />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Navegação principal" className="flex min-h-0 flex-1 flex-col">
          <SidebarPrimaryNavigation items={primaryItems} pathname={pathname} />
        </nav>
      </SidebarContent>
      <SidebarFooter className="p-0">
        <SidebarUserMenu
          user={user}
          isSigningOut={isSigningOut}
          onSignOut={onSignOut}
          workspaceSwitcher={workspaceSwitcher}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
