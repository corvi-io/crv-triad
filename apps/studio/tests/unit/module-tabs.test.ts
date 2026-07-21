import {
  isModuleTabActive,
  type ModuleTabItem,
} from "@/modules/shared/components/layout/module-tabs"

describe("ModuleTabs", () => {
  it("matches exact items only on the configured route", () => {
    const item: ModuleTabItem = { label: "Dashboard", to: "/operations" }

    expect(isModuleTabActive("/operations", item)).toBe(true)
    expect(isModuleTabActive("/operations/runs", item)).toBe(false)
  })

  it("matches prefix items on descendant routes with path boundaries", () => {
    const item: ModuleTabItem = { label: "Execuções", to: "/operations/runs", match: "prefix" }

    expect(isModuleTabActive("/operations/runs", item)).toBe(true)
    expect(isModuleTabActive("/operations/runs/123", item)).toBe(true)
    expect(isModuleTabActive("/operations/runs-archive", item)).toBe(false)
  })
})
