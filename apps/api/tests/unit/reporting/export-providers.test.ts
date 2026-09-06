import { describe, expect, it } from "vitest"
import {
  createFakeArtifactStorage,
  createFakeReportDispatcher,
} from "../../../src/modules/reporting/application/export-providers.js"

describe("local report providers", () => {
  it("returns one run for a global idempotency key even after an uncertain response", async () => {
    const provider = createFakeReportDispatcher()
    const payload = {
      schemaVersion: 1 as const,
      organizationId: crypto.randomUUID(),
      reportRequestId: crypto.randomUUID(),
    }
    const first = await provider.dispatch(payload, "stable-hash")
    await expect(provider.dispatch(payload, "stable-hash")).resolves.toEqual(first)
  })
  it("converges identical artifact uploads and rejects conflicting bytes", async () => {
    const storage = createFakeArtifactStorage()
    const bytes = new TextEncoder().encode("report")
    const first = await storage.put("tenant/report/1.csv", bytes, "text/csv")
    await expect(storage.put("tenant/report/1.csv", bytes, "text/csv")).resolves.toEqual(first)
    await expect(
      storage.put("tenant/report/1.csv", new TextEncoder().encode("different"), "text/csv"),
    ).rejects.toThrow("artifact_conflict")
    await expect(storage.head("tenant/report/1.csv")).resolves.toEqual(first)
    await expect(storage.downloadUrl("tenant/report/1.csv", 300)).resolves.toContain("expires=300")
  })
})
