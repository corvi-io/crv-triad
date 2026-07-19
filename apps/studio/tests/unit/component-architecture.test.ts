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

    const productionRoute = await readFile(
      path.resolve(process.cwd(), "src/routes/workspace-preview/sandbox/index.tsx"),
      "utf8",
    )
    const productionShim = await readFile(
      path.resolve(process.cwd(), "src/modules/shared/config/development-sandbox-disabled.ts"),
      "utf8",
    )
    expect(`${productionRoute}\n${productionShim}`).not.toMatch(/(?:@\/|src\/)dev\//)
    expect(productionRoute).toContain('from "virtual:studio-development-sandbox"')
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
    const workspaceRoot = path.resolve(appRoot, "../..")
    const qualityGatePath = path.join(workspaceRoot, ".github/scripts/run-quality-gate.sh")
    const developWorkflowPath = path.join(workspaceRoot, ".github/workflows/develop-pipeline.yml")
    const machineFiles = [
      path.join(workspaceRoot, "package.json"),
      path.join(workspaceRoot, "bun.lock"),
      path.join(appRoot, "package.json"),
      qualityGatePath,
      developWorkflowPath,
      ...(await sourceFiles(path.join(appRoot, "scripts"))),
    ]
    const machineText = (
      await Promise.all(machineFiles.map((file) => readFile(file, "utf8")))
    ).join("\n")
    const catalogPackageNames = /@storybook\/|@ladle\/|\b(?:storybook|chromatic|histoire|ladle)\b/i
    const appFiles = await filesWithoutDependencies(appRoot)
    const catalogSourceNames = /(?:^|\/)[^/]+\.(?:stories|story)\.(?:[cm]?[jt]sx?|mdx)$/i
    const forbiddenPaths = [
      ".storybook",
      ".chromatic",
      ".histoire",
      ".ladle",
      "storybook-static",
      "chromatic.config.json",
      "histoire-dist",
      "histoire.config.ts",
      "ladle.config.ts",
      "node_modules/@ladle",
      "node_modules/@storybook",
      "node_modules/.cache/histoire",
      "node_modules/.cache/ladle",
      "node_modules/.cache/storybook",
      "node_modules/chromatic",
      "node_modules/histoire",
    ]
    const qualityGate = await readFile(qualityGatePath, "utf8")
    const developWorkflow = await readFile(developWorkflowPath, "utf8")

    expect(machineText).not.toMatch(catalogPackageNames)
    expect(appFiles.filter((file) => catalogSourceNames.test(file))).toEqual([])
    expect(qualityGate).toContain("bun --filter studio test:e2e:sandbox")
    expect(qualityGate).toContain("bun --filter studio test:e2e:production")
    expect(developWorkflow).toContain("bunx playwright install --with-deps --only-shell chromium")
    for (const candidate of forbiddenPaths) {
      await expect(stat(path.join(appRoot, candidate))).rejects.toThrow()
    }
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

async function filesWithoutDependencies(directory: string): Promise<string[]> {
  const ignoredDirectories = new Set(["dist", "node_modules", "playwright-report", "test-results"])
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        return ignoredDirectories.has(entry.name) ? [] : filesWithoutDependencies(target)
      }
      return [target]
    }),
  )
  return files.flat()
}
