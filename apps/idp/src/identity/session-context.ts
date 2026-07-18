import { eq } from "drizzle-orm"

import type { IdpDatabase } from "../database/client.js"
import { user } from "../database/schema.js"

export type BetterAuthSessionContext = {
  session: { id: string; userId: string; expiresAt: Date }
  user: { id: string; email: string; name: string }
}

export async function buildSessionContext(
  db: IdpDatabase,
  sessionContext: BetterAuthSessionContext,
) {
  const [idpUser] = await db.select().from(user).where(eq(user.id, sessionContext.user.id)).limit(1)

  if (idpUser?.status !== "active") {
    return null
  }

  return {
    user: {
      id: idpUser.id,
      email: idpUser.email,
      name: idpUser.name,
      role: idpUser.role,
      status: idpUser.status,
    },
    session: {
      id: sessionContext.session.id,
      expiresAt: sessionContext.session.expiresAt.toISOString(),
    },
  }
}
