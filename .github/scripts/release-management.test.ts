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
  it("starts production release preparation only through manual dispatch", () => {
    const workflow = readFileSync(".github/workflows/prepare-production-release.yml", "utf8")

    expect(workflow).toContain("workflow_dispatch:")
    expect(workflow).not.toContain("workflow_run:")
    expect(workflow).toContain(`if: \${{ vars.CICD__RELEASE_ENABLED == 'true' }}`)
    expect(workflow).toContain("release_subject_pattern=")
    expect(workflow).toContain('[[ "$subject" =~ $release_subject_pattern ]]')
    expect(workflow).not.toContain('[[ "$subject" =~ ^')
    expect(workflow).toContain('--label "autorelease: pending"')
    expect(workflow).not.toContain('--head "release-please--branches--')
  })

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
