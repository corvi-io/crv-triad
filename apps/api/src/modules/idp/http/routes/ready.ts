import { sql } from "drizzle-orm"
import { Elysia } from "elysia"

import type { IdpDatabase } from "../../database/client.js"

export function createReadyRoutes(db: IdpDatabase) {
  return new Elysia({ name: "ready-routes" }).get("/ready", async ({ status }) => {
    try {
      await db.execute(sql`select 1`)
      return { status: "ready", service: "idp" }
    } catch {
      return status(503, { status: "not_ready", service: "idp" })
    }
  })
}
