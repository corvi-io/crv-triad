import { describe, expect, it, vi } from "vitest"

import { createCatalogAuditWriter } from "../../../src/modules/services/application/catalog-audit.js"

describe("catalog audit writer", () => {
  it("persists metadata without catalog values", async () => {
    const values = vi.fn(() => Promise.resolve())
    const insert = vi.fn(() => ({ values }))
    await createCatalogAuditWriter({ insert } as never)({
      action: "update",
      actorUserId: "user-a",
      changedFields: ["name", "priceCents"],
      entityId: "service-a",
      entityType: "service",
      organizationId: "tenant-a",
      requestId: "request-a",
      result: "succeeded",
    })

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "catalog.service.update",
        changedFields: ["name", "priceCents"],
        entityType: "service",
        outcome: "allowed",
        targetId: "service-a",
      }),
    )
  })

  it("maps failed results without requiring an entity id", async () => {
    const values = vi.fn(() => Promise.resolve())
    const insert = vi.fn(() => ({ values }))
    await createCatalogAuditWriter({ insert } as never)({
      action: "create",
      actorUserId: "user-a",
      changedFields: ["name"],
      entityType: "unit",
      organizationId: "tenant-a",
      requestId: "request-a",
      result: "failed",
    })

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed", targetId: undefined }),
    )
  })
})
