import { describe, expect, it, vi } from "vitest"

import type { ClientRepository } from "../../../src/modules/clients/application/client-repository.js"
import { createClientService } from "../../../src/modules/clients/application/client-service.js"
import {
  ClientNotFoundError,
  ClientVersionConflictError,
} from "../../../src/modules/clients/domain/errors.js"

function createRepository(overrides: Partial<ClientRepository> = {}): ClientRepository {
  const record = {
    createdAt: new Date("2026-09-04T10:00:00Z"),
    email: "client@example.invalid",
    id: "client-a",
    name: "Cliente",
    notes: [],
    phone: null,
    preferenceNote: "",
    servicePreferences: [],
    status: "active" as const,
    tags: [],
    updatedAt: new Date("2026-09-04T10:00:00Z"),
    version: 1,
  }
  return {
    addNote: vi.fn(async () => record),
    create: vi.fn(async () => record),
    findDuplicates: vi.fn(async () => []),
    get: vi.fn(async () => record),
    list: vi.fn(async ({ query }) => ({
      items: [record],
      page: query.page,
      pageSize: query.pageSize,
      totalCount: 1,
      totalPages: 1,
    })),
    listTags: vi.fn(async () => ["Frequente"]),
    removeNote: vi.fn(async () => "updated" as const),
    setArchived: vi.fn(async () => "updated" as const),
    update: vi.fn(async () => "updated" as const),
    updateNote: vi.fn(async () => "updated" as const),
    ...overrides,
  }
}

describe("client service", () => {
  it("passes the server-resolved tenant to creation", async () => {
    const repository = createRepository()
    const service = createClientService(repository)

    await service.create("tenant-a", {
      email: "client@example.invalid",
      name: "Cliente",
      phone: "",
    })

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "tenant-a" }),
    )
  })

  it("lists tags only through the server-resolved tenant", async () => {
    const repository = createRepository()
    const service = createClientService(repository)

    await expect(service.listTags("tenant-a")).resolves.toEqual(["Frequente"])
    expect(repository.listTags).toHaveBeenCalledWith({ organizationId: "tenant-a" })
  })

  it.each([
    "not_found",
    "version_conflict",
  ] as const)("maps an update %s without a global resource lookup", async (result) => {
    const repository = createRepository({ update: vi.fn(async () => result) })
    const service = createClientService(repository)

    const operation = service.update("tenant-a", "known-foreign-or-missing", 1, {
      email: "client@example.invalid",
      name: "Cliente",
      phone: "",
    })
    if (result === "not_found") await expect(operation).rejects.toBeInstanceOf(ClientNotFoundError)
    else await expect(operation).rejects.toBeInstanceOf(ClientVersionConflictError)
    expect(repository.get).not.toHaveBeenCalled()
  })

  it("bounds duplicate lookup to normalized contacts and the resolved tenant", async () => {
    const repository = createRepository()
    const service = createClientService(repository)

    await service.findDuplicates("tenant-a", {
      email: " CLIENT@example.invalid ",
      excludingId: "client-a",
      phone: "+55 (81) 99999-0000",
    })

    expect(repository.findDuplicates).toHaveBeenCalledWith({
      excludingId: "client-a",
      normalizedEmail: "client@example.invalid",
      normalizedPhone: "+5581999990000",
      organizationId: "tenant-a",
    })
  })
})
