import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { S3Client } from "@aws-sdk/client-s3"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { IdpEnv } from "../../../src/modules/idp/config/env.js"
import {
  createProfileImageKey,
  createProfileImageStorage,
  profileImageKeyFromUrl,
} from "../../../src/modules/idp/profile/profile-image-storage.js"

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe("local profile image storage", () => {
  it("persists, serves, and deletes an owned image", async () => {
    const directory = await mkdtemp(join(tmpdir(), "triad-profile-image-"))
    directories.push(directory)
    const storage = createProfileImageStorage({
      BETTER_AUTH_URL: "http://localhost:8000",
      PROFILE_IMAGE_LOCAL_DIRECTORY: directory,
      PROFILE_IMAGE_STORAGE_DRIVER: "local",
    } as IdpEnv)
    const key = createProfileImageKey("user-1", "image/png")
    const body = Uint8Array.from([137, 80, 78, 71])

    await storage.put({ body, contentType: "image/png", key })

    expect(await storage.get?.(key)).toEqual({ body, contentType: "image/png" })
    expect(profileImageKeyFromUrl(storage, storage.publicUrl(key))).toBe(key)
    expect(profileImageKeyFromUrl(storage, null)).toBeNull()
    expect(profileImageKeyFromUrl(storage, "https://example.invalid/not-owned.png")).toBeNull()

    await storage.delete(key)
    expect(await storage.get?.(key)).toBeNull()
    await expect(storage.delete(key)).resolves.toBeUndefined()

    for (const [extension, contentType] of [
      ["jpg", "image/jpeg"],
      ["webp", "image/webp"],
    ] as const) {
      const alternateKey = `user-1-${crypto.randomUUID()}.${extension}`
      await storage.put({ body, contentType, key: alternateKey })
      expect((await storage.get?.(alternateKey))?.contentType).toBe(contentType)
    }
  })

  it("stores and deletes immutable objects through the R2 adapter", async () => {
    const send = vi.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never)
    const storage = createProfileImageStorage({
      PROFILE_IMAGE_STORAGE_DRIVER: "r2",
      PROFILE_IMAGE_R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      PROFILE_IMAGE_R2_ACCESS_KEY_ID: "access-key",
      PROFILE_IMAGE_R2_SECRET_ACCESS_KEY: "secret-key",
      PROFILE_IMAGE_R2_BUCKET: "profile-images",
      PROFILE_IMAGE_PUBLIC_BASE_URL: "https://images.example.test",
    } as IdpEnv)

    await storage.put({ body: Uint8Array.from([1]), contentType: "image/webp", key: "image.webp" })
    await storage.delete("image.webp")

    expect(storage.publicUrl("image.webp")).toBe("https://images.example.test/image.webp")
    expect(send).toHaveBeenCalledTimes(2)
  })
})
