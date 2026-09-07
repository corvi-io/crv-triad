const runtimeEnv = { ...process.env }

for (const [name, value] of Object.entries(process.env)) {
  if (name.startsWith("API__") && value !== undefined) {
    const runtimeName = name.slice("API__".length)
    runtimeEnv[runtimeName] ??= value
  }
}

if (process.env.API__TRIGGER_DEVELOPMENT_SECRET_KEY) {
  runtimeEnv.TRIGGER_SECRET_KEY = process.env.API__TRIGGER_DEVELOPMENT_SECRET_KEY
  delete runtimeEnv.TRIGGER_PREVIEW_BRANCH
}

const dev = Bun.spawn(
  [
    "bunx",
    "concurrently",
    "--kill-others-on-fail",
    "--names",
    "api,trigger",
    "--prefix-colors",
    "blue,magenta",
    "bun run dev:api",
    "bun run dev:trigger",
  ],
  {
    cwd: import.meta.dir.replace(/\/scripts$/, ""),
    env: runtimeEnv,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  },
)

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => dev.kill(signal))
}

process.exit(await dev.exited)
