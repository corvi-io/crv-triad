import { Link } from "@tanstack/react-router"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/modules/shared/components/ui/sidebar"
import {
  isWorkspaceNavigationItemActive,
  type WorkspaceNavigationItem,
} from "@/modules/shared/workspace/module-registry"

export function SidebarSecondaryNavigation({
  items,
  pathname,
}: {
  items: readonly WorkspaceNavigationItem[]
  pathname: string
}) {
  return (
    <SidebarGroup className="px-2 py-0">
      <SidebarMenu className="gap-(--workspace-secondary-gap)">
        {items.map((item) => {
          const ItemIcon = item.icon

          if (item.status === "planned") {
            const unavailableLabel = `${item.label} — disponível em breve`

            return (
              <SidebarMenuItem data-status="planned" key={item.id}>
                <SidebarMenuButton
                  aria-disabled="true"
                  aria-label={unavailableLabel}
                  className="cursor-default aria-disabled:pointer-events-auto aria-disabled:opacity-100 group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:px-3!"
                  tooltip={unavailableLabel}
                  type="button"
                >
                  <ItemIcon aria-hidden="true" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          const isActive = isWorkspaceNavigationItemActive(item, pathname)

          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                className="group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:px-3!"
                isActive={isActive}
                render={
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.label}
                    to={item.path}
                  />
                }
                tooltip={item.label}
              >
                <ItemIcon aria-hidden="true" />
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
