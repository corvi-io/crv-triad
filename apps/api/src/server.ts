import { createRestApp } from "./entrypoints/rest/app.js"
import { createPostHogErrorReporter } from "./modules/analytics/error-reporter.js"
import { loadEnv } from "./modules/idp/config/env.js"
import { createDatabase } from "./modules/idp/database/client.js"
import { createAuth } from "./modules/idp/identity/auth.js"
import { createAuthEmailSender } from "./modules/idp/identity/transactional-email.js"
import { PROFILE_IMAGE_MAX_BYTES } from "./modules/idp/profile/profile-image-storage.js"
import { acceptProfessionalInvitation } from "./modules/professionals/application/accept-professional-invitation.js"

const env = loadEnv()
const errorReporter = createPostHogErrorReporter(env)
let database: ReturnType<typeof createDatabase>
try {
  database = createDatabase(env)
} catch (error) {
  errorReporter.capture(error, { boundary: "process", module: "database_startup" })
  await errorReporter.shutdown()
  throw error
}
const { db, pool } = database
let app: ReturnType<typeof createRestApp>

try {
  const authEmailSender = createAuthEmailSender(env)
  const onInvitationAccepted = async (invitationId: string | undefined, userId: string) => {
    await acceptProfessionalInvitation(db, invitationId, userId)
  }
  const auth = createAuth(env, db, authEmailSender, undefined, onInvitationAccepted)
  app = createRestApp({
    env,
    auth,
    authEmailSender,
    db,
    errorReporter,
    onInvitationAccepted,
    pool,
  })

  app.listen({
    hostname: env.API_HOST,
    maxRequestBodySize: PROFILE_IMAGE_MAX_BYTES + 65_536,
    port: env.API_PORT,
  })
} catch (error) {
  errorReporter.capture(error, { boundary: "process", module: "server_startup" })
  await pool.end().catch(() => undefined)
  await errorReporter.shutdown()
  throw error
}

console.info(JSON.stringify({ event: "api_started", host: env.API_HOST, port: env.API_PORT }))

let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  try {
    const results = await Promise.allSettled([app.stop(), pool.end()])
    const failure = results.find((result) => result.status === "rejected")
    if (failure?.status === "rejected") {
      errorReporter.capture(failure.reason, { boundary: "process", module: "server_shutdown" })
      throw failure.reason
    }
  } finally {
    await errorReporter.shutdown()
  }
}

function stopFromSignal() {
  void stop().catch(() => {
    process.exitCode = 1
  })
}

process.once("SIGTERM", stopFromSignal)
process.once("SIGINT", stopFromSignal)
