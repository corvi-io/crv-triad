import { describe, expect, it } from "bun:test"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  appendGitHubEnvFile,
  assertSchema,
  type EnvSchema,
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
          source: "API__CAMPAIGN_LINKS_ADMIN_TOKEN",
          runtime: "CAMPAIGN_LINKS_ADMIN_TOKEN",
          github: "secret",
          required: true,
        },
        {
          source: "API__POSTHOG_UPSTREAM_URL",
          runtime: "POSTHOG_UPSTREAM_URL",
          github: "variable",
          required: false,
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
      'Source "IDP__DATABASE_URL" must use the app prefix',
    )
  })

  it("maps app-prefixed Infisical names to runtime names", () => {
    const selection = selectRuntimeEnv(schema, "api", "dev", {
      API__DATABASE_URL: "postgresql://user:secret@example.test/db",
      API__CAMPAIGN_LINKS_ADMIN_TOKEN: "admin-secret",
      API__POSTHOG_UPSTREAM_URL: "https://us.i.posthog.com",
    })

    expect(selection.values).toMatchObject([
      {
        source: "API__DATABASE_URL",
        runtime: "DATABASE_URL",
      },
      {
        source: "API__CAMPAIGN_LINKS_ADMIN_TOKEN",
        runtime: "CAMPAIGN_LINKS_ADMIN_TOKEN",
      },
      {
        source: "API__POSTHOG_UPSTREAM_URL",
        runtime: "POSTHOG_UPSTREAM_URL",
      },
    ])
  })

  it("reports missing source keys without printing present secret values", () => {
    expect(() =>
      selectRuntimeEnv(schema, "api", "dev", {
        API__DATABASE_URL: "postgresql://user:secret@example.test/db",
      }),
    ).toThrow("API__CAMPAIGN_LINKS_ADMIN_TOKEN")

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
    const filePath = join(mkdtempSync(join(tmpdir(), "crv-env-")), "github-env")

    appendGitHubEnvFile(filePath, selection)

    const content = readFileSync(filePath, "utf8")
    expect(content).toContain("PUBLIC_SITE_URL=https://corvi.test")
    expect(content).not.toContain("SITE__PUBLIC_SITE_URL")
  })

  it("renders Fly import input and calls flyctl without logging values", () => {
    const selection = selectRuntimeEnv(schema, "api", "dev", {
      API__DATABASE_URL: 'postgresql://user:"secret"@example.test/db',
      API__CAMPAIGN_LINKS_ADMIN_TOKEN: "admin-secret",
    })
    const input = renderFlySecretsImportInput(selection)
    const calls: Array<{ args: string[]; input: string }> = []

    syncFlySecrets(selection, (args, stdin) => {
      calls.push({ args, input: stdin })
      return { status: 0 }
    })

    expect(input).toContain('DATABASE_URL=postgresql://user:"secret"@example.test/db')
    expect(input).toContain("CAMPAIGN_LINKS_ADMIN_TOKEN=admin-secret")
    expect(input).not.toContain('DATABASE_URL="')
    expect(calls).toEqual([
      {
        args: ["secrets", "import", "--app", "crv-triad-api-dev"],
        input,
      },
    ])
  })

  it("redacts Fly import failure output", () => {
    const selection = selectRuntimeEnv(schema, "api", "dev", {
      API__DATABASE_URL: "postgresql://user:secret@example.test/db",
      API__CAMPAIGN_LINKS_ADMIN_TOKEN: "admin-secret",
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
      API__CAMPAIGN_LINKS_ADMIN_TOKEN: "line-1\nline-2",
    })

    expect(() => renderFlySecretsImportInput(selection)).toThrow(
      'Fly runtime value "CAMPAIGN_LINKS_ADMIN_TOKEN" contains a newline',
    )
  })
})
