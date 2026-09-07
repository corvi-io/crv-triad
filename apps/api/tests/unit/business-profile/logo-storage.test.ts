import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  createBusinessLogoKey,
  createLocalBusinessLogoStorage,
} from "../../../src/modules/business-profile/infra/logo-storage.js"

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe("business logo storage", () => {
  it("names new objects inside the owning tenant namespace", () => {
    expect(createBusinessLogoKey("tenant-1", "webp")).toMatch(
      /^tenants\/tenant-1\/branding\/logo\/[0-9a-f-]+\.webp$/,
    )
  })

  it("preserves tenant folders in local storage and rejects traversal", async () => {
    const directory = await mkdtemp(join(tmpdir(), "triad-business-logo-"))
    directories.push(directory)
    const storage = createLocalBusinessLogoStorage(directory)
    const key = "tenants/tenant-1/business-profile/logo/logo.png"
    const body = Uint8Array.from([137, 80, 78, 71])

    await storage.put(key, body, "image/png")

    expect(await storage.get(key)).toEqual({ body, contentType: "image/png" })
    await expect(storage.get("../another-tenant/logo.png")).rejects.toThrow(
      "Invalid business logo object key.",
    )
    await storage.delete(key)
    expect(await storage.get(key)).toBeNull()
  })
})
