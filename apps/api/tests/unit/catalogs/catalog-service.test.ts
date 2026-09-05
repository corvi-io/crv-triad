import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  CatalogError,
  createCatalogService,
} from "../../../src/modules/services/application/catalog-service.js"

const now = new Date("2026-09-04T12:00:00.000Z")

function createDatabase() {
  const results: unknown[] = []
  const operation = () => {
    const chain: Record<string, unknown> = {}
    for (const method of [
      "from",
      "innerJoin",
      "where",
      "orderBy",
      "limit",
      "offset",
      "values",
      "set",
      "returning",
    ]) {
      chain[method] = vi.fn(() => chain)
    }
    // biome-ignore lint/suspicious/noThenProperty: the mock intentionally models Drizzle's thenable query builder.
    chain.then = (resolve: (value: unknown) => unknown, _reject: (reason: unknown) => unknown) =>
      resolve(results.shift())
    return chain
  }
  const db = {
    delete: vi.fn(operation),
    execute: vi.fn(operation),
    insert: vi.fn(operation),
    select: vi.fn(operation),
    update: vi.fn(operation),
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(db)),
  }
  return {
    db,
    queue(...values: unknown[]) {
      results.push(...values)
    },
  }
}

function unitRow(overrides: Record<string, unknown> = {}) {
  return {
    address: "Rua do Sol, 120",
    code: "CENTRO",
    createdAt: now,
    id: "unit-a",
    name: "Centro",
    openingDays: ["monday"],
    openingEnd: "18:00",
    openingPeriods: [{ days: ["monday"], end: "18:00", start: "09:00" }],
    openingStart: "09:00",
    organizationId: "tenant-a",
    status: "active" as const,
    updatedAt: now,
    version: 1,
    ...overrides,
  }
}

function serviceRow(overrides: Record<string, unknown> = {}) {
  return {
    category: "Cabelo",
    createdAt: now,
    description: "Corte masculino completo",
    durationMinutes: 45,
    id: "service-a",
    name: "Corte",
    normalizedName: "corte",
    organizationId: "tenant-a",
    priceCents: 7_500,
    status: "active" as const,
    updatedAt: now,
    version: 1,
    ...overrides,
  }
}

function professionalRow(overrides: Record<string, unknown> = {}) {
  return {
    commissionBasisPoints: 5_000,
    createdAt: now,
    globalUserId: "user-a",
    id: "professional-a",
    organizationId: "tenant-a",
    role: "Barbeiro",
    specialties: ["Corte"],
    status: "active" as const,
    updatedAt: now,
    version: 1,
    ...overrides,
  }
}

