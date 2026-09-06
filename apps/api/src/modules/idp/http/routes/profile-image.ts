import { eq } from "drizzle-orm"
import { Elysia } from "elysia"

import type { IdpDatabase } from "../../database/client.js"
import { user } from "../../database/schema.js"
import type { IdpAuth } from "../../identity/auth.js"
import {
  createProfileImageKey,
  PROFILE_IMAGE_CONTENT_TYPES,
  PROFILE_IMAGE_MAX_BYTES,
  type ProfileImageStorage,
  profileImageKeyFromUrl,
} from "../../profile/profile-image-storage.js"

export function createProfileImageRoutes(
  auth: IdpAuth,
  db: IdpDatabase,
  storage: ProfileImageStorage,
) {
  return new Elysia({ name: "profile-image-routes" })
    .get("/profile-images/:key", async ({ params, status }) => {
      if (!storage.get || !/^[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(params.key)) return status(404)
      const image = await storage.get(params.key)
      if (!image) return status(404)
      return new Response(new Blob([image.body as BlobPart], { type: image.contentType }), {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": image.contentType,
        },
      })
    })
    .put("/profile/image", async ({ request, status }) => {
      const declaredLength = Number(request.headers.get("content-length"))
      if (Number.isFinite(declaredLength) && declaredLength > PROFILE_IMAGE_MAX_BYTES + 65_536) {
        return status(413, { error: { code: "payload_too_large" } })
      }
      const session = await auth.api.getSession({ headers: request.headers })
      if (!session?.user.id) return status(401, { error: { code: "unauthorized" } })
      const [account] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1)
      if (account?.status !== "active") return status(403, { error: { code: "forbidden" } })

      const form = await request.formData().catch(() => null)
      const file = form?.get("file")
      if (!(file instanceof File)) {
        return status(400, { error: { code: "invalid_request", details: { field: "image" } } })
      }
      if (
        !PROFILE_IMAGE_CONTENT_TYPES.includes(
          file.type as (typeof PROFILE_IMAGE_CONTENT_TYPES)[number],
        ) ||
        file.size === 0 ||
        file.size > PROFILE_IMAGE_MAX_BYTES
      ) {
        return status(400, { error: { code: "invalid_image", details: { field: "image" } } })
      }

      const body = new Uint8Array(await file.arrayBuffer())
      if (!matchesDeclaredImageType(body, file.type)) {
        return status(400, {
          error: { code: "invalid_image", details: { field: "image" } },
        })
      }
      const key = createProfileImageKey(
        account.id,
        file.type as (typeof PROFILE_IMAGE_CONTENT_TYPES)[number],
      )
      await storage.put({ body, contentType: file.type, key })
      const image = storage.publicUrl(key)
      try {
        await db.update(user).set({ image, updatedAt: new Date() }).where(eq(user.id, account.id))
      } catch (error) {
        await storage.delete(key).catch(() => undefined)
        throw error
      }

      const previousKey = profileImageKeyFromUrl(storage, account.image)
      if (previousKey) await storage.delete(previousKey).catch(() => undefined)
      return { image }
    })
    .delete("/profile/image", async ({ request, status }) => {
      const session = await auth.api.getSession({ headers: request.headers })
      if (!session?.user.id) return status(401, { error: { code: "unauthorized" } })
      const [account] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1)
      if (account?.status !== "active") return status(403, { error: { code: "forbidden" } })
      await db
        .update(user)
        .set({ image: null, updatedAt: new Date() })
        .where(eq(user.id, account.id))
      const previousKey = profileImageKeyFromUrl(storage, account.image)
      if (previousKey) await storage.delete(previousKey).catch(() => undefined)
      return { image: null }
    })
}

export function matchesDeclaredImageType(body: Uint8Array, contentType: string) {
  if (contentType === "image/jpeg") return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff
  if (contentType === "image/png")
    return (
      body.length >= 8 &&
      body.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])
    )
  if (contentType === "image/webp")
    return (
      new TextDecoder().decode(body.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(body.slice(8, 12)) === "WEBP"
    )
  return false
}
