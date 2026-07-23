import { readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("development mock boundary", () => {
  it("isolates production-boundary builds from inherited preview env", async () => {
    const packageJson = JSON.parse(
      await readFile(path.resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> }

    expect(packageJson.scripts["test:production-boundary"]).toMatch(
      /^VITE_DEPLOY_TARGET=prd VITE_SCHEDULING_SOURCE=disabled VITE_BARBERSHOP_SETUP_SOURCE=disabled VITE_CLIENT_MANAGEMENT_SOURCE=disabled /,
    )
    expect(packageJson.scripts["test:e2e:production"]).toMatch(
      /^VITE_DEPLOY_TARGET=prd VITE_SCHEDULING_SOURCE=disabled VITE_BARBERSHOP_SETUP_SOURCE=disabled VITE_CLIENT_MANAGEMENT_SOURCE=disabled /,
    )
    expect(packageJson.scripts.dev).toContain(
      "VITE_DEPLOY_TARGET=local VITE_SCHEDULING_SOURCE=memory VITE_BARBERSHOP_SETUP_SOURCE=memory VITE_CLIENT_MANAGEMENT_SOURCE=memory",
    )
  })

  it("contains no auth interception or network mocking", async () => {
    const files = [
      "src/dev/mock-engine/memory-scenario-engine.ts",
      "src/dev/sandbox/module/memory-repository.ts",
      "src/dev/sandbox/sandbox-page.tsx",
      "src/dev/scheduling/memory-repository.ts",
      "src/dev/scheduling/scenarios.ts",
      "src/dev/barbershop-setup/memory-repository.ts",
      "src/dev/barbershop-setup/scenarios.ts",
      "src/dev/clients/memory-repository.ts",
      "src/dev/clients/scenarios.ts",
    ]
    const source = (
      await Promise.all(files.map((file) => readFile(path.resolve(process.cwd(), file), "utf8")))
    ).join("\n")
    expect(source).not.toMatch(
      /api\/auth|better-auth|\bfetch\(|\bmsw\b|setupWorker|http\.(get|post)/i,
    )
  })
})
