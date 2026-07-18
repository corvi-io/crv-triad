import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"

type ReleasePleaseConfig = {
  packages: Record<
    string,
    {
      "release-type": string
      "changelog-path": string
      "include-component-in-tag": boolean
    }
  >
}

describe("release-management", () => {
  it("keeps the root Node release version and changelog aligned", () => {
    const config = JSON.parse(
      readFileSync("release-please-config.json", "utf8"),
    ) as ReleasePleaseConfig
    const manifest = JSON.parse(readFileSync(".release-please-manifest.json", "utf8")) as Record<
      string,
      string
    >
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      private: boolean
      version: string
    }
    const changelog = readFileSync("CHANGELOG.md", "utf8")

    expect(config.packages["."]).toMatchObject({
      "release-type": "node",
      "changelog-path": "CHANGELOG.md",
      "include-component-in-tag": false,
    })
    expect(packageJson.private).toBe(true)
    expect(manifest["."]).toBe(packageJson.version)

    const escapedVersion = packageJson.version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    expect(changelog).toMatch(
      new RegExp(
        `^##\\s+(?:\\[v?${escapedVersion}\\](?:\\([^)]*\\))?|v?${escapedVersion})(?:\\s|$)`,
        "m",
      ),
    )
  })
})
