import { fileURLToPath } from "node:url"
import { eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { createAvailabilityService } from "../../src/modules/availability/application/availability-service.js"
import {
  availabilityCommand,
  availabilitySeries,
} from "../../src/modules/availability/database/schema.js"
import { createDrizzleClientRepository } from "../../src/modules/clients/database/client-repository.js"
import { client } from "../../src/modules/clients/database/schema.js"
import { member, organization, user } from "../../src/modules/idp/database/schema.js"
import { professional, professionalUnit } from "../../src/modules/professionals/database/schema.js"
import {
  createSchedulingService,
  guardAvailabilityAppointments,
} from "../../src/modules/scheduling/application/scheduling-service.js"
import { nextClientAppointment } from "../../src/modules/scheduling/database/client-projection.js"
import {
  appointment,
  appointmentEvent,
  schedulingCommand,
} from "../../src/modules/scheduling/database/schema.js"
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
const scheduling = createSchedulingService(db as never, "isolated-test-fingerprint-secret"),
  availability = createAvailabilityService(db as never, guardAvailabilityAppointments)
const actor = { organizationId: "schedule-a", actorUserId: "schedule-user" }
const base = {
  unitId: "schedule-unit",
  professionalId: "schedule-professional",
  serviceId: "schedule-service",
  clientId: "schedule-client",
  date: "2026-09-07",
  start: "09:00",
  notes: "PRIVATE_SENTINEL",
  origin: "reception",
}
let seriesId = ""
beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  await db.insert(organization).values([
    { id: actor.organizationId, name: "Schedule A", slug: "schedule-a" },
    { id: "schedule-b", name: "Schedule B", slug: "schedule-b" },
  ])
  await db
    .insert(user)
    .values({ id: actor.actorUserId, name: "Scheduling Test", email: "scheduling@example.invalid" })
  await db.insert(member).values({
    id: "schedule-member",
    organizationId: actor.organizationId,
    userId: actor.actorUserId,
    role: "owner",
  })
  await db.insert(unit).values({
    id: base.unitId,
    organizationId: actor.organizationId,
    name: "Schedule unit",
    code: "SCHEDULE",
    normalizedCode: "schedule",
    address: "Synthetic address",
    openingDays: ["monday"],
    openingStart: "09:00",
    openingEnd: "18:00",
  })
  await db.insert(professional).values({
    id: base.professionalId,
    organizationId: actor.organizationId,
    globalUserId: actor.actorUserId,
    role: "Barber",
  })
  await db.insert(professionalUnit).values({
    organizationId: actor.organizationId,
    professionalId: base.professionalId,
    unitId: base.unitId,
  })
  await db.insert(service).values({
    id: base.serviceId,
    organizationId: actor.organizationId,
    name: "Haircut",
    normalizedName: "haircut",
    category: "Hair",
    description: "Synthetic service",
    durationMinutes: 30,
    priceCents: 5000,
  })
  await db.insert(serviceUnit).values({
    organizationId: actor.organizationId,
    serviceId: base.serviceId,
    unitId: base.unitId,
  })
  await db.insert(professionalService).values({
    organizationId: actor.organizationId,
    serviceId: base.serviceId,
    professionalId: base.professionalId,
  })
  await db.insert(client).values({
    id: base.clientId,
    organizationId: actor.organizationId,
    name: "Private Client",
    normalizedPhone: "81999990000",
  })
})
afterAll(async () => {
  for (const table of [
    availabilityCommand,
    schedulingCommand,
    appointmentEvent,
    appointment,
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
  await db.delete(organization).where(sql`${organization.id} in ('schedule-a','schedule-b')`)
  await pool.end()
})
describe.sequential("persistent scheduling", () => {
  it("requires explicit timezone before creating a real weekly series", async () => {
    const input = {
      unitId: base.unitId,
      professionalId: base.professionalId,
      kind: "available",
      start: "09:00",
      end: "18:00",
      weekdays: ["monday"],
      effectiveFrom: "2026-09-07",
    }
    await expect(availability.save(actor.organizationId, input)).rejects.toMatchObject({
      code: "timezone_required",
    })
    await availability.timezone(actor.organizationId, base.unitId, "America/Recife", 1)
    const series = await availability.save(actor.organizationId, input)
    seriesId = series.id
    expect(
      (
        await availability.range(actor.organizationId, {
          unitId: base.unitId,
          startDate: base.date,
          endDate: base.date,
        })
      ).occurrences,
    ).toHaveLength(1)
  })
  it("commits at most one concurrent overlapping appointment and safely replays a retry", async () => {
    const keys = [crypto.randomUUID(), crypto.randomUUID()]
    const outcomes = await Promise.allSettled([
      scheduling.create(actor, base, keys[0]),
      scheduling.create(actor, base, keys[1]),
    ])
    expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(1)
    const [saved] = await db
      .select()
      .from(appointment)
      .where(eq(appointment.organizationId, actor.organizationId))
    expect(saved.startsAt.toISOString()).toBe("2026-09-07T12:00:00.000Z")
    expect(saved.priceCents).toBe(5000)
    const winner = outcomes.findIndex((item) => item.status === "fulfilled")
    const key = keys[winner]
    expect((await scheduling.create(actor, base, key)).id).toBe(saved.id)
    await expect(scheduling.create(actor, { ...base, start: "10:00" }, key)).rejects.toMatchObject({
      code: "idempotency_conflict",
    })
  })
  it("enforces foreign IDs, stale versions and legal transitions", async () => {
    const [saved] = await db
      .select()
      .from(appointment)
      .where(eq(appointment.organizationId, actor.organizationId))
    await expect(scheduling.detail("schedule-b", saved.id)).rejects.toMatchObject({
      code: "not_found",
    })
    await expect(
      scheduling.create(
        { ...actor, organizationId: "schedule-b" },
        { ...base, start: "11:00" },
        crypto.randomUUID(),
      ),
    ).rejects.toMatchObject({ code: "invalid_relation" })
    await scheduling.changeStatus(actor, saved.id, "confirm", { version: 1 }, crypto.randomUUID())
    await expect(
      scheduling.update(actor, saved.id, { ...base, start: "10:00" }, 1, crypto.randomUUID()),
    ).rejects.toMatchObject({ code: "version_conflict" })
    await scheduling.changeStatus(actor, saved.id, "check-in", { version: 2 }, crypto.randomUUID())
    await expect(
      scheduling.changeStatus(actor, saved.id, "confirm", { version: 3 }, crypto.randomUUID()),
    ).rejects.toMatchObject({ code: "invalid_transition" })
    await scheduling.changeStatus(
      actor,
      saved.id,
      "cancel",
      { version: 3, cancellationReason: "client" },
      crypto.randomUUID(),
    )
    const replacement = await scheduling.create(actor, base, crypto.randomUUID())
    expect(replacement.status).toBe("scheduled")
  })
  it("retains private occupancy under filters and excludes payloads from events and idempotency", async () => {
    const range = await scheduling.range(actor.organizationId, {
      unitId: base.unitId,
      startDate: base.date,
      endDate: base.date,
      search: "no-match",
    })
    expect(range.appointments).toHaveLength(0)
    expect(range.occupancies).toHaveLength(1)
    expect(JSON.stringify(range.occupancies)).not.toContain("Private Client")
    const events = await db
      .select()
      .from(appointmentEvent)
      .where(eq(appointmentEvent.organizationId, actor.organizationId))
    const retries = await db
      .select()
      .from(schedulingCommand)
      .where(eq(schedulingCommand.organizationId, actor.organizationId))
    expect(JSON.stringify({ events, retries })).not.toContain("PRIVATE_SENTINEL")
    const page = await scheduling.page(actor.organizationId, {
      unitId: base.unitId,
      startDate: base.date,
      endDate: base.date,
      pageSize: 1,
    })
    expect(page.totalCount).toBe(2)
    expect(page.items).toHaveLength(1)
  })
  it("atomically excludes one recurrence occurrence without changing the following week", async () => {
    await availability.save(actor.organizationId, null, {
      id: seriesId,
      version: 1,
      scope: "occurrence",
      date: "2026-09-14",
      archive: true,
    })
    expect(
      (
        await availability.range(actor.organizationId, {
          unitId: base.unitId,
          startDate: "2026-09-14",
          endDate: "2026-09-21",
        })
      ).occurrences.map((item) => item.date),
    ).toEqual(["2026-09-21"])
    await expect(
      availability.save(actor.organizationId, null, {
        id: seriesId,
        version: 1,
        scope: "series",
        archive: true,
      }),
    ).rejects.toMatchObject({ code: "version_conflict" })
  })
  it("keeps server snapshots when editing and rolls back availability changes affecting bookings", async () => {
    const rows = await db
      .select()
      .from(appointment)
      .where(eq(appointment.organizationId, actor.organizationId))
    const current = rows.find((row) => row.status === "scheduled")
    if (!current) throw new Error("Expected an occupying booking")
    await db
      .update(service)
      .set({ priceCents: 9900, durationMinutes: 60 })
      .where(eq(service.id, base.serviceId))
    const edited = await scheduling.update(
      actor,
      current.id,
      { ...base, notes: "Changed private note" },
      current.version,
      crypto.randomUUID(),
    )
    expect(edited.priceCents).toBe(5000)
    expect(edited.durationMinutes).toBe(30)
    await expect(
      availability.save(actor.organizationId, null, {
        id: seriesId,
        version: 2,
        scope: "series",
        archive: true,
      }),
    ).rejects.toMatchObject({ code: "appointment_dependency" })
    const [rule] = await db
      .select()
      .from(availabilitySeries)
      .where(eq(availabilitySeries.id, seriesId))
    expect(rule.status).toBe("active")
    expect(rule.version).toBe(2)
    await db
      .update(service)
      .set({ priceCents: 5000, durationMinutes: 30 })
      .where(eq(service.id, base.serviceId))
  })
  it("enforces the PostgreSQL exclusion even when application locking is bypassed", async () => {
    const rows = await db
      .select()
      .from(appointment)
      .where(eq(appointment.organizationId, actor.organizationId))
    const current = rows.find((row) => row.status === "scheduled")
    if (!current) throw new Error("Expected an occupying booking")
    const attempts = await Promise.allSettled(
      [1, 2].map(() => db.insert(appointment).values({ ...current, id: crypto.randomUUID() })),
    )
    expect(attempts.every((result) => result.status === "rejected")).toBe(true)
    for (const result of attempts)
      if (result.status === "rejected") expect(result.reason.cause.code).toBe("23P01")
  })
  it("restores excluded dates, archives and restores series, and replays availability commands", async () => {
    await availability.save(actor.organizationId, null, {
      id: seriesId,
      version: 2,
      scope: "occurrence",
      date: "2026-09-14",
      restore: true,
    })
    const input = {
      unitId: base.unitId,
      professionalId: base.professionalId,
      kind: "break",
      start: "12:00",
      end: "13:00",
      weekdays: ["monday"],
      effectiveFrom: "2026-09-14",
      effectiveUntil: "2026-09-14",
    }
    const command = { actorUserId: actor.actorUserId, key: crypto.randomUUID() }
    const saved = await availability.save(actor.organizationId, input, undefined, command)
    expect(await availability.save(actor.organizationId, input, undefined, command)).toEqual(saved)
    await expect(
      availability.save(actor.organizationId, { ...input, start: "11:00" }, undefined, command),
    ).rejects.toMatchObject({ code: "idempotency_conflict" })
    await availability.save(actor.organizationId, null, {
      id: saved.id,
      version: 1,
      scope: "series",
      archive: true,
    })
    const query = {
      unitId: base.unitId,
      startDate: "2026-09-14",
      endDate: "2026-09-14",
      includeArchived: true,
    }
    expect((await availability.range(actor.organizationId, query)).archived).toHaveLength(1)
    await availability.save(actor.organizationId, null, {
      id: saved.id,
      version: 2,
      scope: "series",
      restore: true,
    })
    expect((await availability.range(actor.organizationId, query)).occurrences).toHaveLength(2)
    await expect(
      availability.timezone(actor.organizationId, base.unitId, "UTC", 2),
    ).rejects.toMatchObject({ code: "timezone_in_use" })
  })
  it("rejects disabled professionals and foreign history before exposing records", async () => {
    await db.update(member).set({ status: "disabled" }).where(eq(member.id, "schedule-member"))
    try {
      await expect(
        scheduling.create(actor, { ...base, start: "11:00" }, crypto.randomUUID()),
      ).rejects.toMatchObject({ code: "invalid_relation" })
    } finally {
      await db.update(member).set({ status: "active" }).where(eq(member.id, "schedule-member"))
    }
    await expect(scheduling.clientHistory("schedule-b", base.clientId)).rejects.toMatchObject({
      code: "not_found",
    })
    await expect(
      scheduling.professionalSchedule("schedule-b", base.professionalId, base.date),
    ).rejects.toMatchObject({ code: "not_found" })
    expect(
      (await scheduling.clientHistory(actor.organizationId, base.clientId)).lastVisitAt,
    ).toBeNull()
    expect(
      (await scheduling.professionalSchedule(actor.organizationId, base.professionalId, base.date))
        .length,
    ).toBeGreaterThan(0)
  })
  it("records no-show only after the booked start and keeps fulfillment transitions private", async () => {
    const missed = await scheduling.create(actor, { ...base, start: "12:00" }, crypto.randomUUID())
    vi.setSystemTime(new Date("2026-09-07T16:00:00Z"))
    try {
      const result = await scheduling.changeStatus(
        actor,
        missed.id,
        "no-show",
        { version: 1 },
        crypto.randomUUID(),
      )
      expect(result.status).toBe("no-show")
    } finally {
      vi.useRealTimers()
    }
    const fulfilled = await scheduling.create(
      actor,
      { ...base, start: "13:00" },
      crypto.randomUUID(),
    )
    await scheduling.changeStatus(
      actor,
      fulfilled.id,
      "check-in",
      { version: 1 },
      crypto.randomUUID(),
    )
    await scheduling.transitionFromFulfillment(
      actor,
      fulfilled.id,
      "waiting",
      2,
      crypto.randomUUID(),
    )
    await scheduling.transitionFromFulfillment(
      actor,
      fulfilled.id,
      "in-progress",
      3,
      crypto.randomUUID(),
    )
    const result = await scheduling.transitionFromFulfillment(
      actor,
      fulfilled.id,
      "completed",
      4,
      crypto.randomUUID(),
    )
    expect(result.status).toBe("completed")
    expect((await scheduling.detail(actor.organizationId, fulfilled.id)).events).toHaveLength(5)
    expect(
      (await scheduling.clientHistory(actor.organizationId, base.clientId)).lastVisitAt,
    ).toBeNull()
  })
  it("restores an excluded occurrence at the capacity limit", async () => {
    const [current] = await db
      .select()
      .from(availabilitySeries)
      .where(eq(availabilitySeries.id, seriesId))
    const excludedDates = Array.from({ length: 1000 }, (_, index) =>
      new Date(Date.UTC(2030, 0, index + 1)).toISOString().slice(0, 10),
    )
    await db
      .update(availabilitySeries)
      .set({ excludedDates })
      .where(eq(availabilitySeries.id, seriesId))
    try {
      await availability.save(actor.organizationId, null, {
        id: seriesId,
        version: current.version,
        scope: "occurrence",
        date: excludedDates[0],
        restore: true,
      })
      const [updated] = await db
        .select()
        .from(availabilitySeries)
        .where(eq(availabilitySeries.id, seriesId))
      expect(updated.excludedDates).toHaveLength(999)
      expect(updated.excludedDates).not.toContain(excludedDates[0])
    } finally {
      await db
        .update(availabilitySeries)
        .set({ excludedDates: current.excludedDates })
        .where(eq(availabilitySeries.id, seriesId))
    }
  })
  it("does not return already started appointments as upcoming", async () => {
    vi.setSystemTime(new Date("2026-09-07T15:00:00Z"))
    try {
      const next = await scheduling.professionalSchedule(
        actor.organizationId,
        base.professionalId,
        base.date,
      )
      expect(next.every((item) => item.startsAt >= new Date())).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
  it("projects local appointment time and preserves legacy client preferences", async () => {
    await db
      .update(client)
      .set({ servicePreferences: ["Legacy preference"] })
      .where(eq(client.id, base.clientId))
    const repository = createDrizzleClientRepository(db as never, nextClientAppointment)
    const projected = await repository.get({
      organizationId: actor.organizationId,
      clientId: base.clientId,
    })
    expect(projected).toMatchObject({ servicePreferences: ["Legacy preference"] })
    const expected = await pool.query(
      "select date::text, start from scheduling_appointments where organization_id=$1 and client_id=$2 and starts_at >= now() and status in ('scheduled','confirmed','arrived') order by starts_at,id limit 1",
      [actor.organizationId, base.clientId],
    )
    expect(expected.rows).toHaveLength(1)
    expect(projected?.nextAppointmentAt).toBe(`${expected.rows[0].date}T${expected.rows[0].start}`)
  })
})
