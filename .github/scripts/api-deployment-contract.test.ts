import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"

const flyConfigPaths = ["apps/api/fly.dev.toml", "apps/api/fly.hml.toml", "apps/api/fly.prd.toml"]

describe("API deployment contract", () => {
  it("runs the compiled migration entrypoint in every Fly release", () => {
    for (const configPath of flyConfigPaths) {
      const config = readFileSync(configPath, "utf8")

      expect(config).toContain('release_command = "bun dist/modules/idp/database/migrate.js"')
      expect(config).not.toContain("src/modules/idp/database/migrate.ts")
    }
  })

  it("copies compiled API and migration files into the runtime image", () => {
    const dockerfile = readFileSync("apps/api/Dockerfile", "utf8")

    expect(dockerfile).toContain("COPY --from=build /app/apps/api/dist apps/api/dist")
    expect(dockerfile).toContain("COPY --from=build /app/apps/api/drizzle apps/api/drizzle")
  })

  it("deploys automatically at environment boundaries without a legacy deploy flag", () => {
    const workflowExpectations = [
      [".github/workflows/develop-pipeline.yml", "environment: dev", "deploy: true"],
      [".github/workflows/homolog-pipeline.yml", "environment: hml", "deploy: true"],
      [".github/workflows/production-pipeline.yml", "environment: prd", "deploy: true"],
      [".github/workflows/promotion-pipeline.yml", "environment: prd", "deploy: false"],
    ] as const

    for (const [workflowPath, environment, deploy] of workflowExpectations) {
      const workflow = readFileSync(workflowPath, "utf8")

      expect(workflow).toContain(environment)
      expect(workflow).toContain(deploy)
      expect(workflow).not.toContain("CICD__DEPLOY_ENABLED")
    }
  })

  it("maps the development deployment comment to the script CICD contract", () => {
    const workflow = readFileSync(".github/workflows/reusable-delivery.yml", "utf8")
    const requiredNames = [
      "CICD__API_DEPLOYED",
      "CICD__API_HEALTH_URL",
      "CICD__API_URL",
      "CICD__COMMIT_SHA",
      "CICD__GITHUB_TOKEN",
      "CICD__PR_NUMBER",
      "CICD__RUN_URL",
      "CICD__SITE_DEPLOYED",
      "CICD__SITE_URL",
      "CICD__STUDIO_DEPLOYED",
      "CICD__STUDIO_URL",
    ]

    for (const name of requiredNames) {
      expect(workflow).toContain(`${name}:`)
    }

    expect(workflow).toMatch(/CICD__GITHUB_TOKEN: \$\{\{ github\.token \}\}/)
    expect(workflow).not.toContain("\n          GITHUB_TOKEN:")
  })
})
