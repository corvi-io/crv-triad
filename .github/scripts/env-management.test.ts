import { describe, expect, it } from "bun:test"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  appendGitHubEnvFile,
  assertSchema,
  type EnvSchema,
  loadSchema,
  renderFlySecretsImportInput,
  selectRuntimeEnv,
  syncFlySecrets,
} from "./env-management"

const schema: EnvSchema = {
  schema_version: 1,
  platform: {
    cicd: {
      owner: ".github",
      env: [
        {
          source: "CICD__DEPLOY_ENABLED",
          github: "variable",
          scope: "environment",
          required: true,
        },
      ],
    },
    infra: {
      owner: ".github",
      env: [
        {
          source: "INFRA__FLY_API_TOKEN",
          github: "secret",
          scope: "environment",
          required: false,
        },
      ],
    },
  },
  apps: {
    api: {
      owner: "apps/api",
      runtime: "fly",
      targets: {
        dev: {
          github_environment: "dev",
          fly_app: "crv-triad-api-dev",
          fly_config: "apps/api/fly.dev.toml",
        },
      },
      env: [
        {
          source: "API__DATABASE_URL",
          runtime: "DATABASE_URL",
          github: "secret",
          required: true,
        },
        {
          source: "API__IDP_BASE_URL",
          runtime: "IDP_BASE_URL",
          github: "variable",
          required: true,
        },
      ],
    },
    site: {
      owner: "apps/site",
      runtime: "cloudflare-pages-static",
      targets: {
        dev: {
          github_environment: "dev",
          cloudflare_pages_branch: "dev",
        },
      },
      env: [
        {
          source: "SITE__PUBLIC_SITE_URL",
          runtime: "PUBLIC_SITE_URL",
          github: "variable",
          required: true,
        },
      ],
    },
  },
}

