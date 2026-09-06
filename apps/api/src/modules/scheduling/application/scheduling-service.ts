import { createHmac } from "node:crypto"
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm"
import { z } from "zod"
import { lockSchedule, readSeries } from "../../availability/application/availability-service.js"
import {
  resolveAvailabilityCatalog,
  type TransactionDatabase,
} from "../../availability/database/catalog-context.js"
import {
  assertAvailable,
  assertOpeningHours,
  projectAvailability,
  type Series,
} from "../../availability/domain/availability.js"
import {
  addDate,
  dateRange,
  minutes,
  SchedulingError,
  timeAt,
  toInstant,
  weekday,
} from "../../availability/domain/time.js"
import { client } from "../../clients/database/schema.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import { member, user } from "../../idp/database/schema.js"
import { professional, professionalUnit } from "../../professionals/database/schema.js"
import { professionalService, service, serviceUnit } from "../../services/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import { unit } from "../../units/database/schema.js"
import {
  appointment,
  appointmentEvent,
  schedulingCommand,
  schedulingOccupancy,
} from "../database/schema.js"
import {
  type AppointmentCommand,
  type AppointmentInput,
  appointmentInput,
  assertEditable,
  statuses,
  transition,
  trustedServiceTransition,
} from "../domain/appointment.js"

