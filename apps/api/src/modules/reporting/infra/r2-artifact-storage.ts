import { createHash } from "node:crypto"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type { ArtifactStorage } from "../application/export-providers.js"

export type R2ArtifactConfig = {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}
export function createR2ArtifactStorage(config: R2ArtifactConfig): ArtifactStorage {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: "auto",
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  })
  return {
    async put(key, body, contentType) {
      const checksum = createHash("sha256").update(body).digest("hex")
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            Metadata: { checksum },
            IfNoneMatch: "*",
          }),
        )
      } catch {
        const existing = await this.head(key)
        if (!existing || existing.checksum !== checksum) throw new Error("artifact_storage_failed")
      }
      return { checksum, byteSize: body.byteLength }
    },
    async head(key) {
      const value = await client
        .send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }))
        .catch(() => null)
      return value
        ? { checksum: value.Metadata?.checksum ?? "", byteSize: value.ContentLength ?? 0 }
        : null
    },
    async downloadUrl(key, expiresInSeconds) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
        expiresIn: expiresInSeconds,
      })
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
    },
  }
}
