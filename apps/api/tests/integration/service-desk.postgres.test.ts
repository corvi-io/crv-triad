import { fileURLToPath } from "node:url"
import { and, eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { availabilitySeries } from "../../src/modules/availability/database/schema.js"
import { createDrizzleClientRepository } from "../../src/modules/clients/database/client-repository.js"
import { client } from "../../src/modules/clients/database/schema.js"
import { member, organization, user } from "../../src/modules/idp/database/schema.js"
import { professional, professionalUnit } from "../../src/modules/professionals/database/schema.js"
import { createSchedulingService } from "../../src/modules/scheduling/application/scheduling-service.js"
import { appointment, schedulingOccupancy } from "../../src/modules/scheduling/database/schema.js"
import { createServiceDeskService } from "../../src/modules/service-desk/application/service-desk-service.js"
import {
  serviceDeskCommand,
  serviceDeskEvent,
  serviceDeskHandoff,
  serviceDeskItem,
  serviceDeskVisit,
} from "../../src/modules/service-desk/database/schema.js"
import {
  professionalService,
  service,
  serviceUnit,
} from "../../src/modules/services/database/schema.js"
import { unit } from "../../src/modules/units/database/schema.js"

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error("TEST_DATABASE_URL is required")
const target = new URL(url)
if (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  target.port === "5432" ||
  !target.pathname.endsWith("_test")
)
  throw new Error("Isolated local test database required")
const pool = new Pool({ connectionString: url }),
  db = drizzle(pool)
const scheduling = createSchedulingService(db as never, "service-desk-test-secret")
const desk = createServiceDeskService(db as never, scheduling, "service-desk-test-secret")
const clients = createDrizzleClientRepository(db as never)
const actor = { organizationId: "desk-a", actorUserId: "desk-owner" }
beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  await db.insert(organization).values([
    { id: actor.organizationId, name: "Desk A", slug: "desk-a" },
    { id: "desk-b", name: "Desk B", slug: "desk-b" },
  ])
  await db
    .insert(user)
    .values({ id: actor.actorUserId, name: "Desk Owner", email: "desk@example.invalid" })
  await db.insert(member).values({
    id: "desk-member",
    organizationId: actor.organizationId,
    userId: actor.actorUserId,
    role: "owner",
  })
  await db.insert(unit).values({
    id: "desk-unit",
    organizationId: actor.organizationId,
    name: "Centro",
    code: "D",
    normalizedCode: "d",
    address: "Synthetic",
    openingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    openingStart: "00:00",
    openingEnd: "23:59",
    timezone: "America/Recife",
  })
  await db.insert(professional).values({
    id: "desk-professional",
    organizationId: actor.organizationId,
    globalUserId: actor.actorUserId,
    role: "Barber",
  })
  await db.insert(professionalUnit).values({
    organizationId: actor.organizationId,
    professionalId: "desk-professional",
    unitId: "desk-unit",
  })
  await db.insert(service).values({
    id: "desk-service",
    organizationId: actor.organizationId,
    name: "Corte",
    normalizedName: "corte",
    category: "Cabelo",
    description: "Synthetic",
    durationMinutes: 30,
    priceCents: 5000,
  })
  await db.insert(serviceUnit).values({
    organizationId: actor.organizationId,
    serviceId: "desk-service",
    unitId: "desk-unit",
  })
  await db.insert(professionalService).values({
    organizationId: actor.organizationId,
    professionalId: "desk-professional",
    serviceId: "desk-service",
  })
  await db.insert(availabilitySeries).values({
    id: "desk-availability",
    organizationId: actor.organizationId,
    unitId: "desk-unit",
    professionalId: "desk-professional",
    kind: "available",
    start: "00:00",
    end: "23:59",
    weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    effectiveFrom: "2020-01-01",
    excludedDates: [],
  })
  await db.insert(client).values({
    id: "desk-client",
    organizationId: actor.organizationId,
    name: "Linked Client",
    normalizedPhone: "81999990000",
  })
})
afterAll(async () => {
  for (const table of [
    serviceDeskHandoff,
    serviceDeskCommand,
    serviceDeskEvent,
    schedulingOccupancy,
    serviceDeskItem,
    serviceDeskVisit,
    availabilitySeries,
    professionalService,
    serviceUnit,
    professionalUnit,
    service,
    professional,
    client,
    unit,
    member,
  ])
    await db.delete(table).where(eq(table.organizationId, actor.organizationId))
  await db.delete(user).where(eq(user.id, actor.actorUserId))
  await db.delete(organization).where(sql`${organization.id} in ('desk-a','desk-b')`)
  await pool.end()
})
describe.sequential("production service desk", () => {
  it("seals one immutable handoff and updates only a linked client", async () => {
    const admitted = await desk.admitWalkIn(actor, {
      unitId: "desk-unit",
      clientId: "desk-client",
      serviceId: "desk-service",
      idempotencyKey: crypto.randomUUID(),
    })
    const called = await desk.transition(actor, admitted.id, "call", {
      expectedVersion: 1,
      idempotencyKey: crypto.randomUUID(),
    })
    const started = await desk.start(actor, admitted.id, {
      expectedVersion: called.version,
      professionalId: "desk-professional",
      idempotencyKey: crypto.randomUUID(),
    })
    const detail = await desk.detail(actor.organizationId, admitted.id)
    const item = detail.items[0]
    const itemDone = await desk.finishItem(actor, admitted.id, item.id, {
      expectedVersion: started.version,
      idempotencyKey: crypto.randomUUID(),
    })
    const key = crypto.randomUUID()
    const completed = await desk.finish(actor, admitted.id, {
      expectedVersion: itemDone.version,
      idempotencyKey: key,
    })
    expect(
      (
        await desk.finish(actor, admitted.id, {
          expectedVersion: itemDone.version,
          idempotencyKey: key,
        })
      ).version,
    ).toBe(completed.version)
    const handoffs = await desk.completedHandoffs(actor.organizationId)
    expect(handoffs).toHaveLength(1)
    expect(handoffs[0].payload).toMatchObject({
      schemaVersion: 1,
      visitId: admitted.id,
      clientId: "desk-client",
      appointmentId: null,
      visitVersion: completed.version,
    })
    expect(JSON.stringify(handoffs[0].payload)).not.toContain("81999990000")
    expect(
      (
        await db
          .select({ lastVisitAt: client.lastVisitAt })
          .from(client)
          .where(eq(client.id, "desk-client"))
      )[0].lastVisitAt,
    ).not.toBeNull()
    expect(
      await clients.list({
        organizationId: actor.organizationId,
        query: {
          contact: "all",
          duplicate: "all",
          page: 1,
          pageSize: 20,
          search: "",
          sortBy: "lastVisitAt",
          sortDirection: "desc",
          status: "active",
          tag: "",
        },
      }),
    ).toMatchObject({ items: [{ id: "desk-client", lastVisitAt: expect.any(Date) }] })
  })
  it("enforces guest identity, tenant isolation, versions, replay fingerprints and occupancy", async () => {
    await expect(
      desk.admitWalkIn(actor, {
        unitId: "desk-unit",
        serviceId: "desk-service",
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toBeTruthy()
    const key = crypto.randomUUID()
    const guest = await desk.admitWalkIn(actor, {
      unitId: "desk-unit",
      guestName: "Guest",
      serviceId: "desk-service",
      idempotencyKey: key,
    })
    expect(
      (
        await desk.admitWalkIn(actor, {
          unitId: "desk-unit",
          guestName: "Guest",
          serviceId: "desk-service",
          idempotencyKey: key,
        })
      ).id,
    ).toBe(guest.id)
    await expect(
      desk.admitWalkIn(actor, {
        unitId: "desk-unit",
        guestName: "Changed",
        serviceId: "desk-service",
        idempotencyKey: key,
      }),
    ).rejects.toMatchObject({ code: "idempotency_conflict" })
    await expect(desk.detail("desk-b", guest.id)).rejects.toMatchObject({ code: "not_found" })
    await expect(
      desk.transition(actor, guest.id, "call", {
        expectedVersion: 99,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "version_conflict" })
    const called = await desk.transition(actor, guest.id, "call", {
      expectedVersion: 1,
      idempotencyKey: crypto.randomUUID(),
    })
    await db.insert(schedulingOccupancy).values({
      id: "occupied",
      organizationId: actor.organizationId,
      professionalId: "desk-professional",
      unitId: "desk-unit",
      source: "appointment",
      sourceId: "external",
      startsAt: new Date(Date.now() - 1000),
      endsAt: new Date(Date.now() + 3600000),
    })
    await expect(
      desk.start(actor, guest.id, {
        expectedVersion: called.version,
        professionalId: "desk-professional",
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "professional_occupied" })
    await db
      .delete(schedulingOccupancy)
      .where(
        and(
          eq(schedulingOccupancy.organizationId, actor.organizationId),
          eq(schedulingOccupancy.id, "occupied"),
        ),
      )
  })
  it("returns a call to its original queue position and cancels a pre-service visit without handoff", async () => {
    const admitted = await desk.admitWalkIn(actor, {
      unitId: "desk-unit",
      guestName: "Leaving Guest",
      serviceId: "desk-service",
      idempotencyKey: crypto.randomUUID(),
    })
    const called = await desk.transition(actor, admitted.id, "call", {
      expectedVersion: admitted.version,
      idempotencyKey: crypto.randomUUID(),
    })
    const waiting = await desk.transition(actor, admitted.id, "return_to_waiting", {
      expectedVersion: called.version,
      idempotencyKey: crypto.randomUUID(),
    })
    expect(waiting).toMatchObject({ status: "waiting", arrivedAt: admitted.arrivedAt })
    const canceled = await desk.transition(actor, admitted.id, "cancel", {
      expectedVersion: waiting.version,
      idempotencyKey: crypto.randomUUID(),
      reason: "Cliente precisou sair",
    })
    expect(canceled).toMatchObject({ status: "canceled", closureReason: "Cliente precisou sair" })
    expect(
      (await desk.completedHandoffs(actor.organizationId)).map(({ payload }) => payload.visitId),
    ).not.toContain(admitted.id)
  })
  it("searches the queue by service name and paginates every pending arrival", async () => {
    const searchable = await desk.admitWalkIn(actor, {
      unitId: "desk-unit",
      guestName: "Unrelated customer",
      serviceId: "desk-service",
      idempotencyKey: crypto.randomUUID(),
    })
    expect(
      (await desk.queue(actor.organizationId, "desk-unit", { search: "Corte" })).items.map(
        ({ id }) => id,
      ),
    ).toContain(searchable.id)

    const arrivals = Array.from({ length: 51 }, (_, index) => ({
      id: `arrival-${String(index).padStart(2, "0")}`,
      organizationId: actor.organizationId,
      unitId: "desk-unit",
      professionalId: "desk-professional",
      serviceId: "desk-service",
      clientId: "desk-client",
      customerName: `Arrival ${index}`,
      professionalName: "Desk Owner",
      serviceName: "Corte",
      unitName: "Centro",
      timezone: "America/Recife",
      date: "2026-09-07",
      start: "09:00",
      end: "09:30",
      startsAt: new Date(1_800_000_000_000 + index * 60_000),
      endsAt: new Date(1_800_000_030_000 + index * 60_000),
      durationMinutes: 30,
      priceCents: 5000,
      status: "arrived" as const,
    }))
    await db.insert(appointment).values(arrivals)
    const first = await desk.arrivals(actor.organizationId, "desk-unit")
    expect(first.items).toHaveLength(50)
    expect(first.nextCursor).not.toBeNull()
    const second = await desk.arrivals(
      actor.organizationId,
      "desk-unit",
      first.nextCursor ?? undefined,
    )
    expect(second.items).toHaveLength(1)
    expect(second.nextCursor).toBeNull()
    await db.delete(appointment).where(sql`${appointment.id} like 'arrival-%'`)
  })
})
