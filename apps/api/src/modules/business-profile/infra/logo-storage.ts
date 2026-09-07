import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import { dirname, resolve, sep } from "node:path"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

export type BusinessLogoStorage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>
  delete(key: string): Promise<void>
}

export function createBusinessLogoKey(organizationId: string, extension: "jpg" | "png" | "webp") {
  return `tenants/${organizationId}/business-profile/logo/${crypto.randomUUID()}.${extension}`
}

export function createLocalBusinessLogoStorage(directory: string): BusinessLogoStorage {
  const root = resolve(directory)
  const path = (key: string) => {
    const objectPath = resolve(root, key)
    if (objectPath !== root && !objectPath.startsWith(`${root}${sep}`))
      throw new Error("Invalid business logo object key.")
    return objectPath
  }
  return {
    async put(key, body) {
      const objectPath = path(key)
      await mkdir(dirname(objectPath), { recursive: true })
      await writeFile(objectPath, body)
    },
    async get(key) {
      const body = await readFile(path(key)).catch((error: NodeJS.ErrnoException) =>
        error.code === "ENOENT" ? null : Promise.reject(error),
      )
      return body
        ? {
            body: new Uint8Array(body),
            contentType: key.endsWith(".png")
              ? "image/png"
              : key.endsWith(".webp")
                ? "image/webp"
                : "image/jpeg",
          }
        : null
    },
    async delete(key) {
      await unlink(path(key)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error
      })
    },
  }
}

export function createR2BusinessLogoStorage(config: {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}): BusinessLogoStorage {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: "auto",
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  })
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: config.bucket,
          CacheControl: "private, max-age=300",
          ContentType: contentType,
          Key: key,
        }),
      )
    },
    async get(key) {
      const result = await client
        .send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
        .catch(() => null)
      if (!result?.Body) return null
      return {
        body: await result.Body.transformToByteArray(),
        contentType: result.ContentType ?? "application/octet-stream",
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
    },
  }
}
