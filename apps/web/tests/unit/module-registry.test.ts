import { describe, expect, it } from "vitest"

import {
  isWorkspaceNavigationItemActive,
  workspacePrimaryNavigation,
  workspaceReferenceRoutes,
  workspaceSecondaryNavigation,
} from "@/modules/shared/workspace/module-registry"

describe("workspace module registry", () => {
  it("keeps the accepted reference design navigation visible and ordered", () => {
    expect(workspacePrimaryNavigation.map((item) => item.label)).toEqual([
      "Dashboard",
      "Central de Operações",
      "Clientes",
      "Frota",
      "Motoristas",
      "Estoque",
      "Financeiro",
      "Relatórios",
    ])
    expect(workspaceSecondaryNavigation.map((item) => item.label)).toEqual([
      "Central de alertas",
      "Configurações",
    ])
  })

  it("maps accepted reference destinations and keeps the remaining modules presentation-only", () => {
    expect(workspacePrimaryNavigation[0]).toMatchObject({
      label: "Dashboard",
      path: "/overview",
      status: "active",
    })
    expect(workspacePrimaryNavigation.find((item) => item.id === "customers")).toMatchObject({
      path: "/customers",
      status: "active",
    })
    expect(workspacePrimaryNavigation.find((item) => item.id === "fleet")).toMatchObject({
      path: "/fleet/trucks",
      status: "active",
    })
    expect(
      workspacePrimaryNavigation.filter((item) => item.status === "planned").map((item) => item.id),
    ).toEqual(["operations", "finance", "reports"])
    expect(workspaceSecondaryNavigation[0].status).toBe("planned")
    expect(workspaceSecondaryNavigation[1]).toMatchObject({
      label: "Configurações",
      path: "/preferences",
      status: "active",
    })
  })

  it("keeps all eight reference routes traceable without treating them as authorization", () => {
    expect(workspaceReferenceRoutes.map((route) => route.path)).toEqual([
      "/companies",
      "/customers",
      "/inventory/products",
      "/inventory/warehouses",
      "/fleet/trucks",
      "/drivers",
      "/users/collaborators",
      "/users/permission-profiles",
    ])
  })

  it("derives active navigation from route metadata without treating it as authorization", () => {
    expect(isWorkspaceNavigationItemActive(workspacePrimaryNavigation[0], "/overview")).toBe(true)
    expect(isWorkspaceNavigationItemActive(workspacePrimaryNavigation[0], "/users")).toBe(false)
    expect(isWorkspaceNavigationItemActive(workspacePrimaryNavigation[1], "/overview")).toBe(false)
    const inventory = workspacePrimaryNavigation.find((item) => item.id === "inventory")
    expect(inventory).toBeDefined()
    if (inventory) {
      expect(isWorkspaceNavigationItemActive(inventory, "/inventory/products")).toBe(true)
      expect(isWorkspaceNavigationItemActive(inventory, "/inventory/warehouses")).toBe(true)
    }
    expect(isWorkspaceNavigationItemActive(workspaceSecondaryNavigation[1], "/preferences")).toBe(
      true,
    )
  })
})
