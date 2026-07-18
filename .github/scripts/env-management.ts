#!/usr/bin/env bun

import { spawnSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { appendFileSync } from "node:fs"

type GitHubSourceKind = "secret" | "variable"
type AppRuntime = "fly" | "cloudflare-pages-static"
type PlatformEnvScope = "environment" | "repository"

export type EnvEntry = {
  source: string
  runtime: string
  github: GitHubSourceKind
  required: boolean
}

export type TargetConfig = {
  github_environment: string
  fly_app?: string
  fly_config?: string
  cloudflare_pages_branch?: string
}

export type AppConfig = {
  owner: string
  runtime: AppRuntime
  targets: Record<string, TargetConfig>
  env: EnvEntry[]
}

export type PlatformEnvEntry = {
  source: string
  github: GitHubSourceKind
  scope: PlatformEnvScope
  required: boolean
}

export type PlatformConfig = {
  owner: string
  env: PlatformEnvEntry[]
}

export type EnvSchema = {
  schema_version: number
  platform: Record<"cicd" | "infra", PlatformConfig>
  apps: Record<string, AppConfig>
}

export type RuntimeEnvValue = {
  source: string
  runtime: string
  github: GitHubSourceKind
  value: string
}

export type RuntimeEnvSelection = {
  appName: string
  targetName: string
  app: AppConfig
  target: TargetConfig
  values: RuntimeEnvValue[]
}

type Logger = Pick<Console, "error" | "log">
type FlyImportRunner = (
  args: string[],
  input: string,
) => { status: number | null; stdout?: string; stderr?: string }

const DEFAULT_SCHEMA_PATH = "env-schema.yaml"
const SOURCE_NAME_PATTERN = /^[A-Z][A-Z0-9]*__[A-Z][A-Z0-9_]*$/
const RUNTIME_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/

const USAGE = `Usage:
  bun .github/scripts/env-management.ts validate --app <api|idp|site|web> --target <dev|hml|prd> [--schema env-schema.yaml]
  bun .github/scripts/env-management.ts export --app <site|web> --target <dev|hml|prd> --github-env <path> [--schema env-schema.yaml]
  bun .github/scripts/env-management.ts sync-fly --app <api|idp> --target <dev|hml|prd> [--schema env-schema.yaml]

Commands:
  validate   Check that the app, target, schema entries, and required GitHub Environment values exist.
  export     Append runtime NAME=VALUE mappings to a GitHub Actions env file without printing values.
  sync-fly   Stage mapped runtime env in the target Fly app through flyctl secrets import --stage.

GitHub source values must be present in the process environment using the app-prefixed names from env-schema.yaml.
`

export class EnvManagementError extends Error {}

export async function loadSchema(path = DEFAULT_SCHEMA_PATH): Promise<EnvSchema> {
  const raw = await Bun.file(path).text()
  const parsed = Bun.YAML.parse(raw)
  assertSchema(parsed)
  return parsed
}

export function assertSchema(value: unknown): asserts value is EnvSchema {
  if (!isRecord(value)) {
    throw new EnvManagementError("env-schema.yaml must contain a YAML object.")
  }

  if (value.schema_version !== 1) {
    throw new EnvManagementError("env-schema.yaml schema_version must be 1.")
  }

  if (!isRecord(value.apps) || Object.keys(value.apps).length === 0) {
    throw new EnvManagementError("env-schema.yaml must declare apps.")
  }

  const seenSources = new Set<string>()

  if (!isRecord(value.platform)) {
    throw new EnvManagementError("env-schema.yaml must declare platform env categories.")
  }

  for (const platformName of ["cicd", "infra"] as const) {
    const platform = value.platform[platformName]
    if (!isRecord(platform) || typeof platform.owner !== "string") {
      throw new EnvManagementError(`Platform category "${platformName}" is invalid.`)
    }
    if (!Array.isArray(platform.env) || platform.env.length === 0) {
      throw new EnvManagementError(`Platform category "${platformName}" must declare env entries.`)
    }

    const sourcePrefix = `${platformName.toUpperCase()}__`
    for (const entry of platform.env) {
      if (!isRecord(entry) || typeof entry.source !== "string") {
        throw new EnvManagementError(`Platform category "${platformName}" has an invalid entry.`)
      }
      if (!SOURCE_NAME_PATTERN.test(entry.source) || !entry.source.startsWith(sourcePrefix)) {
        throw new EnvManagementError(
          `Platform source "${entry.source}" must use the prefix "${sourcePrefix}".`,
        )
      }
      if (seenSources.has(entry.source)) {
        throw new EnvManagementError(`Duplicate source name "${entry.source}".`)
      }
      seenSources.add(entry.source)
      if (entry.github !== "secret" && entry.github !== "variable") {
        throw new EnvManagementError(`Platform source "${entry.source}" has invalid GitHub kind.`)
      }
      if (entry.scope !== "environment" && entry.scope !== "repository") {
        throw new EnvManagementError(`Platform source "${entry.source}" has invalid scope.`)
      }
      if (typeof entry.required !== "boolean") {
        throw new EnvManagementError(`Platform source "${entry.source}" must declare required.`)
      }
    }
  }

  for (const [appName, app] of Object.entries(value.apps)) {
    if (!isRecord(app)) {
      throw new EnvManagementError(`App "${appName}" must be an object.`)
    }

    if (appName !== appName.toLowerCase()) {
      throw new EnvManagementError(`App "${appName}" must use a lowercase schema key.`)
    }

    if (typeof app.owner !== "string" || app.owner.length === 0) {
      throw new EnvManagementError(`App "${appName}" must declare owner.`)
    }

    if (app.runtime !== "fly" && app.runtime !== "cloudflare-pages-static") {
      throw new EnvManagementError(`App "${appName}" has unsupported runtime.`)
    }

    if (!isRecord(app.targets) || Object.keys(app.targets).length === 0) {
      throw new EnvManagementError(`App "${appName}" must declare targets.`)
    }

    for (const [targetName, target] of Object.entries(app.targets)) {
      if (!isRecord(target) || typeof target.github_environment !== "string") {
        throw new EnvManagementError(`App "${appName}" target "${targetName}" is invalid.`)
      }

      if (app.runtime === "fly") {
        if (typeof target.fly_app !== "string" || target.fly_app.length === 0) {
          throw new EnvManagementError(
            `Fly app "${appName}" target "${targetName}" must declare fly_app.`,
          )
        }
        if (typeof target.fly_config !== "string" || target.fly_config.length === 0) {
          throw new EnvManagementError(
            `Fly app "${appName}" target "${targetName}" must declare fly_config.`,
          )
        }
      }
    }

    if (!Array.isArray(app.env) || app.env.length === 0) {
      throw new EnvManagementError(`App "${appName}" must declare env entries.`)
    }

    const seenRuntimeNames = new Set<string>()

    for (const entry of app.env) {
      if (!isRecord(entry)) {
        throw new EnvManagementError(`App "${appName}" contains an invalid env entry.`)
      }

      if (typeof entry.source !== "string" || !SOURCE_NAME_PATTERN.test(entry.source)) {
        throw new EnvManagementError(`App "${appName}" has invalid source name.`)
      }

      const sourcePrefix = `${appName.toUpperCase()}__`
      if (!entry.source.startsWith(sourcePrefix)) {
        throw new EnvManagementError(
          `Source "${entry.source}" must use the app prefix "${sourcePrefix}".`,
        )
      }

      if (seenSources.has(entry.source)) {
        throw new EnvManagementError(`Duplicate source name "${entry.source}".`)
      }
      seenSources.add(entry.source)

      if (typeof entry.runtime !== "string" || !RUNTIME_NAME_PATTERN.test(entry.runtime)) {
        throw new EnvManagementError(`Source "${entry.source}" has invalid runtime name.`)
      }

      if (seenRuntimeNames.has(entry.runtime)) {
        throw new EnvManagementError(
          `App "${appName}" has duplicate runtime name "${entry.runtime}".`,
        )
      }
      seenRuntimeNames.add(entry.runtime)

      if (entry.github !== "secret" && entry.github !== "variable") {
        throw new EnvManagementError(
          `Source "${entry.source}" must declare github as secret or variable.`,
        )
      }

      if (typeof entry.required !== "boolean") {
        throw new EnvManagementError(`Source "${entry.source}" must declare required as a boolean.`)
      }
    }
  }
}

export function selectRuntimeEnv(
  schema: EnvSchema,
  appName: string,
  targetName: string,
  sourceEnv: NodeJS.ProcessEnv = process.env,
): RuntimeEnvSelection {
  const app = schema.apps[appName]
  if (!app) {
    throw new EnvManagementError(
      `Unknown app "${appName}". Expected one of: ${Object.keys(schema.apps).join(", ")}.`,
    )
  }

  const target = app.targets[targetName]
  if (!target) {
    throw new EnvManagementError(
      `Unknown target "${targetName}" for app "${appName}". Expected one of: ${Object.keys(
        app.targets,
      ).join(", ")}.`,
    )
  }

  const missing = app.env
    .filter((entry) => entry.required && !hasRequiredValue(sourceEnv[entry.source]))
    .map((entry) => entry.source)

  if (missing.length > 0) {
    throw new EnvManagementError(
      `Missing required GitHub Environment values for ${appName}/${targetName}: ${missing.join(", ")}.`,
    )
  }

  return {
    appName,
    targetName,
    app,
    target,
    values: app.env.flatMap((entry) => {
      const value = sourceEnv[entry.source]
      if (!hasRequiredValue(value)) {
        return []
      }

      return [
        {
          source: entry.source,
          runtime: entry.runtime,
          github: entry.github,
          value,
        },
      ]
    }),
  }
}

export function renderFlySecretsImportInput(selection: RuntimeEnvSelection): string {
  const lines = selection.values.map(({ runtime, value }) => {
    if (value.includes("\n")) {
      throw new EnvManagementError(
        `Fly runtime value "${runtime}" contains a newline and cannot be imported safely.`,
      )
    }

    return `${runtime}=${value}`
  })
  return `${lines.join("\n")}\n`
}

export function formatGitHubEnvFileEntries(values: RuntimeEnvValue[]): string {
  return values
    .map(({ runtime, value }) => {
      if (!value.includes("\n")) {
        return `${runtime}=${value}\n`
      }

      const delimiter = `TRIAD_ENV_${runtime}_${randomUUID().replaceAll("-", "_")}`
      return `${runtime}<<${delimiter}\n${value}\n${delimiter}\n`
    })
    .join("")
}

export function appendGitHubEnvFile(path: string, selection: RuntimeEnvSelection): void {
  appendFileSync(path, formatGitHubEnvFileEntries(selection.values), { mode: 0o600 })
}

export function syncFlySecrets(
  selection: RuntimeEnvSelection,
  runner: FlyImportRunner = defaultFlyImportRunner,
): void {
  if (selection.app.runtime !== "fly" || !selection.target.fly_app) {
    throw new EnvManagementError(
      `App "${selection.appName}" target "${selection.targetName}" is not a Fly target.`,
    )
  }

  const input = renderFlySecretsImportInput(selection)
  const result = runner(["secrets", "import", "--app", selection.target.fly_app, "--stage"], input)

  if (result.status !== 0) {
    const output = redactFlyImportOutput(
      [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
      selection.values,
    )
    const detail = output ? ` Output: ${output}` : ""
    throw new EnvManagementError(
      `flyctl secrets import --stage failed for ${selection.appName}/${selection.targetName} with exit code ${
        result.status ?? "unknown"
      }.${detail}`,
    )
  }
}

export async function runCli(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
  logger: Logger = console,
): Promise<number> {
  try {
    const parsed = parseArgs(argv)

    if (parsed.help) {
      logger.log(USAGE.trimEnd())
      return 0
    }

    if (!parsed.command) {
      logger.error(USAGE.trimEnd())
      return 1
    }

    const schema = await loadSchema(parsed.schemaPath)
    const selection = selectRuntimeEnv(schema, parsed.app, parsed.target, env)

    if (parsed.command === "validate") {
      logger.log(
        `Validated ${selection.values.length} runtime env mappings for ${parsed.app}/${parsed.target}: ${runtimeNames(
          selection,
        )}.`,
      )
      return 0
    }

    if (parsed.command === "export") {
      if (!parsed.githubEnvPath) {
        throw new EnvManagementError("--github-env is required for export.")
      }
      if (selection.app.runtime !== "cloudflare-pages-static") {
        throw new EnvManagementError(
          "export is only supported for build-time Cloudflare Pages env.",
        )
      }

      appendGitHubEnvFile(parsed.githubEnvPath, selection)
      logger.log(
        `Exported ${selection.values.length} runtime env mappings for ${parsed.app}/${parsed.target}: ${runtimeNames(
          selection,
        )}.`,
      )
      return 0
    }

    if (parsed.command === "sync-fly") {
      syncFlySecrets(selection)
      logger.log(
        `Synced ${selection.values.length} Fly runtime env mappings for ${parsed.app}/${parsed.target} to ${
          selection.target.fly_app
        }: ${runtimeNames(selection)}.`,
      )
      return 0
    }

    throw new EnvManagementError(`Unknown command: ${parsed.command}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(message)
    return 1
  }
}

function defaultFlyImportRunner(
  args: string[],
  input: string,
): { status: number | null; stdout?: string; stderr?: string } {
  const result = spawnSync("flyctl", args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  })

  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

function redactFlyImportOutput(output: string, values: RuntimeEnvValue[]): string {
  let redacted = output
  for (const { value } of values) {
    if (value) {
      redacted = redacted.replaceAll(value, "<redacted>")
    }
  }
  return redacted
}

function parseArgs(argv: string[]): {
  app: string
  command: string
  githubEnvPath?: string
  help: boolean
  schemaPath: string
  target: string
} {
  if (argv.includes("--help") || argv.includes("-h")) {
    return {
      app: "",
      command: argv[0] ?? "",
      help: true,
      schemaPath: DEFAULT_SCHEMA_PATH,
      target: "",
    }
  }

  const [command, ...rest] = argv
  if (!command) {
    return {
      app: "",
      command: "",
      help: false,
      schemaPath: DEFAULT_SCHEMA_PATH,
      target: "",
    }
  }

  const options = new Map<string, string | boolean>()

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]
    if (arg === "--help" || arg === "-h") {
      options.set("help", true)
      continue
    }

    if (!arg.startsWith("--")) {
      throw new EnvManagementError(`Unexpected argument: ${arg}`)
    }

    const value = rest[index + 1]
    if (!value || value.startsWith("--")) {
      throw new EnvManagementError(`Missing value for ${arg}.`)
    }

    options.set(arg.slice(2), value)
    index += 1
  }

  return {
    app: stringOption(options, "app"),
    command: command ?? "",
    githubEnvPath: optionalStringOption(options, "github-env"),
    help: Boolean(options.get("help")),
    schemaPath: optionalStringOption(options, "schema") ?? DEFAULT_SCHEMA_PATH,
    target: stringOption(options, "target"),
  }
}

function stringOption(options: Map<string, string | boolean>, name: string): string {
  const value = optionalStringOption(options, name)
  if (!value) {
    throw new EnvManagementError(`--${name} is required.`)
  }
  return value
}

function optionalStringOption(
  options: Map<string, string | boolean>,
  name: string,
): string | undefined {
  const value = options.get(name)
  return typeof value === "string" ? value : undefined
}

function runtimeNames(selection: RuntimeEnvSelection): string {
  return selection.values.map((value) => value.runtime).join(", ")
}

function hasRequiredValue(value: string | undefined): value is string {
  return value !== undefined && value !== ""
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

if (import.meta.main) {
  const status = await runCli(Bun.argv.slice(2))
  process.exit(status)
}
