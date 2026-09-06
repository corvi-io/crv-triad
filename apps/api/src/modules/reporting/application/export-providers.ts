import { createHash } from "node:crypto"

export type ExportPayload = { schemaVersion: 1; organizationId: string; reportRequestId: string }
export type ReportDispatcher = {
  dispatch(payload: ExportPayload, idempotencyKey: string): Promise<{ runReference: string }>
}
export type ArtifactStorage = {
  put(
    key: string,
    body: Uint8Array,
    contentType: string,
  ): Promise<{ checksum: string; byteSize: number }>
  head(key: string): Promise<{ checksum: string; byteSize: number } | null>
  downloadUrl(key: string, expiresInSeconds: number): Promise<string>
  delete(key: string): Promise<void>
}
export function createFakeReportDispatcher(): ReportDispatcher {
  const runs = new Map<string, string>()
  return {
    async dispatch(_payload, key) {
      const runReference = runs.get(key) ?? `fake_${crypto.randomUUID()}`
      runs.set(key, runReference)
      return { runReference }
    },
  }
}
export function createFakeArtifactStorage(): ArtifactStorage {
  const objects = new Map<string, { body: Uint8Array; contentType: string; checksum: string }>()
  return {
    async put(key, body, contentType) {
      const checksum = createHash("sha256").update(body).digest("hex")
      const prior = objects.get(key)
      if (prior && prior.checksum !== checksum) throw new Error("artifact_conflict")
      objects.set(key, { body, contentType, checksum })
      return { checksum, byteSize: body.byteLength }
    },
    async head(key) {
      const value = objects.get(key)
      return value ? { checksum: value.checksum, byteSize: value.body.byteLength } : null
    },
    async downloadUrl(key, expiresInSeconds) {
      if (!objects.has(key)) throw new Error("artifact_missing")
      return `http://127.0.0.1:8000/api/reports/local-artifacts/${encodeURIComponent(key)}?expires=${expiresInSeconds}`
    },
    async delete(key) {
      objects.delete(key)
    },
  }
}
