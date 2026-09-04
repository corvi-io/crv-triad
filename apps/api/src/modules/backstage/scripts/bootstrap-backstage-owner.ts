import { eq } from "drizzle-orm"
import { z } from "zod"

import { loadEnv } from "../../idp/config/env.js"
import { createDatabase, type IdpDatabase } from "../../idp/database/client.js"
import { user } from "../../idp/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import { platformOperator } from "../database/schema.js"

const argsSchema = z.object({ email: z.email() })

export function parseBootstrapBackstageOwnerArgs(argv: string[]) {
  const emailIndex = argv.indexOf("--email")
  return argsSchema.parse({ email: emailIndex >= 0 ? argv[emailIndex + 1] : undefined })
}

export async function bootstrapBackstageOwner(db: IdpDatabase, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const [identity] = await db
    .select({ id: user.id, status: user.status })
    .from(user)
    .where(eq(user.email, normalizedEmail))
    .limit(1)
  if (identity?.status !== "active") throw new Error("An active IDP user is required.")

  const [created] = await db
    .insert(platformOperator)
    .values({ id: createId(), role: "system_owner", status: "active", userId: identity.id })
    .onConflictDoUpdate({
      target: platformOperator.userId,
      set: { role: "system_owner", status: "active", updatedAt: new Date() },
    })
    .returning({ id: platformOperator.id, role: platformOperator.role })
  if (!created) throw new Error("Backstage system owner could not be persisted.")
  return created
}

async function main() {
  const input = parseBootstrapBackstageOwnerArgs(process.argv.slice(2))
  const env = loadEnv()
  const { db, pool } = createDatabase(env)
  try {
    const result = await bootstrapBackstageOwner(db, input.email)
    console.log(JSON.stringify(result))
  } finally {
    await pool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