type Actor = { organizationId: string; actorUserId: string }
type Record = typeof appointment.$inferSelect
export const rangeQuery = z.object({
  unitId: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  professionalIds: z.string().max(5100).optional(),
  clientIds: z.string().max(5100).optional(),
  serviceIds: z.string().max(5100).optional(),
  statusIds: z.string().max(200).optional(),
  search: z.string().max(160).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
})
type Query = z.infer<typeof rangeQuery>
function list(value?: string) {
  return value ? [...new Set(value.split(",").filter(Boolean))].slice(0, 50) : []
}
function predicates(organizationId: string, query: Query, filtered = true) {
  const professionalIds = list(query.professionalIds),
    clientIds = list(query.clientIds),
    serviceIds = list(query.serviceIds),
    statusIds = list(query.statusIds)
  if (statusIds.some((status) => !statuses.includes(status as (typeof statuses)[number])))
    throw new SchedulingError("invalid_request")
  return and(
    eq(appointment.organizationId, organizationId),
    eq(appointment.unitId, query.unitId),
    gte(appointment.date, query.startDate),
    lte(appointment.date, query.endDate),
    filtered && professionalIds.length
      ? inArray(appointment.professionalId, professionalIds)
      : undefined,
    filtered && clientIds.length ? inArray(appointment.clientId, clientIds) : undefined,
    filtered && serviceIds.length ? inArray(appointment.serviceId, serviceIds) : undefined,
    filtered && statusIds.length
      ? inArray(appointment.status, statusIds as (typeof statuses)[number][])
      : undefined,
    filtered && query.search?.trim()
      ? or(
          ilike(appointment.customerName, `%${query.search.trim().replace(/[\\%_]/g, "\\$&")}%`),
          ilike(appointment.serviceName, `%${query.search.trim().replace(/[\\%_]/g, "\\$&")}%`),
          ilike(
            appointment.professionalName,
            `%${query.search.trim().replace(/[\\%_]/g, "\\$&")}%`,
          ),
        )
      : undefined,
  )
}
export async function guardAvailabilityAppointments(
  db: TransactionDatabase,
  organizationId: string,
  unitId: string,
  professionalId: string,
  series: readonly Series[],
) {
  // Keyset batches keep validation memory bounded even for long-lived recurring series.
  let after = ""
  while (true) {
    const rows = await db
      .select()
      .from(appointment)
      .where(
        and(
          eq(appointment.organizationId, organizationId),
          eq(appointment.unitId, unitId),
          eq(appointment.professionalId, professionalId),
          notInArray(appointment.status, ["canceled", "no-show", "completed"]),
          gte(appointment.endsAt, new Date()),
          sql`${appointment.id} > ${after}`,
        ),
      )
      .orderBy(asc(appointment.id))
      .limit(100)
    for (const row of rows) {
      try {
        assertAvailable(projectAvailability(series, row.date, row.date), row)
      } catch {
        throw new SchedulingError("appointment_dependency")
      }
    }
    if (rows.length < 100) return
    after = rows[rows.length - 1].id
  }
}
export function createSchedulingService(db: IdpDatabase, fingerprintSecret: string) {
  async function get(organizationId: string, id: string, connection: TransactionDatabase = db) {
    const [row] = await connection
      .select()
      .from(appointment)
      .where(and(eq(appointment.organizationId, organizationId), eq(appointment.id, id)))
    if (!row) throw new SchedulingError("not_found")
    return row
  }
  async function detail(organizationId: string, id: string, eventPage = 1) {
    const row = await get(organizationId, id)
    const events = await db
      .select()
      .from(appointmentEvent)
      .where(
        and(
          eq(appointmentEvent.organizationId, organizationId),
          eq(appointmentEvent.appointmentId, id),
        ),
      )
      .orderBy(desc(appointmentEvent.version))
      .limit(50)
      .offset((eventPage - 1) * 50)
    const actorIds = [...new Set(events.map((event) => event.actorUserId))]
    const actors = actorIds.length
      ? await db
          .select({ id: user.id, name: user.name })
          .from(user)
          .where(inArray(user.id, actorIds))
      : []
    return {
      ...row,
      events: events.map((event) => ({
        ...event,
        actorName:
          actors.find((actor) => actor.id === event.actorUserId)?.name ??
          "Responsável indisponível",
      })),
    }
  }
  async function command(
    actor: Actor,
    key: string,
    action: string,
    input: unknown,
    operation: (tx: TransactionDatabase) => Promise<Record>,
  ) {
    z.uuid().parse(key)
    const fingerprint = createHmac("sha256", fingerprintSecret)
      .update(JSON.stringify({ action, input }))
      .digest("hex")
    try {
      return await db.transaction(async (tx) => {
        await lockSchedule(tx, actor.organizationId)
        const [replay] = await tx
          .select()
          .from(schedulingCommand)
          .where(
            and(
              eq(schedulingCommand.organizationId, actor.organizationId),
              eq(schedulingCommand.actorUserId, actor.actorUserId),
              eq(schedulingCommand.key, key),
            ),
          )
        if (replay) {
          if (replay.fingerprint !== fingerprint) throw new SchedulingError("idempotency_conflict")
          return get(actor.organizationId, replay.resourceId, tx)
        }
        const result = await operation(tx)
        await tx.insert(schedulingCommand).values({
          ...actor,
          id: createId(),
          key,
          fingerprint,
          resourceId: result.id,
          resourceVersion: result.version,
        })
        return result
      })
    } catch (error) {
      let cause: unknown = error
      for (let depth = 0; depth < 4 && cause && typeof cause === "object"; depth++) {
        const value = cause as { code?: string; cause?: unknown }
        if (value.code === "23P01") throw new SchedulingError("appointment_conflict", "start")
        cause = value.cause
      }
      throw error
    }
  }
  async function resolve(
    tx: TransactionDatabase,
    actor: Actor,
    input: AppointmentInput,
    current?: Record,
  ) {
    const { location, person, periods } = await resolveAvailabilityCatalog(
      tx,
      actor.organizationId,
      input.unitId,
      input.professionalId,
    )
    const [customer] = await tx
      .select()
      .from(client)
      .where(
        and(
          eq(client.organizationId, actor.organizationId),
          eq(client.id, input.clientId),
          eq(client.status, "active"),
        ),
      )
      .for("share")
    if (!customer) throw new SchedulingError("invalid_relation", "clientId")
    const metadataOnly =
      current &&
      current.serviceId === input.serviceId &&
      current.professionalId === input.professionalId &&
      current.unitId === input.unitId &&
      current.clientId === input.clientId &&
      current.date === input.date &&
      current.start === input.start
    const [offering] = await tx
      .select({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
      })
      .from(service)
      .innerJoin(
        serviceUnit,
        and(
          eq(serviceUnit.organizationId, service.organizationId),
          eq(serviceUnit.serviceId, service.id),
        ),
      )
      .innerJoin(
        professionalService,
        and(
          eq(professionalService.organizationId, service.organizationId),
          eq(professionalService.serviceId, service.id),
        ),
      )
      .where(
        and(
          eq(service.organizationId, actor.organizationId),
          eq(service.id, input.serviceId),
          metadataOnly ? undefined : eq(service.status, "active"),
          eq(serviceUnit.unitId, input.unitId),
          eq(professionalService.professionalId, input.professionalId),
        ),
      )
      .for("share")
    if (!offering) throw new SchedulingError("invalid_relation", "serviceId")
    const keepSnapshot =
      current &&
      current.serviceId === input.serviceId &&
      current.professionalId === input.professionalId
    const durationMinutes = keepSnapshot ? current.durationMinutes : offering.durationMinutes
    const priceCents = keepSnapshot ? current.priceCents : offering.priceCents
    const end = timeAt(minutes(input.start) + durationMinutes)
    const timezone = location.timezone as string
    const startsAt = toInstant(input.date, input.start, timezone),
      endsAt = toInstant(input.date, end, timezone)
    if (endsAt.getTime() - startsAt.getTime() !== durationMinutes * 60000)
      throw new SchedulingError("invalid_local_time", "start")
    assertOpeningHours(
      {
        ...input,
        kind: "available",
        weekdays: [weekday(input.date)],
        effectiveFrom: input.date,
        effectiveUntil: input.date,
        end,
      },
      periods,
    )
    const series = await readSeries(tx, actor.organizationId, input.unitId, input.date, input.date)
    if (series.length > 2000) throw new SchedulingError("range_capacity_exceeded")
    assertAvailable(projectAvailability(series, input.date, input.date), { ...input, end })
    const [collision] = await tx
      .select({ id: appointment.id })
      .from(appointment)
      .where(
        and(
          eq(appointment.organizationId, actor.organizationId),
          eq(appointment.professionalId, input.professionalId),
          notInArray(appointment.status, ["canceled", "no-show"]),
          sql`${appointment.startsAt} < ${endsAt} and ${appointment.endsAt} > ${startsAt}`,
          current ? ne(appointment.id, current.id) : undefined,
        ),
      )
      .limit(1)
    if (collision) throw new SchedulingError("appointment_conflict", "start")
    return {
      ...input,
      durationMinutes,
      priceCents,
      end,
      startsAt,
      endsAt,
      timezone,
      customerName: current?.clientId === input.clientId ? current.customerName : customer.name,
      unitName: current?.unitId === input.unitId ? current.unitName : location.name,
      professionalName: keepSnapshot ? current.professionalName : person.name,
      serviceName: keepSnapshot ? current.serviceName : offering.name,
    }
  }
  async function syncAppointmentOccupancy(tx: TransactionDatabase, row: Record) {
    if (["canceled", "no-show", "completed", "in-progress"].includes(row.status)) {
      await tx
        .delete(schedulingOccupancy)
        .where(
          and(
            eq(schedulingOccupancy.organizationId, row.organizationId),
            eq(schedulingOccupancy.source, "appointment"),
            eq(schedulingOccupancy.sourceId, row.id),
          ),
        )
      return
    }
    await tx
      .insert(schedulingOccupancy)
      .values({
        id: createId(),
        organizationId: row.organizationId,
        professionalId: row.professionalId,
        unitId: row.unitId,
        source: "appointment",
        sourceId: row.id,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        live: 0,
      })
      .onConflictDoUpdate({
        target: [
          schedulingOccupancy.organizationId,
          schedulingOccupancy.source,
          schedulingOccupancy.sourceId,
        ],
        set: {
          professionalId: row.professionalId,
          unitId: row.unitId,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
        },
      })
  }
  async function event(
    tx: TransactionDatabase,
    actor: Actor,
    row: Record,
    action: string,
    previous: Record | undefined,
    changedFields: string[],
  ) {
    await tx.insert(appointmentEvent).values({
      ...actor,
      id: createId(),
      appointmentId: row.id,
      action,
      fromStatus: previous?.status,
      toStatus: row.status,
      version: row.version,
      changedFields,
    })
  }
  async function create(actor: Actor, raw: unknown, key: string) {
    const input = appointmentInput.parse(raw)
    return command(actor, key, "create", input, async (tx) => {
      const values = await resolve(tx, actor, input)
      const [row] = await tx
        .insert(appointment)
        .values({ ...values, organizationId: actor.organizationId, id: createId() })
        .returning()
      await syncAppointmentOccupancy(tx, row)
      await event(tx, actor, row, "create", undefined, Object.keys(input))
      return row
    })
  }
  async function update(
    actor: Actor,
    id: string,
    raw: unknown,
    version: number,
    key: string,
    action: "edit" | "reschedule" = "edit",
  ) {
    const input = appointmentInput.parse(raw)
    return command(actor, key, action, { id, version, input }, async (tx) => {
      const current = await get(actor.organizationId, id, tx)
      if (current.version !== version) throw new SchedulingError("version_conflict")
      assertEditable(current.status)
      const values = await resolve(tx, actor, input, current)
      const [row] = await tx
        .update(appointment)
        .set({ ...values, version: version + 1, updatedAt: new Date() })
        .where(and(eq(appointment.organizationId, actor.organizationId), eq(appointment.id, id)))
        .returning()
      await syncAppointmentOccupancy(tx, row)
      await event(
        tx,
        actor,
        row,
        action,
        current,
        Object.keys(input).filter(
          (field) =>
            input[field as keyof AppointmentInput] !== current[field as keyof AppointmentInput],
        ),
      )
      return row
    })
  }
  async function changeStatus(
    actor: Actor,
    id: string,
    action: AppointmentCommand,
    raw: unknown,
    key: string,
  ) {
    const body = z
      .object({
        version: z.number().int().positive(),
        cancellationReason: z.enum(["client", "barbershop"]).optional(),
        cancellationNote: z.string().trim().max(500).optional(),
      })
      .strict()
      .parse(raw)
    if (action === "cancel" && !body.cancellationReason)
      throw new SchedulingError("invalid_request", "cancellationReason")
    return command(actor, key, action, { id, ...body }, async (tx) => {
      const current = await get(actor.organizationId, id, tx)
      if (current.version !== body.version) throw new SchedulingError("version_conflict")
      if (action === "no-show" && current.startsAt > new Date())
        throw new SchedulingError("invalid_transition")
      const [row] = await tx
        .update(appointment)
        .set({
          status: transition(current.status, action),
          version: current.version + 1,
          updatedAt: new Date(),
          ...(action === "cancel"
            ? {
                cancellationReason: body.cancellationReason,
                cancellationNote: body.cancellationNote ?? null,
              }
            : {}),
        })
        .where(eq(appointment.id, id))
        .returning()
      await syncAppointmentOccupancy(tx, row)
      await event(
        tx,
        actor,
        row,
        action,
        current,
        action === "cancel" ? ["status", "cancellationReason", "cancellationNote"] : ["status"],
      )
      return row
    })
  }
  // This port is intentionally absent from REST. Fulfillment owns its future callers.
  async function transitionFromFulfillment(
    actor: Actor,
    id: string,
    status: "waiting" | "in-progress" | "completed",
    version: number,
    key: string,
  ) {
    return command(actor, key, "fulfillment", { id, status, version }, async (tx) => {
      const current = await get(actor.organizationId, id, tx)
      if (current.version !== version) throw new SchedulingError("version_conflict")
      const [row] = await tx
        .update(appointment)
        .set({
          status: trustedServiceTransition(current.status, status),
          version: version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(appointment.organizationId, actor.organizationId), eq(appointment.id, id)))
        .returning()
      await syncAppointmentOccupancy(tx, row)
      await event(tx, actor, row, "fulfillment", current, ["status"])
      return row
    })
  }
  async function transitionFromFulfillmentInTransaction(
    tx: TransactionDatabase,
    actor: Actor,
    id: string,
    status: "waiting" | "in-progress" | "completed" | "canceled",
    version: number,
  ) {
    const current = await get(actor.organizationId, id, tx)
    if (current.version !== version) throw new SchedulingError("version_conflict")
    const nextStatus =
      status === "canceled"
        ? current.status === "waiting" || current.status === "in-progress"
          ? "canceled"
          : (() => {
              throw new SchedulingError("invalid_transition")
            })()
        : trustedServiceTransition(current.status, status)
    const [row] = await tx
      .update(appointment)
      .set({ status: nextStatus, version: version + 1, updatedAt: new Date() })
      .where(and(eq(appointment.organizationId, actor.organizationId), eq(appointment.id, id)))
      .returning()
    await syncAppointmentOccupancy(tx, row)
    await event(tx, actor, row, "fulfillment", current, ["status"])
    return row
  }
  async function units(organizationId: string, search = "") {
    return db
      .select({ id: unit.id, name: unit.name, timezone: unit.timezone, version: unit.version })
      .from(unit)
      .where(
        and(
          eq(unit.organizationId, organizationId),
          eq(unit.status, "active"),
          search ? ilike(unit.name, `%${search.replace(/[\\%_]/g, "\\$&")}%`) : undefined,
        ),
      )
      .orderBy(asc(unit.name), asc(unit.id))
      .limit(50)
  }
  async function options(
    organizationId: string,
    unitId: string,
    filters: {
      professionalSearch?: string
      serviceSearch?: string
      professionalId?: string
      serviceId?: string
    } = {},
  ) {
    const people = await db
      .select({ id: professional.id, name: user.name })
      .from(professional)
      .innerJoin(user, eq(user.id, professional.globalUserId))
      .innerJoin(
        member,
        and(eq(member.organizationId, professional.organizationId), eq(member.userId, user.id)),
      )
      .innerJoin(
        professionalUnit,
        and(
          eq(professionalUnit.organizationId, professional.organizationId),
          eq(professionalUnit.professionalId, professional.id),
        ),
      )
      .where(
        and(
          eq(professional.organizationId, organizationId),
          eq(professionalUnit.unitId, unitId),
          eq(professional.status, "active"),
          eq(user.status, "active"),
          eq(member.status, "active"),
          filters.professionalSearch
            ? or(
                ilike(user.name, `%${filters.professionalSearch.replace(/[\\%_]/g, "\\$&")}%`),
                filters.professionalId ? eq(professional.id, filters.professionalId) : undefined,
              )
            : undefined,
        ),
      )
      .orderBy(
        sql`case when ${professional.id} = ${filters.professionalId ?? ""} then 0 else 1 end`,
        asc(user.name),
        asc(professional.id),
      )
      .limit(50)
    const offerings = await db
      .select({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
      })
      .from(service)
      .innerJoin(
        serviceUnit,
        and(
          eq(serviceUnit.organizationId, service.organizationId),
          eq(serviceUnit.serviceId, service.id),
        ),
      )
      .where(
        and(
          eq(service.organizationId, organizationId),
          eq(serviceUnit.unitId, unitId),
          eq(service.status, "active"),
          filters.serviceSearch
            ? or(
                ilike(service.name, `%${filters.serviceSearch.replace(/[\\%_]/g, "\\$&")}%`),
                filters.serviceId ? eq(service.id, filters.serviceId) : undefined,
              )
            : undefined,
        ),
      )
      .orderBy(
        sql`case when ${service.id} = ${filters.serviceId ?? ""} then 0 else 1 end`,
        asc(service.name),
        asc(service.id),
      )
      .limit(50)
    const assignments =
      offerings.length && people.length
        ? await db
            .select()
            .from(professionalService)
            .where(
              and(
                eq(professionalService.organizationId, organizationId),
                inArray(
                  professionalService.serviceId,
                  offerings.map((item) => item.id),
                ),
                inArray(
                  professionalService.professionalId,
                  people.map((item) => item.id),
                ),
              ),
            )
        : []
    return {
      professionals: people,
      services: offerings.map((item) => ({
        ...item,
        eligibleProfessionalIds: assignments
          .filter((pair) => pair.serviceId === item.id)
          .map((pair) => pair.professionalId),
      })),
    }
  }
  async function range(organizationId: string, raw: unknown) {
    const query = rangeQuery.parse(raw)
    dateRange(query.startDate, query.endDate, 7)
    const [location] = await db
      .select()
      .from(unit)
      .where(
        and(
          eq(unit.organizationId, organizationId),
          eq(unit.id, query.unitId),
          eq(unit.status, "active"),
        ),
      )
    if (!location) throw new SchedulingError("not_found")
    const [rows, visible, catalog, series] = await Promise.all([
      db
        .select({
          id: appointment.id,
          date: appointment.date,
          start: appointment.start,
          durationMinutes: appointment.durationMinutes,
          professionalId: appointment.professionalId,
        })
        .from(appointment)
        .where(
          and(
            predicates(organizationId, query, false),
            notInArray(appointment.status, ["canceled", "no-show"]),
          ),
        )
        .limit(2001),
      db
        .select()
        .from(appointment)
        .where(predicates(organizationId, query))
        .orderBy(asc(appointment.date), asc(appointment.start), asc(appointment.id))
        .limit(2001),
      options(organizationId, query.unitId),
      readSeries(db, organizationId, query.unitId, query.startDate, query.endDate),
    ])
    if (rows.length > 2000 || visible.length > 2000 || series.length > 2000)
      throw new SchedulingError("range_capacity_exceeded")
    const periods = location.openingPeriods.length
      ? location.openingPeriods
      : [{ days: location.openingDays, start: location.openingStart, end: location.openingEnd }]
    const occurrences = projectAvailability(series, query.startDate, query.endDate).flatMap(
      (item) => {
        if (item.kind !== "available") return [item]
        if (
          !location.timezone ||
          !catalog.professionals.some((person) => person.id === item.professionalId)
        )
          return []
        return periods
          .filter((period) => period.days.includes(weekday(item.date)))
          .flatMap((period) => {
            const start = item.start > period.start ? item.start : period.start
            const end = item.end < period.end ? item.end : period.end
            if (start >= end) return []
            try {
              toInstant(item.date, start, location.timezone as string)
              toInstant(item.date, end, location.timezone as string)
              return [{ ...item, id: `${item.id}:${start}`, start, end }]
            } catch (error) {
              if (error instanceof SchedulingError) return []
              throw error
            }
          })
      },
    )
    const boardProfessionals = [
      ...new Map([
        ...visible.map(
          (item) =>
            [
              item.professionalId,
              { id: item.professionalId, name: item.professionalName },
            ] as const,
        ),
        ...catalog.professionals.map((item) => [item.id, item] as const),
      ]).values(),
    ]
    return {
      appointments: visible,
      occupancies: rows.map((row, index) => ({ ...row, id: `occupied-${index}` })),
      availability: occurrences,
      periods: occurrences
        .filter((item) => item.kind !== "available")
        .map((item) => ({
          ...item,
          label:
            item.kind === "break" ? "Intervalo" : item.kind === "absence" ? "Ausência" : "Bloqueio",
        })),
      professionals: boardProfessionals.filter(
        (item) =>
          !list(query.professionalIds).length || list(query.professionalIds).includes(item.id),
      ),
      professionalOptions: catalog.professionals,
      services: catalog.services,
      date: query.startDate,
      timezone: location.timezone,
      unitName: location.name,
      startTime: periods.map((item) => item.start).sort()[0] ?? "00:00",
      endTime:
        periods
          .map((item) => item.end)
          .sort()
          .at(-1) ?? "00:00",
    }
  }
  async function page(organizationId: string, raw: unknown) {
    const query = rangeQuery.parse(raw)
    dateRange(query.startDate, query.endDate, 366)
    const [location] = await db
      .select({ id: unit.id })
      .from(unit)
      .where(
        and(
          eq(unit.organizationId, organizationId),
          eq(unit.id, query.unitId),
          eq(unit.status, "active"),
        ),
      )
    if (!location) throw new SchedulingError("not_found")
    const order = query.sortDirection === "desc" ? desc : asc
    const [items, totals] = await Promise.all([
      db
        .select()
        .from(appointment)
        .where(predicates(organizationId, query))
        .orderBy(order(appointment.date), order(appointment.start), order(appointment.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(appointment).where(predicates(organizationId, query)),
    ])
    return {
      items,
      totalCount: totals[0].value,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(totals[0].value / query.pageSize)),
    }
  }
  async function clientHistory(organizationId: string, clientId: string, page = 1) {
    const [customer] = await db
      .select({ id: client.id })
      .from(client)
      .where(and(eq(client.organizationId, organizationId), eq(client.id, clientId)))
    if (!customer) throw new SchedulingError("not_found")
    const items = await db
      .select()
      .from(appointment)
      .where(
        and(eq(appointment.organizationId, organizationId), eq(appointment.clientId, clientId)),
      )
      .orderBy(desc(appointment.startsAt), desc(appointment.id))
      .limit(20)
      .offset((page - 1) * 20)
    const [next] = await db
      .select()
      .from(appointment)
      .where(
        and(
          eq(appointment.organizationId, organizationId),
          eq(appointment.clientId, clientId),
          gte(appointment.startsAt, new Date()),
          inArray(appointment.status, ["scheduled", "confirmed", "arrived"]),
        ),
      )
      .orderBy(asc(appointment.startsAt))
      .limit(1)
    return { items, nextAppointment: next ?? null, lastVisitAt: null }
  }
  async function professionalSchedule(
    organizationId: string,
    professionalId: string,
    date: string,
  ) {
    const [person] = await db
      .select({ id: professional.id })
      .from(professional)
      .where(
        and(eq(professional.organizationId, organizationId), eq(professional.id, professionalId)),
      )
    if (!person) throw new SchedulingError("not_found")
    return db
      .select()
      .from(appointment)
      .where(
        and(
          eq(appointment.organizationId, organizationId),
          eq(appointment.professionalId, professionalId),
          gte(appointment.date, date),
          gte(appointment.startsAt, new Date()),
          lte(appointment.date, addDate(date, 30)),
          notInArray(appointment.status, ["canceled", "no-show"]),
        ),
      )
      .orderBy(asc(appointment.startsAt), asc(appointment.id))
      .limit(20)
  }
  return {
    create,
    update,
    changeStatus,
    detail,
    range,
    page,
    units,
    options,
    clientHistory,
    professionalSchedule,
    transitionFromFulfillment,
    transitionFromFulfillmentInTransaction,
  }
}
export type SchedulingService = ReturnType<typeof createSchedulingService>