describe("catalog service", () => {
  beforeEach(() => vi.restoreAllMocks())

  it("lists and presents units with bounded pagination", async () => {
    const { db, queue } = createDatabase()
    queue([unitRow()], [{ value: 1 }])
    const result = await createCatalogService(db as never).list("tenant-a", "unit", {
      page: "0",
      pageSize: "10",
      search: "Centro%",
      sortDirection: "desc",
      status: "all",
    })
    expect(result).toMatchObject({ page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
    expect(result.items[0]).toMatchObject({
      businessHours: { periods: [{ start: "09:00" }] },
      kind: "unit",
    })
  })

  it("lists professionals with their relationships and connected identity", async () => {
    const { db, queue } = createDatabase()
    queue(
      [{ professional: professionalRow(), userName: "Marcus Gabriel" }],
      [{ value: 1 }],
      [{ professionalId: "professional-a", unitId: "unit-a" }],
      [{ professionalId: "professional-a", serviceId: "service-a" }],
    )
    const result = await createCatalogService(db as never).list("tenant-a", "professional", {
      sortBy: "status",
      status: "archived",
    })
    expect(result.items[0]).toMatchObject({
      accountAccess: "connected",
      name: "Marcus Gabriel",
      serviceIds: ["service-a"],
      unitIds: ["unit-a"],
    })

    const empty = createDatabase()
    empty.queue([], [])
    const defaultResult = await createCatalogService(empty.db as never).list(
      "tenant-a",
      "professional",
      {},
    )
    expect(defaultResult).toMatchObject({ page: 1, pageSize: 20, totalCount: 0 })
  })

  it("hydrates service and professional options with selected archived records", async () => {
    const first = createDatabase()
    first.queue(
      [serviceRow({ status: "archived" })],
      [serviceRow({ status: "archived" })],
      [{ serviceId: "service-a", unitId: "unit-a" }],
      [{ professionalId: "professional-a", serviceId: "service-a" }],
    )
    const services = await createCatalogService(first.db as never).options("tenant-a", "service", {
      search: "Corte_",
      selectedIds: "service-a,service-a",
    })
    expect(services[0]).toMatchObject({
      professionalIds: ["professional-a"],
      unitIds: ["unit-a"],
    })

    const second = createDatabase()
    second.queue(
      [{ id: "professional-a", name: "Marcus", status: "active" }],
      [{ id: "professional-a", name: "Marcus", status: "active" }],
      [{ professionalId: "professional-a", unitId: "unit-a" }],
      [],
    )
    const professionals = await createCatalogService(second.db as never).options(
      "tenant-a",
      "professional",
      { search: "Marcus", selectedIds: "professional-a" },
    )
    expect(professionals).toEqual([
      { id: "professional-a", name: "Marcus", status: "active", unitIds: ["unit-a"] },
    ])
  })

  it("uses active defaults and legacy opening hours in unit options", async () => {
    const { db, queue } = createDatabase()
    queue([unitRow({ openingPeriods: [] })])
    const options = await createCatalogService(db as never).options("tenant-a", "unit", {})
    expect(options[0]).toMatchObject({
      businessHours: {
        periods: [{ days: ["monday"], end: "18:00", start: "09:00" }],
      },
    })
  })

  it("covers default list and option projections without selected values", async () => {
    const listDb = createDatabase()
    listDb.queue([serviceRow()], [], [], [])
    const listed = await createCatalogService(listDb.db as never).list("tenant-a", "service", {
      page: "2",
      pageSize: "999",
      sortBy: "name",
    })
    expect(listed).toMatchObject({ page: 2, pageSize: 20, totalCount: 0, totalPages: 1 })

    const optionsDb = createDatabase()
    optionsDb.queue([serviceRow()], [], [])
    const options = await createCatalogService(optionsDb.db as never).options(
      "tenant-a",
      "service",
      {},
    )
    expect(options[0]).toMatchObject({ professionalIds: [], unitIds: [] })
  })

  it("maps malformed catalog payloads to invalid requests", async () => {
    const { db } = createDatabase()
    const catalogs = createCatalogService(db as never)
    await expect(catalogs.create("tenant-a", "unit", { name: "x" })).rejects.toMatchObject({
      code: "invalid_request",
    })
    await expect(
      catalogs.update("tenant-a", "unit", "unit-a", 1, {
        address: "Rua do Sol, 120",
        businessHours: {
          days: ["monday"],
          end: "09:00",
          start: "18:00",
        },
        code: "CENTRO",
        name: "Centro",
      }),
    ).rejects.toMatchObject({ code: "invalid_request" })
  })

  it("gets all catalog kinds and rejects unknown tenant records", async () => {
    const professionalDb = createDatabase()
    professionalDb.queue([{ professional: professionalRow(), userName: "Marcus Gabriel" }], [], [])
    await expect(
      createCatalogService(professionalDb.db as never).get(
        "tenant-a",
        "professional",
        "professional-a",
      ),
    ).resolves.toMatchObject({ name: "Marcus Gabriel" })

    const missingDb = createDatabase()
    missingDb.queue([])
    await expect(
      createCatalogService(missingDb.db as never).get("tenant-a", "unit", "foreign-unit"),
    ).rejects.toMatchObject({ code: "not_found" })
  })

  it("creates units and services and rejects direct professional creation", async () => {
    const unitDb = createDatabase()
    unitDb.queue(undefined, [unitRow()])
    const createdUnit = await createCatalogService(unitDb.db as never).create("tenant-a", "unit", {
      address: "Rua do Sol, 120",
      businessHours: { days: ["monday"], end: "18:00", start: "09:00" },
      code: "CENTRO",
      name: "Centro",
    })
    expect(createdUnit).toMatchObject({ id: "unit-a", kind: "unit" })

    const serviceDb = createDatabase()
    serviceDb.queue(undefined, undefined, undefined, [serviceRow()], [], [])
    const createdService = await createCatalogService(serviceDb.db as never).create(
      "tenant-a",
      "service",
      {
        category: "Cabelo",
        description: "Corte masculino completo",
        durationMinutes: 45,
        name: "Corte",
        priceCents: 7_500,
        professionalIds: [],
        unitIds: [],
      },
    )
    expect(createdService).toMatchObject({ id: "service-a", kind: "service" })

    await expect(
      createCatalogService(serviceDb.db as never).create("tenant-a", "professional", {}),
    ).rejects.toMatchObject({ code: "invalid_request" })
  })

  it("updates every catalog kind and reports optimistic conflicts", async () => {
    const unitDb = createDatabase()
    unitDb.queue([{ id: "unit-a" }], [unitRow({ version: 2 })])
    const updatedUnit = await createCatalogService(unitDb.db as never).update(
      "tenant-a",
      "unit",
      "unit-a",
      1,
      {
        address: "Rua do Sol, 120",
        businessHours: { days: ["monday"], end: "18:00", start: "09:00" },
        code: "CENTRO",
        name: "Centro",
      },
    )
    expect(updatedUnit).toMatchObject({ version: 2 })

    const professionalDb = createDatabase()
    professionalDb.queue(
      [{ id: "professional-a" }],
      [],
      [],
      undefined,
      undefined,
      [{ professional: professionalRow(), userName: "Marcus Gabriel" }],
      [],
      [],
    )
    const updatedProfessional = await createCatalogService(professionalDb.db as never).update(
      "tenant-a",
      "professional",
      "professional-a",
      1,
      {
        commissionBasisPoints: 5_000,
        role: "Barbeiro",
        serviceIds: [],
        specialties: ["Corte", "Corte"],
        unitIds: [],
      },
    )
    expect(updatedProfessional).toMatchObject({ accountAccess: "connected" })

    const serviceDb = createDatabase()
    serviceDb.queue(
      [{ id: "service-a" }],
      [],
      [],
      [{ id: "unit-a" }],
      [{ id: "professional-a" }],
      [{ professionalId: "professional-a", unitId: "unit-a" }],
      undefined,
      undefined,
      undefined,
      undefined,
      [serviceRow({ version: 2 })],
      [{ serviceId: "service-a", unitId: "unit-a" }],
      [{ professionalId: "professional-a", serviceId: "service-a" }],
    )
    const updatedService = await createCatalogService(serviceDb.db as never).update(
      "tenant-a",
      "service",
      "service-a",
      1,
      {
        category: "Cabelo",
        description: "Corte masculino completo",
        durationMinutes: 45,
        name: "Corte",
        priceCents: 7_500,
        professionalIds: ["professional-a"],
        unitIds: ["unit-a"],
      },
    )
    expect(updatedService).toMatchObject({
      professionalIds: ["professional-a"],
      unitIds: ["unit-a"],
      version: 2,
    })

    const conflictDb = createDatabase()
    conflictDb.queue([])
    await expect(
      createCatalogService(conflictDb.db as never).update("tenant-a", "service", "missing", 1, {
        category: "Cabelo",
        description: "Corte masculino completo",
        durationMinutes: 45,
        name: "Corte",
        priceCents: 7_500,
        professionalIds: [],
        unitIds: [],
      }),
    ).rejects.toEqual(new CatalogError("version_conflict"))
  })

  it("rejects invalid and incompatible service relationships", async () => {
    const invalidDb = createDatabase()
    invalidDb.queue([{ id: "unit-a" }], [])
    await expect(
      createCatalogService(invalidDb.db as never).create("tenant-a", "service", {
        category: "Cabelo",
        description: "Corte masculino completo",
        durationMinutes: 45,
        name: "Corte",
        priceCents: 7_500,
        professionalIds: ["foreign-professional"],
        unitIds: ["unit-a"],
      }),
    ).rejects.toMatchObject({ code: "invalid_relation" })

    const incompatibleDb = createDatabase()
    incompatibleDb.queue([{ id: "unit-a" }], [{ id: "professional-a" }], [])
    await expect(
      createCatalogService(incompatibleDb.db as never).create("tenant-a", "service", {
        category: "Cabelo",
        description: "Corte masculino completo",
        durationMinutes: 45,
        name: "Corte",
        priceCents: 7_500,
        professionalIds: ["professional-a"],
        unitIds: ["unit-a"],
      }),
    ).rejects.toMatchObject({ code: "invalid_relation" })
  })

  it("invites an existing tenant member without duplicating membership", async () => {
    const { db, queue } = createDatabase()
    queue(
      [{ id: "unit-a" }],
      [{ id: "service-a" }],
      [{ serviceId: "service-a" }],
      undefined,
      [],
      [{ id: "user-a", status: "active" }],
      [],
      [{ id: "member-a", status: "active" }],
      undefined,
      undefined,
    )
    const result = await createCatalogService(db as never).inviteProfessional(
      "tenant-a",
      "owner-a",
      {
        commissionBasisPoints: 5_000,
        email: "OWNER@example.com",
        role: "Barbeiro",
        serviceIds: ["service-a", "service-a"],
        specialties: ["Corte", "Corte"],
        unitIds: ["unit-a", "unit-a"],
      },
    )
    expect(result).toMatchObject({ email: "owner@example.com", mode: "invited" })
    expect(db.insert).toHaveBeenCalledTimes(2)
  })

  it("creates organization membership invitations for new professional identities", async () => {
    const { db, queue } = createDatabase()
    queue(undefined, [], [], undefined, undefined, undefined)
    const result = await createCatalogService(db as never).inviteProfessional(
      "tenant-a",
      "owner-a",
      {
        commissionBasisPoints: 0,
        email: "new@example.com",
        role: "Atendente",
        serviceIds: [],
        specialties: [],
        unitIds: [],
      },
    )
    expect(result.email).toBe("new@example.com")
    expect(db.insert).toHaveBeenCalledTimes(3)
  })

  it("rejects pending, disabled, duplicate, and incompatible professional invitations", async () => {
    const pendingDb = createDatabase()
    pendingDb.queue(undefined, [{ id: "invite-a" }])
    await expect(
      createCatalogService(pendingDb.db as never).inviteProfessional("tenant-a", "owner-a", {
        commissionBasisPoints: 0,
        email: "pending@example.com",
        role: "Barbeiro",
        serviceIds: [],
        specialties: [],
        unitIds: [],
      }),
    ).rejects.toMatchObject({ code: "invitation_pending" })

    const disabledDb = createDatabase()
    disabledDb.queue(undefined, [], [{ id: "user-a", status: "disabled" }])
    await expect(
      createCatalogService(disabledDb.db as never).inviteProfessional("tenant-a", "owner-a", {
        commissionBasisPoints: 0,
        email: "disabled@example.com",
        role: "Barbeiro",
        serviceIds: [],
        specialties: [],
        unitIds: [],
      }),
    ).rejects.toMatchObject({ code: "invalid_request" })

    const duplicateDb = createDatabase()
    duplicateDb.queue(
      undefined,
      [],
      [{ id: "user-a", status: "active" }],
      [{ id: "professional-a" }],
    )
    await expect(
      createCatalogService(duplicateDb.db as never).inviteProfessional("tenant-a", "owner-a", {
        commissionBasisPoints: 0,
        email: "duplicate@example.com",
        role: "Barbeiro",
        serviceIds: [],
        specialties: [],
        unitIds: [],
      }),
    ).rejects.toMatchObject({ code: "already_member" })

    const incompatibleDb = createDatabase()
    incompatibleDb.queue([{ id: "service-a" }], [])
    await expect(
      createCatalogService(incompatibleDb.db as never).inviteProfessional("tenant-a", "owner-a", {
        commissionBasisPoints: 0,
        email: "barber@example.com",
        role: "Barbeiro",
        serviceIds: ["service-a"],
        specialties: [],
        unitIds: [],
      }),
    ).rejects.toMatchObject({ code: "invalid_relation" })
  })

  it("archives records and distinguishes missing records from stale versions", async () => {
    const archivedDb = createDatabase()
    archivedDb.queue(
      [{ id: "service-a" }],
      [serviceRow({ status: "archived", version: 2 })],
      [],
      [],
    )
    const archived = await createCatalogService(archivedDb.db as never).setArchived(
      "tenant-a",
      "service",
      "service-a",
      true,
      1,
    )
    expect(archived).toMatchObject({ status: "archived", version: 2 })

    const staleDb = createDatabase()
    staleDb.queue([], [{ id: "service-a" }])
    await expect(
      createCatalogService(staleDb.db as never).setArchived(
        "tenant-a",
        "service",
        "service-a",
        false,
        1,
      ),
    ).rejects.toMatchObject({ code: "version_conflict" })

    const missingDb = createDatabase()
    missingDb.queue([], [])
    await expect(
      createCatalogService(missingDb.db as never).setArchived(
        "tenant-a",
        "service",
        "missing",
        true,
        1,
      ),
    ).rejects.toMatchObject({ code: "not_found" })

    const professionalDb = createDatabase()
    professionalDb.queue(
      [{ id: "professional-a" }],
      [{ professional: professionalRow({ status: "active", version: 2 }), userName: "Marcus" }],
      [],
      [],
    )
    await expect(
      createCatalogService(professionalDb.db as never).setArchived(
        "tenant-a",
        "professional",
        "professional-a",
        false,
        1,
      ),
    ).resolves.toMatchObject({ status: "active" })
  })
})
