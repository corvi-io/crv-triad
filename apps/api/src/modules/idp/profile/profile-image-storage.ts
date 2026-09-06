import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

import type { IdpEnv } from "../config/env.js"

export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const PROFILE_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export type ProfileImageStorage = {
  delete(key: string): Promise<void>
  get?(key: string): Promise<{ body: Uint8Array; contentType: string } | null>
  publicUrl(key: string): string
  put(input: { body: Uint8Array; contentType: string; key: string }): Promise<void>
}

const extensions: Record<(typeof PROFILE_IMAGE_CONTENT_TYPES)[number], string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
}

export function createProfileImageKey(userId: string, contentType: keyof typeof extensions) {
  return `${userId}-${crypto.randomUUID()}${extensions[contentType]}`
}

export function createProfileImageStorage(env: IdpEnv): ProfileImageStorage {
  if (env.PROFILE_IMAGE_STORAGE_DRIVER === "r2") return createR2Storage(env)
  return createLocalStorage(env)
}

function createLocalStorage(env: IdpEnv): ProfileImageStorage {
  const directory = env.PROFILE_IMAGE_LOCAL_DIRECTORY
  return {
    async put({ body, key }) {
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, key), body)
    },
    async delete(key) {
      await unlink(join(directory, key)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error
      })
    },
    async get(key) {
      const body = await readFile(join(directory, key)).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null
        throw error
      })
      if (!body) return null
      const extension = extname(key)
      const contentType =
        extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg"
      return { body: new Uint8Array(body), contentType }
    },
    publicUrl: (key) => new URL(`/profile-images/${key}`, env.BETTER_AUTH_URL).toString(),
  }
}

function createR2Storage(env: IdpEnv): ProfileImageStorage {
  const client = new S3Client({
    endpoint: env.PROFILE_IMAGE_R2_ENDPOINT,
    region: "auto",
    credentials: {
      accessKeyId: env.PROFILE_IMAGE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.PROFILE_IMAGE_R2_SECRET_ACCESS_KEY,
    },
  })
  return {
    async put({ body, contentType, key }) {
      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: env.PROFILE_IMAGE_R2_BUCKET,
          CacheControl: "public, max-age=31536000, immutable",
          ContentType: contentType,
          Key: key,
        }),
      )
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: env.PROFILE_IMAGE_R2_BUCKET, Key: key }))
    },
    publicUrl: (key) => new URL(key, `${env.PROFILE_IMAGE_PUBLIC_BASE_URL}/`).toString(),
  }
}

export function profileImageKeyFromUrl(storage: ProfileImageStorage, imageUrl: string | null) {
  if (!imageUrl) return null
  const prefix = storage.publicUrl("")
  return imageUrl.startsWith(prefix) ? decodeURIComponent(imageUrl.slice(prefix.length)) : null
}
