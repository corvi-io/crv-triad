import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import type { IdpEnv } from "../config/env.js"
import * as schema from "./schema.js"

export function createDatabase(env: Pick<IdpEnv, "DATABASE_URL">) {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  const db = drizzle(pool, { schema })

  return { db, pool }
}

export type IdpDatabase = ReturnType<typeof createDatabase>["db"]
