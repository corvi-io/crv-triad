import { describe, expect, it } from "vitest"

import horizontalGold from "../../public/brand/crv-triad-horizontal-gold.svg?raw"
import horizontalWhite from "../../public/brand/crv-triad-horizontal-white.svg?raw"
import stackedGold from "../../public/brand/crv-triad-stacked-gold.svg?raw"
import stackedWhite from "../../public/brand/crv-triad-stacked-white.svg?raw"
import symbolGold from "../../public/brand/crv-triad-symbol-gold.svg?raw"
import symbolWhite from "../../public/brand/crv-triad-symbol-white.svg?raw"
import authShellSource from "../../src/modules/auth/components/auth-shell/index.tsx?raw"
import studioLogoSource from "../../src/modules/shared/components/branding/studio-logo.tsx?raw"
import workspaceBrandSource from "../../src/modules/shared/components/workspace-shell/workspace-brand.tsx?raw"

describe("workspace brand asset", () => {
  it("keeps official horizontal, stacked, and derived symbol vectors in theme pairs", () => {
    for (const asset of [horizontalGold, stackedGold, symbolGold]) {
      expect(asset).toContain("#AC884E")
      expect(asset).not.toMatch(/data:image|<image\b/i)
    }

    for (const asset of [horizontalWhite, stackedWhite, symbolWhite]) {
      expect(asset).toContain('fill="white"')
      expect(asset).not.toMatch(/data:image|<image\b/i)
    }

    expect(symbolGold).toContain('viewBox="0 0 488 442"')
    expect(symbolWhite).toContain('viewBox="0 0 488 442"')
  })

  it("uses horizontal marks in the expanded shell and official symbols when collapsed", () => {
    expect(workspaceBrandSource).toContain('aria-label="TRIAD Studio — ir para o Dashboard"')
    expect(workspaceBrandSource).toContain("<StudioLogo")
    expect(workspaceBrandSource).toContain('variant="icon"')
    expect(workspaceBrandSource).toContain("group-data-[collapsible=icon]")
    expect(studioLogoSource).toContain("crv-triad-\u0024{kind}-gold.svg")
    expect(studioLogoSource).toContain("crv-triad-\u0024{kind}-white.svg")
    expect(studioLogoSource).toContain("Studio")
    expect(studioLogoSource).toContain('aria-label="TRIAD Studio"')
  })

  it("uses the canonical Studio signature on authentication surfaces", () => {
    expect(authShellSource).toContain("<StudioLogo")
    expect(authShellSource).toContain('src="/auth/studio-quiet-luxury.webp"')
    expect(authShellSource).not.toContain("/placeholder.svg")
  })
})
