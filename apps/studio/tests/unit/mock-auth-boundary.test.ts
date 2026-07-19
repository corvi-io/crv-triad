import { readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("development mock boundary", () => {
  it("contains no auth interception or network mocking", async () => {
    const files = [
      "src/dev/mock-engine/memory-scenario-engine.ts",
      "src/dev/sandbox/module/memory-repository.ts",
      "src/dev/sandbox/sandbox-page.tsx",
    ]
    const source = (
      await Promise.all(files.map((file) => readFile(path.resolve(process.cwd(), file), "utf8")))
    ).join("\n")
    expect(source).not.toMatch(
      /api\/auth|better-auth|\bfetch\(|\bmsw\b|setupWorker|http\.(get|post)/i,
    )
  })
})
