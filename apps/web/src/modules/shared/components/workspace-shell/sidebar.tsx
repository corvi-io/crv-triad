import type * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/modules/shared/components/ui/sidebar"
import {
  workspacePrimaryNavigation,
  workspaceSecondaryNavigation,
} from "@/modules/shared/workspace/module-registry"

import { SidebarPrimaryNavigation } from "./sidebar-primary-navigation"
import { SidebarSecondaryNavigation } from "./sidebar-secondary-navigation"
import { SidebarUserMenu } from "./sidebar-user-menu"
import { WorkspaceBrand } from "./workspace-brand"

export function WorkspaceShellSidebar({
  isSigningOut,
  onSignOut,
  pathname,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  isSigningOut?: boolean
  onSignOut?: () => void
  pathname: string
  user: {
    email: string
    image?: string | null
    initial: string
    name: string
  }
}) {
  return (
    <Sidebar aria-label="Navegação do workspace" collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader className="h-20 p-2">
        <WorkspaceBrand />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Navegação principal" className="flex min-h-0 flex-1 flex-col">
          <SidebarPrimaryNavigation items={workspacePrimaryNavigation} pathname={pathname} />
        </nav>
      </SidebarContent>
      <SidebarFooter className="gap-2 p-0">
        <nav aria-label="Navegação secundária">
          <SidebarSecondaryNavigation items={workspaceSecondaryNavigation} pathname={pathname} />
        </nav>
        <SidebarUserMenu user={user} isSigningOut={isSigningOut} onSignOut={onSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
