import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("revenue operations production boundary", () => {
  it("keeps presentation independent from development and providers", async () => {
    const moduleRoot = path.resolve(process.cwd(), "src/modules/revenue-operations")
    const files = (await readdir(moduleRoot))
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .map((file) => readFile(path.join(moduleRoot, file), "utf8"))
    const source = (await Promise.all(files)).join("\n")
    expect(source).not.toMatch(/@\/dev\/|src\/dev/)
    expect(source).not.toMatch(/gateway|provider api|card number|cvv|token|secret/i)
  })

  it("keeps sensitive fields and business values out of checkout URL state", async () => {
    const route = await readFile(
      path.resolve(
        process.cwd(),
        "src/routes/_authenticated/service-desk/$sessionId/checkout/index.tsx",
      ),
      "utf8",
    )
    expect(route).toContain("validateServiceDeskSearch")
    expect(route).not.toMatch(/customerName|discountReason|surchargeReason|tenders|totalCents/)
  })
})
