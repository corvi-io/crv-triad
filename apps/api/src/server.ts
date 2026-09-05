import { createRestApp } from "./entrypoints/rest/app.js"
import { loadEnv } from "./modules/idp/config/env.js"
import { createDatabase } from "./modules/idp/database/client.js"
import { createAuth } from "./modules/idp/identity/auth.js"
import { createAuthEmailSender } from "./modules/idp/identity/transactional-email.js"
import { acceptProfessionalInvitation } from "./modules/professionals/application/accept-professional-invitation.js"

const env = loadEnv()
const { db, pool } = createDatabase(env)
const authEmailSender = createAuthEmailSender(env)
const onInvitationAccepted = async (invitationId: string | undefined, userId: string) => {
  await acceptProfessionalInvitation(db, invitationId, userId)
}
const auth = createAuth(env, db, authEmailSender, undefined, onInvitationAccepted)
const app = createRestApp({ env, auth, authEmailSender, db, onInvitationAccepted, pool })

app.listen({
  hostname: env.API_HOST,
  port: env.API_PORT,
})

console.info(JSON.stringify({ event: "api_started", host: env.API_HOST, port: env.API_PORT }))
