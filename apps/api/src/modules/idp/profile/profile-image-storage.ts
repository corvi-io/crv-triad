import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { dirname, extname, resolve, sep } from "node:path"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

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
  return `users/${userId}/profile/image/${crypto.randomUUID()}${extensions[contentType]}`
}

export function createProfileImageStorage(env: IdpEnv): ProfileImageStorage {
  if (env.PRIVATE_STORAGE_DRIVER === "r2") return createR2Storage(env)
  return createLocalStorage(env)
}

function createLocalStorage(env: IdpEnv): ProfileImageStorage {
  const directory = resolve(env.PROFILE_IMAGE_LOCAL_DIRECTORY ?? ".data/profile-images")
  const path = (key: string) => {
    const objectPath = resolve(directory, key)
    if (objectPath !== directory && !objectPath.startsWith(`${directory}${sep}`))
      throw new Error("Invalid profile image object key.")
    return objectPath
  }
  return {
    async put({ body, key }) {
      const objectPath = path(key)
      await mkdir(dirname(objectPath), { recursive: true })
      await writeFile(objectPath, body)
    },
    async delete(key) {
      await unlink(path(key)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error
      })
    },
    async get(key) {
      const body = await readFile(path(key)).catch((error: NodeJS.ErrnoException) => {
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
    endpoint: env.R2_PRIVATE_ENDPOINT,
    region: "auto",
    credentials: {
      accessKeyId: env.R2_PRIVATE_ACCESS_KEY_ID,
      secretAccessKey: env.R2_PRIVATE_SECRET_ACCESS_KEY,
    },
  })
  return {
    async put({ body, contentType, key }) {
      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: env.R2_PRIVATE_BUCKET,
          CacheControl: "private, max-age=300",
          ContentType: contentType,
          Key: key,
        }),
      )
    },
    async get(key) {
      const result = await client
        .send(new GetObjectCommand({ Bucket: env.R2_PRIVATE_BUCKET, Key: key }))
        .catch(() => null)
      if (!result?.Body) return null
      return {
        body: await result.Body.transformToByteArray(),
        contentType: result.ContentType ?? "application/octet-stream",
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: env.R2_PRIVATE_BUCKET, Key: key }))
    },
    publicUrl: (key) => new URL(`/profile-images/${key}`, env.BETTER_AUTH_URL).toString(),
  }
}

export function profileImageKeyFromUrl(storage: ProfileImageStorage, imageUrl: string | null) {
  if (!imageUrl) return null
  const prefix = storage.publicUrl("")
  return imageUrl.startsWith(prefix) ? decodeURIComponent(imageUrl.slice(prefix.length)) : null
}
