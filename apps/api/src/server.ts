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
const { db, pool } = createDatabase(env)
const authEmailSender = createAuthEmailSender(env)
const onInvitationAccepted = async (invitationId: string | undefined, userId: string) => {
  await acceptProfessionalInvitation(db, invitationId, userId)
}
const auth = createAuth(env, db, authEmailSender, undefined, onInvitationAccepted)
const app = createRestApp({
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

console.info(JSON.stringify({ event: "api_started", host: env.API_HOST, port: env.API_PORT }))

let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await errorReporter.shutdown()
  await app.stop()
}

process.once("SIGTERM", () => void stop())
process.once("SIGINT", () => void stop())
