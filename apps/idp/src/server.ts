import { loadEnv } from "./config/env.js"
import { createDatabase } from "./database/client.js"
import { createApp } from "./http/app.js"
import { createAuth } from "./identity/auth.js"

const env = loadEnv()
const { db } = createDatabase(env)
const auth = createAuth(env, db)
const app = createApp({ env, auth, db })

app.listen({
  hostname: env.IDP_HOST,
  port: env.IDP_PORT,
})
