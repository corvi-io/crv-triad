import { Link } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"

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

export function SidebarPrimaryNavigation({
  items,
  pathname,
}: {
  items: readonly WorkspaceNavigationItem[]
  pathname: string
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarPrimaryNavigationItem item={item} key={item.id} pathname={pathname} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function SidebarPrimaryNavigationItem({
  item,
  pathname,
}: {
  item: WorkspaceNavigationItem
  pathname: string
}) {
  const ItemIcon = item.icon

  if (item.status === "planned") {
    const unavailableLabel = `${item.label} — disponível em breve`

    return (
      <SidebarMenuItem className="flex justify-center py-1" data-status="planned">
        <SidebarMenuButton
          aria-disabled="true"
          aria-label={unavailableLabel}
          className="cursor-default aria-disabled:pointer-events-auto aria-disabled:opacity-100"
          tooltip={unavailableLabel}
          type="button"
        >
          <ItemIcon aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
          {item.showDisclosure ? (
            <ChevronRightIcon
              aria-hidden="true"
              className="ml-auto size-4 group-data-[collapsible=icon]:hidden"
            />
          ) : null}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  const isActive = isWorkspaceNavigationItemActive(item, pathname)

  return (
    <SidebarMenuItem
      className={
        isActive
          ? "flex justify-center rounded-[var(--workspace-nav-selected-radius)] bg-workspace-sidebar-selected py-1"
          : "flex justify-center py-1"
      }
      data-active={isActive ? "true" : undefined}
      data-slot="workspace-primary-navigation-item"
    >
      <SidebarMenuButton
        className={
          isActive
            ? "md:pl-(--workspace-nav-selected-padding-inline-start) md:pr-(--workspace-nav-selected-padding-inline-end)"
            : undefined
        }
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
      {isActive ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[var(--workspace-nav-selected-radius)] border-solid border-workspace-sidebar-selected-border"
          data-slot="workspace-active-indicator"
          style={{ borderWidth: "var(--workspace-nav-selected-border-width)" }}
        />
      ) : null}
    </SidebarMenuItem>
  )
}
