import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"

const flyConfigPaths = ["apps/api/fly.dev.toml", "apps/api/fly.hml.toml", "apps/api/fly.prd.toml"]

describe("API deployment contract", () => {
  it("runs the compiled migration entrypoint in every Fly release", () => {
    for (const configPath of flyConfigPaths) {
      const config = readFileSync(configPath, "utf8")

      expect(config).toContain('release_command = "bun dist/modules/idp/database/migrate.js"')
      expect(config).toContain('path = "/ready"')
      expect(config).not.toContain('path = "/health"')
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
    const workflow = readFileSync(".github/workflows/develop-pipeline.yml", "utf8")
    const requiredNames = [
      "CICD__API_DEPLOYED",
      "CICD__API_HEALTH_URL",
      "CICD__API_URL",
      "CICD__BACKSTAGE_DEPLOYED",
      "CICD__BACKSTAGE_URL",
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

  it("runs repository CI configuration tests in every delivery pipeline", () => {
    const workflow = readFileSync(".github/workflows/reusable-delivery.yml", "utf8")

    expect(workflow).toContain("run: bun run test:ci")
  })

  it("requires and deploys Trigger.dev before the API runtime for every hosted target", () => {
    const deployGate = readFileSync(".github/scripts/run-deploy-gate.sh", "utf8")
    const healthGate = deployGate.indexOf('wait_for_health "$api_health_url"')
    const triggerDeploy = deployGate.indexOf(
      "deploy_trigger_tasks",
      deployGate.indexOf('if [[ "$app" == "api" ]]'),
    )
    const flyDeploy = deployGate.indexOf("flyctl deploy")

    expect(deployGate).toContain("INFRA__TRIGGER_ACCESS_TOKEN")
    expect(deployGate).toContain("trigger_args=(--env preview --branch dev)")
    expect(deployGate).toContain("trigger_args=(--env staging)")
    expect(deployGate).toContain("trigger_args=(--env prod)")
    expect(deployGate).toContain("bun run --cwd apps/api deploy:trigger")
    expect(deployGate).not.toContain("bun --cwd apps/api run deploy:trigger")
    expect(deployGate).toContain('--external-id "$' + "{GITHUB_SHA:?GITHUB_SHA is required}" + '"')
    expect(healthGate).toBeGreaterThan(-1)
    expect(triggerDeploy).toBeGreaterThan(-1)
    expect(triggerDeploy).toBeLessThan(flyDeploy)
    expect(healthGate).toBeGreaterThan(flyDeploy)
  })

  it("deploys Backstage at environment boundaries after affected API delivery", () => {
    const workflow = readFileSync(".github/workflows/reusable-delivery.yml", "utf8")

    expect(workflow).toContain("needs: [detect, security, api]")
    expect(workflow).toMatch(/with: \{ app: backstage, deploy: "\$\{\{ inputs\.deploy \}\}"/)
    expect(workflow).not.toContain("app: backstage, deploy: false")
  })

  it("treats the protected Backstage edge response as reachable", () => {
    const deployGate = readFileSync(".github/scripts/run-deploy-gate.sh", "utf8")

    expect(deployGate).toContain('wait_for_health "$backstage_health_url" "403"')
    expect(deployGate).toContain('[[ "$status" =~ ^[23][0-9][0-9]$')
    expect(deployGate).not.toContain('wait_for_health "$studio_health_url" "403"')
  })

  it("does not report skipped development deploys as successful deployments", () => {
    const workflow = readFileSync(".github/workflows/reusable-app-delivery.yml", "utf8")
    const deployGate = readFileSync(".github/scripts/run-deploy-gate.sh", "utf8")

    expect(workflow).toContain("steps.deploy-gate.outputs.deployed")
    expect(workflow).not.toContain('echo "deployed=true" >> "$GITHUB_OUTPUT"')
    expect(deployGate).toContain("record_deployment false")
    expect(deployGate).toContain("record_deployment true")
  })

  it("publishes the Backstage preview in development deployment comments", () => {
    const script = readFileSync(".github/scripts/comment-pr-api-deploy.py", "utf8")

    expect(script).toContain('optional_env("CICD__BACKSTAGE_DEPLOYED")')
    expect(script).toContain('optional_env("CICD__BACKSTAGE_URL")')
    expect(script).toContain("Backstage")
  })
})
