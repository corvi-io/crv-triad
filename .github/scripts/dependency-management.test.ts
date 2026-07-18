import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"

type DependabotUpdate = {
  "package-ecosystem": string
  "target-branch": string
  groups: Record<
    string,
    {
      patterns: string[]
      "update-types": string[]
    }
  >
}

describe("dependency-management", () => {
  it("routes grouped minor and patch updates through staging", () => {
    const config = Bun.YAML.parse(readFileSync(".github/dependabot.yml", "utf8")) as {
      updates: DependabotUpdate[]
    }

    expect(config.updates.map((update) => update["package-ecosystem"])).toEqual([
      "bun",
      "uv",
      "github-actions",
    ])

    for (const update of config.updates) {
      expect(update["target-branch"]).toBe("staging")

      for (const group of Object.values(update.groups)) {
        expect(group.patterns).toEqual(["*"])
        expect(group["update-types"]).toEqual(["minor", "patch"])
      }
    }
  })
})
