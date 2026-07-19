import { describe, expect, it } from "vitest"

import triadSymbol from "../../public/brand/crv-triad-symbol.svg?raw"
import workspaceBrandSource from "../../src/modules/shared/components/workspace-shell/workspace-brand.tsx?raw"

describe("workspace brand asset", () => {
  it("keeps the neutral 48px Triad placeholder vector", () => {
    expect(triadSymbol).toContain('width="48"')
    expect(triadSymbol).toContain('height="48"')
    expect(triadSymbol).toContain('viewBox="0 0 48 48"')
    expect(triadSymbol.match(/<circle/g)).toHaveLength(3)
    expect(triadSymbol).not.toMatch(/data:image|<image\b/i)
    expect(triadSymbol).not.toContain("#0049D0")
  })

  it("serves one decorative official symbol in every shell state", () => {
    expect(workspaceBrandSource).toContain('aria-label="TRIAD Studio — ir para o Dashboard"')
    expect(workspaceBrandSource.match(/<img/g)).toHaveLength(1)
    expect(workspaceBrandSource).toContain('alt=""')
    expect(workspaceBrandSource).toContain('aria-hidden="true"')
    expect(workspaceBrandSource).toContain('src="/brand/crv-triad-symbol.svg"')
    expect(workspaceBrandSource).toContain("group-data-[collapsible=icon]")
    expect(workspaceBrandSource).not.toContain("crv-triad-symbol-dark.svg")
    expect(workspaceBrandSource).not.toContain("dark:hidden")
    expect(workspaceBrandSource).not.toContain("dark:block")
  })
})
