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
      web: ["WEB__VITE_AUTH_BASE_URL", "WEB__VITE_API_BASE_URL"],
    })
  })

  it("validates declared source and provider-control wiring in every workflow", async () => {
    const workflowExpectations = {
      ".github/workflows/develop-pipeline.yml": {
        providerControls: [
          "SITE__CLOUDFLARE_PAGES_PROJECT_NAME",
          "WEB__CLOUDFLARE_PAGES_PROJECT_NAME",
          "WEB__CLOUDFLARE_PAGES_URL",
        ],
        sources: [
          "API__DATABASE_URL",
          "API__IDP_BASE_URL",
          "IDP__DATABASE_URL",
          "IDP__BETTER_AUTH_SECRET",
          "IDP__APP_ENV",
          "IDP__BETTER_AUTH_URL",
          "IDP__AUTH_TRUSTED_ORIGINS",
          "SITE__PUBLIC_SITE_URL",
          "WEB__VITE_AUTH_BASE_URL",
          "WEB__VITE_API_BASE_URL",
        ],
      },
      ".github/workflows/homolog-pipeline.yml": {
        providerControls: [
          "SITE__CLOUDFLARE_PAGES_PROJECT_NAME",
          "WEB__CLOUDFLARE_PAGES_PROJECT_NAME",
          "WEB__CLOUDFLARE_PAGES_URL",
        ],
        sources: [
          "API__DATABASE_URL",
          "API__IDP_BASE_URL",
          "IDP__DATABASE_URL",
          "IDP__BETTER_AUTH_SECRET",
          "IDP__APP_ENV",
          "IDP__BETTER_AUTH_URL",
          "IDP__AUTH_TRUSTED_ORIGINS",
          "SITE__PUBLIC_SITE_URL",
          "WEB__VITE_AUTH_BASE_URL",
          "WEB__VITE_API_BASE_URL",
        ],
      },
      ".github/workflows/prepare-production-release.yml": {
        providerControls: [],
        sources: [],
      },
      ".github/workflows/production-pipeline.yml": {
        providerControls: [
          "SITE__CLOUDFLARE_PAGES_PROJECT_NAME",
          "WEB__CLOUDFLARE_PAGES_PROJECT_NAME",
          "WEB__CLOUDFLARE_PAGES_URL",
        ],
        sources: [
          "API__DATABASE_URL",
          "API__IDP_BASE_URL",
          "IDP__DATABASE_URL",
          "IDP__BETTER_AUTH_SECRET",
          "IDP__APP_ENV",
          "IDP__BETTER_AUTH_URL",
          "IDP__AUTH_TRUSTED_ORIGINS",
          "SITE__PUBLIC_SITE_URL",
          "WEB__VITE_AUTH_BASE_URL",
          "WEB__VITE_API_BASE_URL",
        ],
      },
      ".github/workflows/promotion-pipeline.yml": {
        providerControls: [],
        sources: ["SITE__PUBLIC_SITE_URL", "WEB__VITE_AUTH_BASE_URL", "WEB__VITE_API_BASE_URL"],
      },
      ".github/workflows/publish-release.yml": {
        providerControls: [],
        sources: [],
      },
      ".github/workflows/sync-staging-with-main.yml": {
        providerControls: [],
        sources: [],
      },
    }
    const checkedInSchema = await loadSchema()
    const declaredSources = new Map(
      Object.values(checkedInSchema.apps)
        .flatMap((app) => app.env)
        .map((entry) => [entry.source, entry.github]),
    )

    for (const [path, expectation] of Object.entries(workflowExpectations)) {
      const content = readFileSync(path, "utf8")
      const providerControls = [
        ...new Set(content.match(/\b(?:SITE|WEB)__CLOUDFLARE_PAGES_[A-Z_]+\b/g) ?? []),
      ]
      const sources = [
        ...new Set(content.match(/\b(?:API|IDP|SITE|WEB)__[A-Z0-9_]+\b/g) ?? []),
      ].filter((source) => !providerControls.includes(source))

      expect(() => Bun.YAML.parse(content)).not.toThrow()
      expect(sources.sort()).toEqual([...expectation.sources].sort())
      expect(sources.every((source) => declaredSources.has(source))).toBe(true)
      expect(providerControls.sort()).toEqual([...expectation.providerControls].sort())
      expect(content).not.toMatch(/\b(?:api|idp|site|web)__[A-Z0-9_]+\b/)
      expect(content).not.toMatch(/\b(?:API|IDP)__CLOUDFLARE_/)
      expect(content).not.toMatch(/\b(?:SITE|WEB)_CLOUDFLARE_/)

      for (const source of expectation.sources) {
        const githubKind = declaredSources.get(source)
        expect(githubKind).toBeDefined()
        const githubContext = githubKind === "secret" ? "secrets" : "vars"
        expect(content).toMatch(
          new RegExp(`\\b${source}: \\$\\{\\{ ${githubContext}\\.${source} \\}\\}`),
        )
      }

      for (const providerControl of expectation.providerControls) {
        expect(content).toContain(`${providerControl}: \${{ vars.${providerControl} }}`)
      }
    }
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
