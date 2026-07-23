import { describe, expect, it } from "vitest"

import {
  getWorkspaceRouteByPath,
  isWorkspaceNavigationItemActive,
  workspacePrimaryNavigation,
  workspaceSecondaryNavigation,
} from "@/modules/shared/workspace/module-registry"

describe("workspace module registry", () => {
  it("exposes active business modules and the Studio home", () => {
    expect(workspacePrimaryNavigation.map((item) => [item.label, item.path])).toEqual([
      ["Dashboard", "/overview"],
      ["Agenda", "/agenda"],
      ["Atendimentos", "/service-desk"],
      ["Clientes", "/clients"],
    ])
    expect(workspaceSecondaryNavigation.map((item) => [item.label, item.path])).toEqual([
      ["Barbearia", "/barbershop-setup"],
      ["Configurações", "/preferences"],
    ])
  })

  it("derives active navigation and breadcrumbs from the neutral route registry", () => {
    expect(isWorkspaceNavigationItemActive(workspacePrimaryNavigation[0], "/overview")).toBe(true)
    expect(isWorkspaceNavigationItemActive(workspacePrimaryNavigation[3], "/overview")).toBe(false)
    expect(isWorkspaceNavigationItemActive(workspacePrimaryNavigation[0], "/profile")).toBe(false)
    expect(getWorkspaceRouteByPath("/agenda")?.breadcrumbLabel).toBe("Agenda")
    expect(getWorkspaceRouteByPath("/clients")?.breadcrumbLabel).toBe("Clientes")
    expect(getWorkspaceRouteByPath("/service-desk")?.breadcrumbLabel).toBe("Atendimentos")
    expect(getWorkspaceRouteByPath("/barbershop-setup")?.breadcrumbLabel).toBe(
      "Configuração da barbearia",
    )
    expect(getWorkspaceRouteByPath("/profile")?.breadcrumbLabel).toBe("Meu perfil")
    expect(getWorkspaceRouteByPath("/unknown-module")).toBeUndefined()
  })
})
