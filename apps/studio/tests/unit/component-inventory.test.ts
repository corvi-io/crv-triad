import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("shared component inventory", () => {
  it("classifies every active shared component source", async () => {
    const componentRoot = path.resolve(process.cwd(), "src/modules/shared/components")
    const documentation = await readFile(
      path.resolve(process.cwd(), "../../docs/studio/component-system.md"),
      "utf8",
    )
    const files = (await componentFiles(componentRoot)).map((file) =>
      path.relative(componentRoot, file),
    )

    for (const file of files) {
      const entry = `\`${file}\``
      const occurrences = documentation.split(entry).length - 1
      expect(occurrences, `Expected exactly one inventory decision for ${file}`).toBe(1)
    }
  })
})

async function componentFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) return componentFiles(target)
      return entry.name.endsWith(".tsx") ? [target] : []
    }),
  )
  return files.flat()
}
