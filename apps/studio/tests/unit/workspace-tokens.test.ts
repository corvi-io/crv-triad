import { describe, expect, it } from "vitest"

import styles from "../../src/index.css?raw"
import headerSource from "../../src/modules/shared/components/workspace-shell/header.tsx?raw"
import shellIndexSource from "../../src/modules/shared/components/workspace-shell/index.tsx?raw"
import sidebarSource from "../../src/modules/shared/components/workspace-shell/sidebar.tsx?raw"
import primaryNavigationSource from "../../src/modules/shared/components/workspace-shell/sidebar-primary-navigation.tsx?raw"
import secondaryNavigationSource from "../../src/modules/shared/components/workspace-shell/sidebar-secondary-navigation.tsx?raw"
import workspaceBrandSource from "../../src/modules/shared/components/workspace-shell/workspace-brand.tsx?raw"

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))

  if (!channels) {
    throw new Error(`Invalid color: ${hex}`)
  }

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(foreground: string, background: string) {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (first, second) => second - first,
  )
  return (luminances[0] + 0.05) / (luminances[1] + 0.05)
}

describe("workspace token contract", () => {
  it("maps primitive, semantic, and workspace component layers through Tailwind v4", () => {
    expect(styles).toContain("--primitive-navy-900: #0f172a")
    expect(styles).toContain("--primitive-gold-500: #cdaa5b")
    expect(styles).toContain("--background: var(--primitive-navy-50)")
    expect(styles).toContain("--workspace-sidebar-selected-background: var(--sidebar-accent)")
    expect(styles).toContain(
      "--workspace-sidebar-selected-foreground: var(--sidebar-selected-foreground)",
    )
    expect(styles).toContain("--workspace-nav-selected-radius: var(--selection-radius)")
    expect(styles).toContain(
      "--workspace-nav-selected-indicator-width: calc(var(--primitive-space-px) * 2)",
    )
    expect(styles).toContain(
      "--workspace-nav-selected-padding-inline-start: var(--primitive-space-2)",
    )
    expect(styles).toContain(
      "--workspace-nav-selected-padding-inline-end: var(--primitive-space-8)",
    )
    expect(primaryNavigationSource).toContain(
      "md:pl-(--workspace-nav-selected-padding-inline-start)",
    )
    expect(primaryNavigationSource).toContain("md:pr-(--workspace-nav-selected-padding-inline-end)")
    expect(primaryNavigationSource).toContain(
      'width: "var(--workspace-nav-selected-indicator-width)"',
    )
    expect(primaryNavigationSource).not.toContain("borderWidth")
    expect(primaryNavigationSource).not.toContain("absolute inset-0")
    expect(styles).toContain(
      "--color-workspace-sidebar-selected: var(--workspace-sidebar-selected-background)",
    )
    expect(styles).toContain("--spacing-workspace-sidebar: var(--workspace-sidebar-width-expanded)")
    expect(styles).toContain("--workspace-sidebar-width-expanded: 15.9375rem")
    expect(styles).toContain("--workspace-sidebar-width-collapsed: 3.5rem")
    expect(styles).toContain("--workspace-nav-item-height: var(--primitive-space-8)")
    expect(styles).toContain("--workspace-nav-radius: var(--primitive-radius-md)")
    expect(styles).toContain(".dark {")
    expect(styles).toContain("--sidebar: var(--primitive-navy-950)")
  })

  it("uses contrast-safe navy and gold anchors for the light reference state", () => {
    expect(contrastRatio("#86652F", "#F3F6FC")).toBeGreaterThanOrEqual(3)
    expect(contrastRatio("#3B4E72", "#F3F6FC")).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio("#86652F", "#FFFFFF")).toBeGreaterThanOrEqual(3)
  })

  it("keeps the workspace shell contiguous and the header free of invented chrome", () => {
    expect(sidebarSource).toContain('variant="sidebar"')
    expect(sidebarSource).not.toContain('variant="inset"')
    expect(shellIndexSource).toContain("bg-card text-card-foreground")
    expect(headerSource).toContain("bg-inherit")
    expect(headerSource).not.toContain("border-b")
    expect(headerSource).not.toContain("NotificationTrigger")
  })

  it("keeps raw color declarations out of workspace components", () => {
    const workspaceFiles = [
      shellIndexSource,
      sidebarSource,
      primaryNavigationSource,
      secondaryNavigationSource,
      workspaceBrandSource,
    ]

    for (const source of workspaceFiles) {
      expect(source).not.toMatch(/#[\da-f]{3,8}/i)
    }
  })
})
