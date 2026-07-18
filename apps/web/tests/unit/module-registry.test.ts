import { describe, expect, it } from "vitest"

import {
  getWorkspaceRouteByPath,
  isWorkspaceNavigationItemActive,
  workspacePrimaryNavigation,
  workspaceSecondaryNavigation,
} from "@/modules/shared/workspace/module-registry"

describe("workspace module registry", () => {
  it("exposes only neutral workspace and identity navigation", () => {
    expect(workspacePrimaryNavigation.map((item) => [item.label, item.path])).toEqual([
      ["Dashboard", "/overview"],
      ["Usuários", "/users"],
    ])
    expect(workspaceSecondaryNavigation.map((item) => [item.label, item.path])).toEqual([
      ["Configurações", "/preferences"],
    ])
  })

  it("derives active navigation and breadcrumbs from the neutral route registry", () => {
    expect(isWorkspaceNavigationItemActive(workspacePrimaryNavigation[0], "/overview")).toBe(true)
    expect(
      isWorkspaceNavigationItemActive(workspacePrimaryNavigation[1], "/users/invitations"),
    ).toBe(true)
    expect(getWorkspaceRouteByPath("/profile")?.breadcrumbLabel).toBe("Meu perfil")
    expect(getWorkspaceRouteByPath("/unknown-module")).toBeUndefined()
  })
})
