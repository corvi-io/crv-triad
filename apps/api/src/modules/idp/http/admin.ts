import { eq } from "drizzle-orm"

import type { IdpDatabase } from "../database/client.js"
import { user } from "../database/schema.js"
import type { IdpAuth } from "../identity/auth.js"

export type AdminActor = typeof user.$inferSelect
export type AdminError = {
  code: string
  message: string
  status: 401 | 403
}

export async function resolveAdminActor(auth: IdpAuth, db: IdpDatabase, request: Request) {
  const sessionContext = await auth.api.getSession({ headers: request.headers })
  if (!sessionContext) {
    return {
      error: {
        status: 401,
        code: "unauthorized",
        message: "Session is required.",
      } satisfies AdminError,
    }
  }

  const [actor] = await db.select().from(user).where(eq(user.id, sessionContext.user.id)).limit(1)
  if (actor?.status !== "active" || actor.role !== "admin") {
    return {
      error: {
        status: 403,
        code: "forbidden",
        message: "Admin role is required.",
      } satisfies AdminError,
    }
  }

  return { actor }
}

export function adminErrorBody(error: AdminError) {
  return {
    code: error.code,
    message: error.message,
  }
}
