import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { loadEnv } from "../config/env.js"
import { createDatabase, type IdpDatabase } from "../database/client.js"
import { invitation, user } from "../database/schema.js"
import { normalizeEmail } from "../identity/access-policy.js"
import { createInvitationSecret } from "../identity/invitations.js"
import {
  type AuthEmailSender,
  assertAuthEmailSent,
  createAuthEmailSender,
} from "../identity/transactional-email.js"
import { createId } from "../infra/ids.js"

const argsSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  expiresInDays: z.coerce.number().int().positive().default(7),
})

export function parseBootstrapAdminArgs(argv: string[]) {
  const values: Record<string, string> = {}

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === "--email") values.email = argv[index + 1]
    if (item === "--name") values.name = argv[index + 1]
    if (item === "--expires-in-days") values.expiresInDays = argv[index + 1]
  }

  return argsSchema.parse(values)
}

export async function bootstrapAdmin(
  db: IdpDatabase,
  input: z.infer<typeof argsSchema>,
  authEmailSender?: Pick<AuthEmailSender, "sendInvitation">,
) {
  const email = normalizeEmail(input.email)
  const [existingUser] = await db.select().from(user).where(eq(user.email, email)).limit(1)

  if (existingUser) {
    if (existingUser.role === "admin" && existingUser.status === "active") {
      return { created: false, userId: existingUser.id }
    }

    throw new Error("A non-active-admin user already exists for this email.")
  }

  const [existingInvitation] = await db
    .select()
    .from(invitation)
    .where(eq(invitation.email, email))
    .limit(1)

  if (existingInvitation?.status === "pending" && existingInvitation.tokenDigest) {
    return { created: false, invitationId: existingInvitation.id }
  }

  const id = createId()
  const now = new Date()
  const secret = createInvitationSecret()
  const [created] = await db
    .insert(invitation)
    .values({
      id,
      email,
      role: "admin",
      status: "pending",
      invitedByUserId: null,
      expiresAt: new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000),
      tokenDigest: secret.digest,
      tokenIssuedAt: now,
    })
    .returning()

  if (authEmailSender) {
    try {
      const delivery = await authEmailSender.sendInvitation({
        email: created.email,
        expiresAt: created.expiresAt,
        role: created.role,
        token: secret.token,
      })
      assertAuthEmailSent(delivery)
    } catch (error) {
      await db
        .update(invitation)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(and(eq(invitation.id, created.id), eq(invitation.status, "pending")))
      throw error
    }
  }

  return { created: true, invitationId: created.id }
}

async function main() {
  const input = parseBootstrapAdminArgs(process.argv.slice(2))
  const env = loadEnv()
  const { db, pool } = createDatabase(env)

  try {
    await bootstrapAdmin(db, input, createAuthEmailSender(env))
  } finally {
    await pool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