describe("env-management", () => {
  it("validates app source prefixes and target metadata", () => {
    expect(() => assertSchema(schema)).not.toThrow()

    const invalid = structuredClone(schema)
    invalid.apps.api.env[0].source = "IDP__DATABASE_URL"

    expect(() => assertSchema(invalid)).toThrow(
      'Source "IDP__DATABASE_URL" must use the app prefix "API__".',
    )
  })

  it("rejects stale lowercase source names", () => {
    const invalid = structuredClone(schema)
    invalid.apps.api.env[0].source = "api__DATABASE_URL"

    expect(() => assertSchema(invalid)).toThrow('App "api" has invalid source name.')
  })

  it("requires categorized CICD and infrastructure source prefixes", () => {
    const invalid = structuredClone(schema)
    invalid.platform.infra.env[0].source = "FLY_API_TOKEN"

    expect(() => assertSchema(invalid)).toThrow(
      'Platform source "FLY_API_TOKEN" must use the prefix "INFRA__".',
    )
  })

  it("keeps the checked-in schema limited to target-specific mappings", async () => {
    const checkedInSchema = await loadSchema()

    expect(
      Object.fromEntries(
        Object.entries(checkedInSchema.apps).map(([appName, app]) => [
          appName,
          app.env.map((entry) => entry.source),
        ]),
      ),
    ).toEqual({
      api: ["API__DATABASE_URL", "API__IDP_BASE_URL"],
      idp: [
        "IDP__DATABASE_URL",
        "IDP__BETTER_AUTH_SECRET",
        "IDP__APP_ENV",
        "IDP__BETTER_AUTH_URL",
        "IDP__AUTH_TRUSTED_ORIGINS",
      ],
      site: ["SITE__PUBLIC_SITE_URL"],
      studio: [
        "STUDIO__VITE_AUTH_BASE_URL",
        "STUDIO__VITE_DEPLOY_TARGET",
        "STUDIO__VITE_SCHEDULING_SOURCE",
      ],
    })
    expect(
      Object.fromEntries(
        Object.entries(checkedInSchema.platform).map(([category, config]) => [
          category,
          config.env.map((entry) => entry.source),
        ]),
      ),
    ).toEqual({
      cicd: ["CICD__DEPLOY_ENABLED", "CICD__RELEASE_ENABLED", "CICD__RELEASE_TOKEN"],
      infra: [
        "INFRA__FLY_API_TOKEN",
        "INFRA__CLOUDFLARE_API_TOKEN",
        "INFRA__CLOUDFLARE_ACCOUNT_ID",
        "INFRA__CLOUDFLARE_SITE_PROJECT_NAME",
        "INFRA__CLOUDFLARE_STUDIO_PROJECT_NAME",
        "INFRA__STUDIO_URL",
      ],
    })
  })

  it("validates declared source and provider-control wiring in every workflow", async () => {
    const workflowPaths = [
      ".github/workflows/develop-pipeline.yml",
      ".github/workflows/homolog-pipeline.yml",
      ".github/workflows/prepare-production-release.yml",
      ".github/workflows/production-pipeline.yml",
      ".github/workflows/promotion-pipeline.yml",
      ".github/workflows/publish-release.yml",
      ".github/workflows/sync-staging-with-main.yml",
    ]
    const checkedInSchema = await loadSchema()
    const declaredSources = new Map(
      [
        ...Object.values(checkedInSchema.platform).flatMap((category) => category.env),
        ...Object.values(checkedInSchema.apps).flatMap((app) => app.env),
      ].map((entry) => [entry.source, entry.github]),
    )

    for (const path of workflowPaths) {
      const content = readFileSync(path, "utf8")
      const sourceReferences = [
        ...content.matchAll(/\$\{\{\s+(secrets|vars)\.([A-Z][A-Z0-9]*__[A-Z0-9_]+)\s+\}\}/g),
      ]

      expect(() => Bun.YAML.parse(content)).not.toThrow()
      expect(content).not.toMatch(/\b(?:api|idp|site|studio)__[A-Z0-9_]+\b/)
      expect(content).not.toMatch(
        /\b(?:FLY_API_TOKEN|CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|RELEASE_PLEASE_TOKEN)\b/,
      )

      for (const [, context, source] of sourceReferences) {
        const githubKind = declaredSources.get(source)
        expect(githubKind).toBeDefined()
        expect(context).toBe(githubKind === "secret" ? "secrets" : "vars")
      }
    }
  })

  it("propagates fail-closed Studio scheduling inputs through every deployment target", () => {
    for (const [path, target] of [
      [".github/workflows/develop-pipeline.yml", "dev"],
      [".github/workflows/homolog-pipeline.yml", "hml"],
      [".github/workflows/production-pipeline.yml", "prd"],
    ] as const) {
      const content = readFileSync(path, "utf8")

      expect(content.match(new RegExp(`STUDIO__VITE_DEPLOY_TARGET: ${target}`, "g"))).toHaveLength(
        2,
      )
      expect(
        content.match(
          /STUDIO__VITE_SCHEDULING_SOURCE: \$\{\{ vars\.STUDIO__VITE_SCHEDULING_SOURCE \}\}/g,
        ),
      ).toHaveLength(2)
    }
  })

  it("keeps the promotion pull-request check independent from the production environment", () => {
    const content = readFileSync(".github/workflows/promotion-pipeline.yml", "utf8")

    expect(content).not.toMatch(/^\s+environment:/m)
    expect(content).not.toContain("--target prd")
    expect(content).not.toContain("vars.CICD__DEPLOY_ENABLED")
  })

  it("maps app-prefixed GitHub names to runtime names", () => {
    const selection = selectRuntimeEnv(schema, "api", "dev", {
      API__DATABASE_URL: "postgresql://user:secret@example.test/db",
      API__IDP_BASE_URL: "https://idp.example.test",
    })

    expect(selection.values).toMatchObject([
      {
        source: "API__DATABASE_URL",
        runtime: "DATABASE_URL",
      },
      {
        source: "API__IDP_BASE_URL",
        runtime: "IDP_BASE_URL",
      },
    ])
  })

  it("reports missing source keys without printing present secret values", () => {
    expect(() =>
      selectRuntimeEnv(schema, "api", "dev", {
        API__DATABASE_URL: "postgresql://user:secret@example.test/db",
      }),
    ).toThrow("API__IDP_BASE_URL")

    try {
      selectRuntimeEnv(schema, "api", "dev", {
        API__DATABASE_URL: "postgresql://user:secret@example.test/db",
      })
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).not.toContain("secret@example")
    }
  })

  it("writes runtime names to GitHub env files without source names", () => {
    const selection = selectRuntimeEnv(schema, "site", "dev", {
      SITE__PUBLIC_SITE_URL: "https://corvi.test",
    })
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "triad-env-"))
    const filePath = join(temporaryDirectory, "github-env")

    try {
      appendGitHubEnvFile(filePath, selection)

      const content = readFileSync(filePath, "utf8")
      expect(content).toContain("PUBLIC_SITE_URL=https://corvi.test")
      expect(content).not.toContain("SITE__PUBLIC_SITE_URL")
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true })
    }
  })

  it("renders Fly import input and calls flyctl without logging values", () => {
    const selection = selectRuntimeEnv(schema, "api", "dev", {
      API__DATABASE_URL: 'postgresql://user:"secret"@example.test/db',
      API__IDP_BASE_URL: "https://idp.example.test",
    })
    const input = renderFlySecretsImportInput(selection)
    const calls: Array<{ args: string[]; input: string }> = []

    syncFlySecrets(selection, (args, stdin) => {
      calls.push({ args, input: stdin })
      return { status: 0 }
    })

    expect(input).toContain('DATABASE_URL=postgresql://user:"secret"@example.test/db')
    expect(input).toContain("IDP_BASE_URL=https://idp.example.test")
    expect(input).not.toContain('DATABASE_URL="')
    expect(calls).toEqual([
      {
        args: ["secrets", "import", "--app", "crv-triad-api-dev", "--stage"],
        input,
      },
    ])
  })

  it("redacts Fly import failure output", () => {
    const selection = selectRuntimeEnv(schema, "api", "dev", {
      API__DATABASE_URL: "postgresql://user:secret@example.test/db",
      API__IDP_BASE_URL: "https://idp.example.test",
    })

    expect(() =>
      syncFlySecrets(selection, () => ({
        status: 1,
        stderr: "failed for postgresql://user:secret@example.test/db",
      })),
    ).toThrow("failed for <redacted>")
  })

  it("rejects multiline Fly values instead of encoding unsafe literals", () => {
    const selection = selectRuntimeEnv(schema, "api", "dev", {
      API__DATABASE_URL: "postgresql://user:secret@example.test/db",
      API__IDP_BASE_URL: "line-1\nline-2",
    })

    expect(() => renderFlySecretsImportInput(selection)).toThrow(
      'Fly runtime value "IDP_BASE_URL" contains a newline',
    )
  })
})
