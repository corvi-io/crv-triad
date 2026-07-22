import { loadEnv } from "./config/env.js"
import { createDatabase } from "./database/client.js"
import { createApp } from "./http/app.js"
import { createAuth } from "./identity/auth.js"
import { createAuthEmailSender } from "./identity/transactional-email.js"

const env = loadEnv()
const { db } = createDatabase(env)
const authEmailSender = createAuthEmailSender(env)
const auth = createAuth(env, db, authEmailSender)
const app = createApp({ env, auth, authEmailSender, db })

app.listen({
  hostname: env.IDP_HOST,
  port: env.IDP_PORT,
})
