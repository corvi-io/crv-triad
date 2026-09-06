import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"

// An explicitly invoked, synthetic local environment. It never reads a deployment database URL.
const root = resolve(import.meta.dir, "..")
const name = "triad-initiative22-postgres"
async function run(cmd: string[], cwd = root) {
  const process = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, code] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ])
  if (code !== 0) throw new Error(`${cmd[0]} failed: ${stderr}`)
  return stdout
}
const containers = await run(["docker", "ps", "--all", "--format", "{{.Names}}"])
if (!containers.split("\n").includes(name)) {
  await run([
    "docker",
    "run",
    "--detach",
    "--name",
    name,
    "--publish",
    "127.0.0.1:55442:5432",
    "--mount",
    "type=volume,source=triad-initiative22-qa,target=/var/lib/postgresql/data",
    "--env",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "--env",
    "POSTGRES_DB=initiative22_test",
    "postgres:16-alpine",
  ])
}
const inspected = JSON.parse(await run(["docker", "inspect", name]))[0]
const binding = inspected.HostConfig.PortBindings["5432/tcp"]?.[0]
if (binding?.HostIp !== "127.0.0.1" || binding.HostPort !== "55442")
  throw new Error("Unexpected QA database binding; no changes made.")
await run(["docker", "start", name])
let ready = false
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    await run(["docker", "exec", name, "pg_isready", "-U", "postgres"])
    ready = true
    break
  } catch {
    await Bun.sleep(500)
  }
}
if (!ready) throw new Error("Local PostgreSQL is unavailable")
await mkdir(resolve(root, "apps/api/.artifacts/initiative22"), { recursive: true })
await run(["bun", "tests/fixtures/scheduling-local-qa.ts"], resolve(root, "apps/api"))
const apiPort = 8102,
  studioPort = 3102
for (const port of [apiPort, studioPort]) {
  const listener = Bun.listen({ hostname: "127.0.0.1", port, socket: { data() {} } })
  listener.stop()
}
const api = Bun.spawn(["bun", "--watch", "src/server.ts"], {
  cwd: resolve(root, "apps/api"),
  env: {
    ...process.env,
    NODE_ENV: "development",
    APP_ENV: "local",
    API_HOST: "127.0.0.1",
    API_PORT: String(apiPort),
    DATABASE_URL: "postgresql://postgres@127.0.0.1:55442/initiative22_test",
    BETTER_AUTH_SECRET: "qa22-local-disposable-secret-32-characters",
    BETTER_AUTH_URL: `http://localhost:${apiPort}/api/auth`,
    AUTH_TRUSTED_ORIGINS: `http://localhost:${studioPort}`,
    IDP_STUDIO_URL: `http://localhost:${studioPort}`,
    AUTH_GOOGLE_CLIENT_ID: "qa-local",
    AUTH_GOOGLE_CLIENT_SECRET: "qa-local",
    IDP_EMAIL_FROM: "qa@example.invalid",
    IDP_RESEND_API_KEY: "qa-local",
    PROFILE_IMAGE_STORAGE_DRIVER: "local",
  },
  stdout: "inherit",
  stderr: "inherit",
})
const studio = Bun.spawn(["bunx", "vite", "--host", "localhost", "--port", String(studioPort)], {
  cwd: resolve(root, "apps/studio"),
  env: {
    ...process.env,
    VITE_AUTH_BASE_URL: `http://localhost:${apiPort}/api/auth`,
    VITE_DEPLOY_TARGET: "local",
    VITE_SCHEDULING_SOURCE: "http",
    VITE_BARBERSHOP_SETUP_SOURCE: "http",
    VITE_CLIENT_MANAGEMENT_SOURCE: "http",
  },
  stdout: "inherit",
  stderr: "inherit",
})
const stop = () => {
  api.kill()
  studio.kill()
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
console.info(
  "Scheduling QA: http://localhost:3102. Synthetic accounts: qa22-a-owner@example.invalid, qa22-a-admin@example.invalid, qa22-a-member@example.invalid, qa22-b-owner@example.invalid. Password: apps/api/.artifacts/initiative22/credentials.json. Database and default-port servers are preserved.",
)
await Promise.race([api.exited, studio.exited])
stop()
