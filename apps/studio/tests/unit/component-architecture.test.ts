import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

type DeliverySurfaceEntry = {
  content?: string
  relativePath: string
}

const ignoredDeliveryDirectories = new Set([
  ".git",
  ".turbo",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
])

const catalogPathPattern =
  /(?:^|\/)(?:\.storybook|\.chromatic|\.histoire|\.ladle|storybook-static|histoire-dist|ladle-dist|chromatic-diagnostics)(?:\/|$)|(?:^|\/)(?:storybook|chromatic|histoire|ladle)(?:\.config)?\.(?:[cm]?[jt]s|json|ya?ml)$|\.(?:stories|story)\.(?:[cm]?[jt]sx?|mdx)$/i

const catalogContentPatterns = [
  /@storybook\/[a-z0-9._/-]+|@ladle\/[a-z0-9._/-]+/i,
  /["'](?:storybook|chromatic|histoire|ladle)["']\s*:/i,
  /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["'](?:chromatic|histoire|ladle)(?:\/[^"']*)?["']/i,
  /(?:^|\brun:\s*|[;&|]\s*|["']\s*:\s*["']|\b(?:bunx|npx|pnpm(?:\s+dlx)?|yarn(?:\s+dlx)?)\s+)(?:storybook(?:\s+(?:dev|build|test))?|start-storybook|build-storybook|test-storybook|chromatic|histoire(?:\s+(?:dev|build|preview))?|ladle(?:\s+(?:serve|build))?)(?=\s|["']|$)/im,
  /\buses:\s*(?:chromaui\/action|[^@\s]*(?:storybook|chromatic|histoire|ladle)[^@\s]*)@/i,
  /(?:^|[\s"'])(?:\.storybook|\.chromatic|\.histoire|\.ladle|storybook-static|histoire-dist|ladle-dist|chromatic-diagnostics)(?:[/\s"']|$)/i,
  /(?:^|[/"'])[^/"']+\.(?:stories|story)\.(?:[cm]?[jt]sx?|mdx)(?:["']|$)/i,
]

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

    const setupRoute = await readFile(
      path.resolve(process.cwd(), "src/routes/_authenticated/barbershop-setup/$section/index.tsx"),
      "utf8",
    )
    const setupShim = await readFile(
      path.resolve(process.cwd(), "src/modules/shared/config/barbershop-setup-source-disabled.ts"),
      "utf8",
    )
    expect(`${setupRoute}\n${setupShim}`).not.toMatch(/(?:@\/|src\/)dev\//)
    expect(setupRoute).toContain('from "virtual:studio-barbershop-setup-source"')

    const clientRoute = await readFile(
      path.resolve(process.cwd(), "src/routes/_authenticated/clients/index.tsx"),
      "utf8",
    )
    const clientShim = await readFile(
      path.resolve(process.cwd(), "src/modules/shared/config/client-management-source-disabled.ts"),
      "utf8",
    )
    expect(`${clientRoute}\n${clientShim}`).not.toMatch(/(?:@\/|src\/)dev\//)
    expect(clientRoute).toContain('from "virtual:studio-client-management-source"')

    const serviceDeskRoute = await readFile(
      path.resolve(process.cwd(), "src/routes/_authenticated/service-desk/index.tsx"),
      "utf8",
    )
    const serviceDeskShim = await readFile(
      path.resolve(process.cwd(), "src/modules/shared/config/service-desk-source-disabled.ts"),
      "utf8",
    )
    expect(`${serviceDeskRoute}\n${serviceDeskShim}`).not.toMatch(/(?:@\/|src\/)dev\//)
    expect(serviceDeskRoute).toContain('from "virtual:studio-service-desk-source"')

    const serviceDeskPage = await readFile(
      path.resolve(process.cwd(), "src/modules/service-desk/service-desk-page.tsx"),
      "utf8",
    )
    expect(serviceDeskPage).not.toContain("const developmentScenarioPresentation")
    expect(serviceDeskPage).not.toContain("const developmentScenarioGroupLabels")
    expect(serviceDeskRoute).toContain("scenarioPresentation={developmentScenarioPresentation}")
    expect(serviceDeskShim).toContain("export const developmentScenarioPresentation = undefined")

    const revenueRoute = await readFile(
      path.resolve(
        process.cwd(),
        "src/routes/_authenticated/service-desk/$sessionId/checkout/index.tsx",
      ),
      "utf8",
    )
    const revenueShim = await readFile(
      path.resolve(
        process.cwd(),
        "src/modules/shared/config/revenue-operations-source-disabled.ts",
      ),
      "utf8",
    )
    expect(`${revenueRoute}\n${revenueShim}`).not.toMatch(/(?:@\/|src\/)dev\//)
    expect(revenueRoute).toContain('from "virtual:studio-revenue-operations-source"')
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
    const deliverySurface = await collectDeliverySurface(workspaceRoot, appRoot)

    expect(findCatalogViolations(deliverySurface)).toEqual([])
  })

  it.each([
    [
      "dependency",
      "apps/studio/package.json",
      '{"devDependencies":{"@storybook/react-vite":"latest"}}',
    ],
    ["script", "apps/studio/package.json", '{"scripts":{"catalog":"histoire dev"}}'],
    ["configuration", "apps/studio/.ladle/config.mjs", "export default {}"],
    ["workflow", ".github/workflows/catalog.yml", "steps:\n  - uses: chromaui/action@v1"],
    ["story", "apps/studio/src/button.stories.tsx", "export default {}"],
    ["artifact", "apps/studio/storybook-static/index.html", "<html></html>"],
  ])("rejects a visual-catalog %s", (_kind, relativePath, content) => {
    expect(findCatalogViolations([{ relativePath, content }])).toEqual([relativePath])
  })

  it("allows policy prose that names a prohibited catalog", () => {
    const policyProse = [
      {
        relativePath: ".github/scripts/check-policy.sh",
        content:
          '# The Studio uses English Markdown and has no Storybook runtime.\necho "policy checked"',
      },
      {
        relativePath: "apps/studio/src/catalog-policy.ts",
        content: 'export const policy = "No Chromatic, Histoire, or Ladle runtime is allowed."',
      },
    ]

    expect(findCatalogViolations(policyProse)).toEqual([])
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

async function collectDeliverySurface(
  workspaceRoot: string,
  appRoot: string,
): Promise<DeliverySurfaceEntry[]> {
  const rootFiles = [path.join(workspaceRoot, "package.json"), path.join(workspaceRoot, "bun.lock")]
  const recursiveRoots = [
    path.join(workspaceRoot, ".github/workflows"),
    path.join(workspaceRoot, ".github/scripts"),
    path.join(appRoot, "scripts"),
    path.join(appRoot, "src"),
    path.join(appRoot, "config"),
    path.join(appRoot, "configs"),
  ]
  const appRootEntries = await readdir(appRoot, { withFileTypes: true })
  const appMachineFiles = appRootEntries
    .filter(
      (entry) =>
        entry.isFile() && /(?:\.config\.[cm]?[jt]s|\.json|\.html|\.ya?ml|\.toml)$/.test(entry.name),
    )
    .map((entry) => path.join(appRoot, entry.name))
  const appRootPaths = appRootEntries.map((entry) => ({
    relativePath: toRelativePath(workspaceRoot, path.join(appRoot, entry.name)),
  }))
  const files = [
    ...rootFiles,
    ...appMachineFiles,
    ...(await Promise.all(recursiveRoots.map((root) => deliveryFilesIfPresent(root)))).flat(),
  ]
  const fileEntries = await Promise.all(
    [...new Set(files)].map(async (file) => ({
      content: await readFile(file, "utf8"),
      relativePath: toRelativePath(workspaceRoot, file),
    })),
  )

  return [...appRootPaths, ...fileEntries]
}

async function deliveryFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        return ignoredDeliveryDirectories.has(entry.name) ? [] : deliveryFiles(target)
      }
      return [target]
    }),
  )
  return files.flat()
}

async function deliveryFilesIfPresent(directory: string): Promise<string[]> {
  try {
    await stat(directory)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }

  return deliveryFiles(directory)
}

function findCatalogViolations(entries: DeliverySurfaceEntry[]): string[] {
  return entries
    .filter(
      ({ content = "", relativePath }) =>
        catalogPathPattern.test(relativePath) ||
        catalogContentPatterns.some((pattern) => pattern.test(content)),
    )
    .map(({ relativePath }) => relativePath)
}

function toRelativePath(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join("/")
}
