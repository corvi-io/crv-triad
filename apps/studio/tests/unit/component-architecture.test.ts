import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("Studio component dependency model", () => {
  it("keeps shared code independent from modules and development tooling", async () => {
    const sharedRoot = path.resolve(process.cwd(), "src/modules/shared")
    const source = (await sourceFiles(sharedRoot)).map((file) => readFile(file, "utf8"))
    const combined = (await Promise.all(source)).join("\n")
    expect(combined).not.toMatch(/from ["']@\/dev\//)
    expect(combined).not.toMatch(/from ["']@\/modules\/(?!shared\/|auth\/)/)
  })

  it("has no shared mega-barrel", async () => {
    await expect(
      stat(path.resolve(process.cwd(), "src/modules/shared/components/index.ts")),
    ).rejects.toThrow()
    await expect(
      stat(path.resolve(process.cwd(), "src/modules/shared/components/index.tsx")),
    ).rejects.toThrow()
  })

  it("uses durable text instead of a separate component catalog runtime", async () => {
    const appRoot = path.resolve(process.cwd())
    const packageManifest = await readFile(path.join(appRoot, "package.json"), "utf8")
    const source = await sourceFiles(path.join(appRoot, "src"))

    expect(packageManifest.toLowerCase()).not.toContain("storybook")
    expect(source.filter((file) => file.includes(".stories."))).toEqual([])
    await expect(stat(path.join(appRoot, ".storybook"))).rejects.toThrow()
  })
})

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(target)
      return /\.(ts|tsx)$/.test(entry.name) ? [target] : []
    }),
  )
  return files.flat()
}
