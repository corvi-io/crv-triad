import { createRestApp } from "./entrypoints/rest/app.js"
import { loadEnv } from "./modules/idp/config/env.js"
import { createDatabase } from "./modules/idp/database/client.js"
import { createAuth } from "./modules/idp/identity/auth.js"
import { createAuthEmailSender } from "./modules/idp/identity/transactional-email.js"

const env = loadEnv()
const { db, pool } = createDatabase(env)
const authEmailSender = createAuthEmailSender(env)
const auth = createAuth(env, db, authEmailSender)
const app = createRestApp({ env, auth, authEmailSender, db, pool })

app.listen({
  hostname: env.API_HOST,
  port: env.API_PORT,
})

console.info(JSON.stringify({ event: "api_started", host: env.API_HOST, port: env.API_PORT }))
