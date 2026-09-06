import { createHmac } from "node:crypto"
import { and, asc, count, desc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm"
import { z } from "zod"
import { lockSchedule, readSeries } from "../../availability/application/availability-service.js"
import type { TransactionDatabase } from "../../availability/database/catalog-context.js"
import { assertAvailable, projectAvailability } from "../../availability/domain/availability.js"
import { weekday } from "../../availability/domain/time.js"
import { client } from "../../clients/database/schema.js"
import type { IdpDatabase } from "../../idp/database/client.js"
import { user } from "../../idp/database/schema.js"
import { professional, professionalUnit } from "../../professionals/database/schema.js"
import type { SchedulingService } from "../../scheduling/application/scheduling-service.js"
import { appointment, schedulingOccupancy } from "../../scheduling/database/schema.js"
import { professionalService, service, serviceUnit } from "../../services/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import { unit } from "../../units/database/schema.js"
import {
  type CompletedServiceHandoff,
  serviceDeskCommand,
  serviceDeskEvent,
  serviceDeskHandoff,
  serviceDeskItem,
  serviceDeskVisit,
} from "../database/schema.js"
import { ServiceDeskError } from "../domain/errors.js"

type Actor = { organizationId: string; actorUserId: string }
type Visit = typeof serviceDeskVisit.$inferSelect
const commandSchema = z
  .object({ expectedVersion: z.number().int().positive(), idempotencyKey: z.uuid() })
  .strict()
const reason = z.string().trim().min(3).max(160)
const notes = z.string().max(500)
const phone = z
  .string()
  .transform((value, context) => {
    const digits = value.replace(/\D/g, "")
    if (digits && !/^(?:55)?[1-9]{2}9?\d{8}$/.test(digits))
      context.addIssue({ code: "custom", message: "invalid phone" })
    return digits || undefined
  })
  .optional()

export const walkInInput = z
  .object({
    unitId: z.string().min(1),
    clientId: z.string().min(1).optional(),
    guestName: z.string().trim().min(2).max(100).optional(),
    guestPhone: phone,
    serviceId: z.string().min(1),
    professionalId: z.string().min(1).optional(),
    priority: z.enum(["normal", "fit-in"]).default("normal"),
    arrivedAt: z.coerce.date().optional(),
    submittedLocalArrival: z.string().max(32).optional(),
    notes: notes.default(""),
    idempotencyKey: z.uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Boolean(value.clientId) === Boolean(value.guestName))
      context.addIssue({ code: "custom", path: ["guestName"], message: "choose one identity" })
    if (value.arrivedAt && value.arrivedAt.getTime() > Date.now())
      context.addIssue({ code: "custom", path: ["arrivedAt"], message: "future arrival" })
  })

export function createServiceDeskService(
  db: IdpDatabase,
  scheduling: SchedulingService,
  fingerprintSecret: string,
) {
  async function get(organizationId: string, id: string, tx: TransactionDatabase = db) {
    const [row] = await tx
      .select()
      .from(serviceDeskVisit)
      .where(and(eq(serviceDeskVisit.organizationId, organizationId), eq(serviceDeskVisit.id, id)))
      .for("update")
    if (!row) throw new ServiceDeskError("not_found")
    return row
  }
  async function appendEvent(
    tx: TransactionDatabase,
    actor: Actor,
    row: Visit,
    action: string,
    changedFields: string[],
  ) {
    await tx.insert(serviceDeskEvent).values({
      id: createId(),
      organizationId: actor.organizationId,
      visitId: row.id,
      actorUserId: actor.actorUserId,
      action,
      changedFields,
      version: row.version,
    })
  }
  async function execute(
    actor: Actor,
    key: string,
    action: string,
    input: unknown,
    operation: (tx: TransactionDatabase) => Promise<Visit>,
  ) {
    z.uuid().parse(key)
    const fingerprint = createHmac("sha256", fingerprintSecret)
      .update(JSON.stringify({ action, input }))
      .digest("hex")
    try {
      return await db.transaction(async (tx) => {
        await lockSchedule(tx, actor.organizationId)
        const [receipt] = await tx
          .select()
          .from(serviceDeskCommand)
          .where(
            and(
              eq(serviceDeskCommand.organizationId, actor.organizationId),
              eq(serviceDeskCommand.actorUserId, actor.actorUserId),
              eq(serviceDeskCommand.key, key),
            ),
          )
        if (receipt) {
          if (receipt.fingerprint !== fingerprint)
            throw new ServiceDeskError("idempotency_conflict")
          return get(actor.organizationId, receipt.resourceId, tx)
        }
        const row = await operation(tx)
        await tx.insert(serviceDeskCommand).values({
          id: createId(),
          organizationId: actor.organizationId,
          actorUserId: actor.actorUserId,
          key,
          fingerprint,
          action,
          resourceId: row.id,
          resourceVersion: row.version,
        })
        return row
      })
    } catch (error) {
      let cause: unknown = error
      for (let depth = 0; depth < 5 && cause && typeof cause === "object"; depth++) {
        const value = cause as { code?: string; constraint?: string; cause?: unknown }
        if (value.code === "23P01" || value.constraint?.includes("occup"))
          throw new ServiceDeskError("professional_occupied", "professionalId")
        if (value.code === "23505" && value.constraint?.includes("appointment"))
          throw new ServiceDeskError("active_dependency")
        cause = value.cause
      }
      throw error
    }
  }
  async function resolveCatalog(
    tx: TransactionDatabase,
    organizationId: string,
    unitId: string,
    serviceId: string,
    professionalId?: string,
  ) {
    const [location] = await tx
      .select({
        id: unit.id,
        name: unit.name,
        timezone: unit.timezone,
        openingDays: unit.openingDays,
        openingStart: unit.openingStart,
        openingEnd: unit.openingEnd,
        openingPeriods: unit.openingPeriods,
      })
      .from(unit)
      .where(
        and(
          eq(unit.organizationId, organizationId),
          eq(unit.id, unitId),
          eq(unit.status, "active"),
        ),
      )
      .for("share")
    if (!location?.timezone) throw new ServiceDeskError("invalid_relation", "unitId")
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
          eq(serviceUnit.unitId, unitId),
        ),
      )
      .where(
        and(
          eq(service.organizationId, organizationId),
          eq(service.id, serviceId),
          eq(service.status, "active"),
        ),
      )
      .for("share")
    if (!offering) throw new ServiceDeskError("invalid_relation", "serviceId")
    let person: { id: string; name: string } | undefined
    if (professionalId) {
      ;[person] = await tx
        .select({ id: professional.id, name: user.name })
        .from(professional)
        .innerJoin(user, eq(user.id, professional.globalUserId))
        .innerJoin(
          professionalUnit,
          and(
            eq(professionalUnit.organizationId, professional.organizationId),
            eq(professionalUnit.professionalId, professional.id),
            eq(professionalUnit.unitId, unitId),
          ),
        )
        .innerJoin(
          professionalService,
          and(
            eq(professionalService.organizationId, professional.organizationId),
            eq(professionalService.professionalId, professional.id),
            eq(professionalService.serviceId, serviceId),
          ),
        )
        .where(
          and(
            eq(professional.organizationId, organizationId),
            eq(professional.id, professionalId),
            eq(professional.status, "active"),
          ),
        )
        .for("share")
      if (!person) throw new ServiceDeskError("invalid_relation", "professionalId")
    }
    return { location, offering, person }
  }
  function localDateTime(value: Date, timezone: string) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(value)
        .map(({ type, value: part }) => [type, part]),
    )
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${parts.hour}:${parts.minute}`,
    }
  }
  async function assertServiceAvailability(
    tx: TransactionDatabase,
    organizationId: string,
    catalog: Awaited<ReturnType<typeof resolveCatalog>>,
    professionalId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const start = localDateTime(startsAt, catalog.location.timezone as string)
    const end = localDateTime(endsAt, catalog.location.timezone as string)
    if (start.date !== end.date) throw new ServiceDeskError("invalid_relation", "professionalId")
    const periods = catalog.location.openingPeriods.length
      ? catalog.location.openingPeriods
      : [
          {
            days: catalog.location.openingDays,
            start: catalog.location.openingStart,
            end: catalog.location.openingEnd,
          },
        ]
    if (
      !periods.some(
        (period) =>
          period.days.includes(weekday(start.date)) &&
          period.start <= start.time &&
          period.end >= end.time,
      )
    )
      throw new ServiceDeskError("invalid_relation", "professionalId")
    const series = await readSeries(tx, organizationId, catalog.location.id, start.date, start.date)
    try {
      assertAvailable(projectAvailability(series, start.date, start.date), {
        date: start.date,
        start: start.time,
        end: end.time,
        professionalId,
        unitId: catalog.location.id,
      })
    } catch {
      throw new ServiceDeskError("invalid_relation", "professionalId")
    }
  }
  async function admitWalkIn(actor: Actor, raw: unknown) {
    const input = walkInInput.parse(raw)
    return execute(actor, input.idempotencyKey, "admit_walk_in", input, async (tx) => {
      const catalog = await resolveCatalog(
        tx,
        actor.organizationId,
        input.unitId,
        input.serviceId,
        input.professionalId,
      )
      let customerName = input.guestName
      if (input.clientId) {
        const [customer] = await tx
          .select({ name: client.name })
          .from(client)
          .where(
            and(
              eq(client.organizationId, actor.organizationId),
              eq(client.id, input.clientId),
              eq(client.status, "active"),
            ),
          )
          .for("share")
        if (!customer) throw new ServiceDeskError("invalid_relation", "clientId")
        customerName = customer.name
      }
      if (!customerName) throw new ServiceDeskError("invalid_request", "guestName")
      const timezone = catalog.location.timezone
      if (!timezone) throw new ServiceDeskError("invalid_relation", "unitId")
      const [row] = await tx
        .insert(serviceDeskVisit)
        .values({
          id: createId(),
          organizationId: actor.organizationId,
          unitId: input.unitId,
          clientId: input.clientId,
          source: "walk-in",
          status: "waiting",
          customerDisplayName: customerName,
          guestPhone: input.clientId ? null : input.guestPhone,
          unitName: catalog.location.name,
          timezone,
          priority: input.priority,
          requestedServiceId: input.serviceId,
          requestedProfessionalId: input.professionalId,
          arrivedAt: input.arrivedAt ?? new Date(),
          submittedLocalArrival: input.submittedLocalArrival,
          notes: input.notes,
        })
        .returning()
      await appendEvent(tx, actor, row, "admit_walk_in", ["status"])
      return row
    })
  }
  async function admitScheduled(actor: Actor, appointmentId: string, raw: unknown) {
    const input = z
      .object({ appointmentVersion: z.number().int().positive(), idempotencyKey: z.uuid() })
      .strict()
      .parse(raw)
    return execute(
      actor,
      input.idempotencyKey,
      "admit_scheduled",
      { appointmentId, ...input },
      async (tx) => {
        const [booking] = await tx
          .select()
          .from(appointment)
          .where(
            and(
              eq(appointment.organizationId, actor.organizationId),
              eq(appointment.id, appointmentId),
            ),
          )
          .for("update")
        if (!booking) throw new ServiceDeskError("not_found")
        if (booking.status !== "arrived") throw new ServiceDeskError("invalid_transition")
        const [row] = await tx
          .insert(serviceDeskVisit)
          .values({
            id: createId(),
            organizationId: actor.organizationId,
            unitId: booking.unitId,
            appointmentId,
            clientId: booking.clientId,
            source: "scheduled",
            status: "waiting",
            customerDisplayName: booking.customerName,
            unitName: booking.unitName,
            timezone: booking.timezone,
            requestedServiceId: booking.serviceId,
            requestedProfessionalId: booking.professionalId,
            arrivedAt: new Date(),
          })
          .returning()
        await scheduling.transitionFromFulfillmentInTransaction(
          tx,
          actor,
          appointmentId,
          "waiting",
          input.appointmentVersion,
        )
        await appendEvent(tx, actor, row, "admit_scheduled", ["status"])
        return row
      },
    )
  }
  async function transition(
    actor: Actor,
    id: string,
    action: "call" | "return_to_waiting" | "cancel",
    raw: unknown,
  ) {
    const input = commandSchema.extend({ reason: reason.optional() }).strict().parse(raw)
    return execute(actor, input.idempotencyKey, action, { id, ...input }, async (tx) => {
      const current = await get(actor.organizationId, id, tx)
      if (current.version !== input.expectedVersion) throw new ServiceDeskError("version_conflict")
      const status =
        action === "call" && current.status === "waiting"
          ? "called"
          : action === "return_to_waiting" && current.status === "called"
            ? "waiting"
            : action === "cancel" && ["waiting", "called"].includes(current.status) && input.reason
              ? "canceled"
              : undefined
      if (!status) throw new ServiceDeskError("invalid_transition")
      const [row] = await tx
        .update(serviceDeskVisit)
        .set({
          status,
          closureReason: action === "cancel" ? input.reason : null,
          calledAt: action === "call" ? new Date() : current.calledAt,
          version: current.version + 1,
          updatedAt: new Date(),
          ...(status === "canceled" ? { finishedAt: new Date() } : {}),
        })
        .where(
          and(
            eq(serviceDeskVisit.organizationId, actor.organizationId),
            eq(serviceDeskVisit.id, id),
          ),
        )
        .returning()
      if (current.appointmentId && status === "canceled") {
        const [booking] = await tx
          .select()
          .from(appointment)
          .where(
            and(
              eq(appointment.organizationId, actor.organizationId),
              eq(appointment.id, current.appointmentId),
            ),
          )
          .for("update")
        if (booking)
          await scheduling.transitionFromFulfillmentInTransaction(
            tx,
            actor,
            booking.id,
            "canceled",
            booking.version,
          )
      }
      await appendEvent(tx, actor, row, action, ["status"])
      return row
    })
  }
  async function addItem(actor: Actor, id: string, raw: unknown) {
    const input = commandSchema
      .extend({ serviceId: z.string().min(1), professionalId: z.string().min(1).optional() })
      .strict()
      .parse(raw)
    return execute(actor, input.idempotencyKey, "add_item", { id, ...input }, async (tx) => {
      const current = await get(actor.organizationId, id, tx)
      if (current.version !== input.expectedVersion) throw new ServiceDeskError("version_conflict")
      if (current.status !== "in-service") throw new ServiceDeskError("invalid_transition")
      const [{ value }] = await tx
        .select({ value: count() })
        .from(serviceDeskItem)
        .where(
          and(
            eq(serviceDeskItem.organizationId, actor.organizationId),
            eq(serviceDeskItem.visitId, id),
          ),
        )
      if (value >= 20) throw new ServiceDeskError("item_limit")
      const catalog = await resolveCatalog(
        tx,
        actor.organizationId,
        current.unitId,
        input.serviceId,
        input.professionalId,
      )
      await tx.insert(serviceDeskItem).values({
        id: createId(),
        organizationId: actor.organizationId,
        visitId: id,
        serviceId: catalog.offering.id,
        professionalId: catalog.person?.id,
        serviceName: catalog.offering.name,
        professionalName: catalog.person?.name,
        durationMinutes: catalog.offering.durationMinutes,
        priceCents: catalog.offering.priceCents,
        sequence: value + 1,
      })
      const [row] = await tx
        .update(serviceDeskVisit)
        .set({ version: current.version + 1, updatedAt: new Date() })
        .where(eq(serviceDeskVisit.id, id))
        .returning()
      await appendEvent(tx, actor, row, "add_item", ["items"])
      return row
    })
  }
  async function start(actor: Actor, id: string, raw: unknown) {
    const input = commandSchema
      .extend({ professionalId: z.string().min(1), itemId: z.string().min(1).optional() })
      .strict()
      .parse(raw)
    return execute(actor, input.idempotencyKey, "start", { id, ...input }, async (tx) => {
      const current = await get(actor.organizationId, id, tx)
      if (current.version !== input.expectedVersion) throw new ServiceDeskError("version_conflict")
      if (!input.itemId && current.status !== "called")
        throw new ServiceDeskError("invalid_transition")
      if (input.itemId && current.status !== "in-service")
        throw new ServiceDeskError("invalid_transition")
      const [pendingItem] = input.itemId
        ? await tx
            .select()
            .from(serviceDeskItem)
            .where(
              and(
                eq(serviceDeskItem.organizationId, actor.organizationId),
                eq(serviceDeskItem.visitId, id),
                eq(serviceDeskItem.id, input.itemId),
                eq(serviceDeskItem.status, "pending"),
              ),
            )
            .for("update")
        : []
      if (input.itemId && !pendingItem) throw new ServiceDeskError("invalid_transition")
      const [activeItem] = await tx
        .select({ id: serviceDeskItem.id })
        .from(serviceDeskItem)
        .where(
          and(
            eq(serviceDeskItem.organizationId, actor.organizationId),
            eq(serviceDeskItem.visitId, id),
            eq(serviceDeskItem.status, "active"),
          ),
        )
        .limit(1)
      if (activeItem) throw new ServiceDeskError("active_dependency")
      const catalog = await resolveCatalog(
        tx,
        actor.organizationId,
        current.unitId,
        pendingItem?.serviceId ?? current.requestedServiceId,
        input.professionalId,
      )
      const person = catalog.person
      if (!person) throw new ServiceDeskError("invalid_relation", "professionalId")
      const [bookingSnapshot] = current.appointmentId
        ? await tx.select().from(appointment).where(eq(appointment.id, current.appointmentId))
        : []
      const now = new Date()
      const plannedEndAt = new Date(
        now.getTime() +
          (pendingItem?.durationMinutes ??
            bookingSnapshot?.durationMinutes ??
            catalog.offering.durationMinutes) *
            60000,
      )
      await assertServiceAvailability(
        tx,
        actor.organizationId,
        catalog,
        input.professionalId,
        now,
        plannedEndAt,
      )
      const [collision] = await tx
        .select({ id: schedulingOccupancy.id })
        .from(schedulingOccupancy)
        .where(
          and(
            eq(schedulingOccupancy.organizationId, actor.organizationId),
            eq(schedulingOccupancy.professionalId, input.professionalId),
            lt(schedulingOccupancy.startsAt, plannedEndAt),
            sql`${schedulingOccupancy.endsAt} > ${now}`,
            current.appointmentId
              ? ne(schedulingOccupancy.sourceId, current.appointmentId)
              : undefined,
          ),
        )
        .limit(1)
      if (collision) throw new ServiceDeskError("professional_occupied", "professionalId")
      let [item] = pendingItem
        ? [pendingItem]
        : await tx
            .select()
            .from(serviceDeskItem)
            .where(
              and(
                eq(serviceDeskItem.organizationId, actor.organizationId),
                eq(serviceDeskItem.visitId, id),
              ),
            )
            .orderBy(asc(serviceDeskItem.sequence))
            .limit(1)
            .for("update")
      if (!item)
        [item] = await tx
          .insert(serviceDeskItem)
          .values({
            id: createId(),
            organizationId: actor.organizationId,
            visitId: id,
            serviceId: catalog.offering.id,
            professionalId: input.professionalId,
            serviceName: bookingSnapshot?.serviceName ?? catalog.offering.name,
            professionalName: person.name,
            durationMinutes: bookingSnapshot?.durationMinutes ?? catalog.offering.durationMinutes,
            priceCents: bookingSnapshot?.priceCents ?? catalog.offering.priceCents,
            sequence: 1,
          })
          .returning()
      await tx
        .update(serviceDeskItem)
        .set({
          status: "active",
          professionalId: input.professionalId,
          professionalName: person.name,
          startedAt: now,
          plannedEndAt,
          updatedAt: now,
        })
        .where(eq(serviceDeskItem.id, item.id))
      if (current.appointmentId && current.status === "called")
        await tx
          .delete(schedulingOccupancy)
          .where(
            and(
              eq(schedulingOccupancy.organizationId, actor.organizationId),
              eq(schedulingOccupancy.source, "appointment"),
              eq(schedulingOccupancy.sourceId, current.appointmentId),
            ),
          )
      await tx.insert(schedulingOccupancy).values({
        id: createId(),
        organizationId: actor.organizationId,
        unitId: current.unitId,
        professionalId: input.professionalId,
        source: "service",
        sourceId: item.id,
        startsAt: now,
        endsAt: plannedEndAt,
        live: 1,
      })
      if (current.appointmentId && current.status === "called") {
        const [booking] = await tx
          .select()
          .from(appointment)
          .where(eq(appointment.id, current.appointmentId))
          .for("update")
        if (booking)
          await scheduling.transitionFromFulfillmentInTransaction(
            tx,
            actor,
            booking.id,
            "in-progress",
            booking.version,
          )
      }
      const [row] = await tx
        .update(serviceDeskVisit)
        .set({ status: "in-service", startedAt: now, version: current.version + 1, updatedAt: now })
        .where(eq(serviceDeskVisit.id, id))
        .returning()
      await appendEvent(tx, actor, row, "start", ["status", "items"])
      return row
    })
  }
  async function finishItem(actor: Actor, id: string, itemId: string, raw: unknown) {
    const input = commandSchema.strict().parse(raw)
    return execute(
      actor,
      input.idempotencyKey,
      "finish_item",
      { id, itemId, ...input },
      async (tx) => {
        const current = await get(actor.organizationId, id, tx)
        if (current.version !== input.expectedVersion)
          throw new ServiceDeskError("version_conflict")
        const [item] = await tx
          .select()
          .from(serviceDeskItem)
          .where(
            and(
              eq(serviceDeskItem.organizationId, actor.organizationId),
              eq(serviceDeskItem.visitId, id),
              eq(serviceDeskItem.id, itemId),
            ),
          )
          .for("update")
        if (item?.status !== "active") throw new ServiceDeskError("invalid_transition")
        const now = new Date()
        await tx
          .update(serviceDeskItem)
          .set({ status: "completed", finishedAt: now, updatedAt: now })
          .where(eq(serviceDeskItem.id, itemId))
        await tx
          .delete(schedulingOccupancy)
          .where(
            and(
              eq(schedulingOccupancy.organizationId, actor.organizationId),
              eq(schedulingOccupancy.source, "service"),
              eq(schedulingOccupancy.sourceId, itemId),
            ),
          )
        const [row] = await tx
          .update(serviceDeskVisit)
          .set({ version: current.version + 1, updatedAt: now })
          .where(eq(serviceDeskVisit.id, id))
          .returning()
        await appendEvent(tx, actor, row, "finish_item", ["items"])
        return row
      },
    )
  }
  async function updateNotes(actor: Actor, id: string, raw: unknown) {
    const input = commandSchema.extend({ notes }).strict().parse(raw)
    return execute(actor, input.idempotencyKey, "update_notes", { id, ...input }, async (tx) => {
      const current = await get(actor.organizationId, id, tx)
      if (current.version !== input.expectedVersion) throw new ServiceDeskError("version_conflict")
      if (["completed", "canceled"].includes(current.status))
        throw new ServiceDeskError("invalid_transition")
      const [row] = await tx
        .update(serviceDeskVisit)
        .set({ notes: input.notes, version: current.version + 1, updatedAt: new Date() })
        .where(
          and(
            eq(serviceDeskVisit.organizationId, actor.organizationId),
            eq(serviceDeskVisit.id, id),
          ),
        )
        .returning()
      await appendEvent(tx, actor, row, "update_notes", ["notes"])
      return row
    })
  }
  async function removeItem(actor: Actor, id: string, itemId: string, raw: unknown) {
    const input = commandSchema.strict().parse(raw)
    return execute(
      actor,
      input.idempotencyKey,
      "remove_item",
      { id, itemId, ...input },
      async (tx) => {
        const current = await get(actor.organizationId, id, tx)
        if (current.version !== input.expectedVersion)
          throw new ServiceDeskError("version_conflict")
        const [item] = await tx
          .select()
          .from(serviceDeskItem)
          .where(
            and(
              eq(serviceDeskItem.organizationId, actor.organizationId),
              eq(serviceDeskItem.visitId, id),
              eq(serviceDeskItem.id, itemId),
            ),
          )
          .for("update")
        if (item?.status !== "pending") throw new ServiceDeskError("invalid_transition")
        await tx
          .update(serviceDeskItem)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(serviceDeskItem.id, itemId))
        const [row] = await tx
          .update(serviceDeskVisit)
          .set({ version: current.version + 1, updatedAt: new Date() })
          .where(eq(serviceDeskVisit.id, id))
          .returning()
        await appendEvent(tx, actor, row, "remove_item", ["items"])
        return row
      },
    )
  }
  async function assignItem(actor: Actor, id: string, itemId: string, raw: unknown) {
    const input = commandSchema
      .extend({ professionalId: z.string().min(1) })
      .strict()
      .parse(raw)
    return execute(
      actor,
      input.idempotencyKey,
      "assign_item",
      { id, itemId, ...input },
      async (tx) => {
        const current = await get(actor.organizationId, id, tx)
        if (current.version !== input.expectedVersion)
          throw new ServiceDeskError("version_conflict")
        const [item] = await tx
          .select()
          .from(serviceDeskItem)
          .where(
            and(
              eq(serviceDeskItem.organizationId, actor.organizationId),
              eq(serviceDeskItem.visitId, id),
              eq(serviceDeskItem.id, itemId),
            ),
          )
          .for("update")
        if (item?.status !== "pending") throw new ServiceDeskError("invalid_transition")
        const catalog = await resolveCatalog(
          tx,
          actor.organizationId,
          current.unitId,
          item.serviceId,
          input.professionalId,
        )
        if (!catalog.person) throw new ServiceDeskError("invalid_relation", "professionalId")
        await tx
          .update(serviceDeskItem)
          .set({
            professionalId: input.professionalId,
            professionalName: catalog.person.name,
            updatedAt: new Date(),
          })
          .where(eq(serviceDeskItem.id, itemId))
        const [row] = await tx
          .update(serviceDeskVisit)
          .set({ version: current.version + 1, updatedAt: new Date() })
          .where(eq(serviceDeskVisit.id, id))
          .returning()
        await appendEvent(tx, actor, row, "assign_item", ["items"])
        return row
      },
    )
  }
  async function extendItem(actor: Actor, id: string, itemId: string, raw: unknown) {
    const input = commandSchema
      .extend({ minutes: z.number().int().positive().multipleOf(15).max(240) })
      .strict()
      .parse(raw)
    return execute(
      actor,
      input.idempotencyKey,
      "extend_item",
      { id, itemId, ...input },
      async (tx) => {
        const current = await get(actor.organizationId, id, tx)
        if (current.version !== input.expectedVersion)
          throw new ServiceDeskError("version_conflict")
        const [item] = await tx
          .select()
          .from(serviceDeskItem)
          .where(
            and(
              eq(serviceDeskItem.organizationId, actor.organizationId),
              eq(serviceDeskItem.visitId, id),
              eq(serviceDeskItem.id, itemId),
            ),
          )
          .for("update")
        if (item?.status !== "active" || !item.plannedEndAt)
          throw new ServiceDeskError("invalid_transition")
        const plannedEndAt = new Date(item.plannedEndAt.getTime() + input.minutes * 60000)
        await tx
          .update(schedulingOccupancy)
          .set({ endsAt: plannedEndAt })
          .where(
            and(
              eq(schedulingOccupancy.organizationId, actor.organizationId),
              eq(schedulingOccupancy.source, "service"),
              eq(schedulingOccupancy.sourceId, itemId),
            ),
          )
        await tx
          .update(serviceDeskItem)
          .set({ plannedEndAt, updatedAt: new Date() })
          .where(eq(serviceDeskItem.id, itemId))
        const [row] = await tx
          .update(serviceDeskVisit)
          .set({ version: current.version + 1, updatedAt: new Date() })
          .where(eq(serviceDeskVisit.id, id))
          .returning()
        await appendEvent(tx, actor, row, "extend_item", ["items"])
        return row
      },
    )
  }
  async function interrupt(actor: Actor, id: string, raw: unknown) {
    const input = commandSchema.extend({ reason }).strict().parse(raw)
    return execute(actor, input.idempotencyKey, "interrupt", { id, ...input }, async (tx) => {
      const current = await get(actor.organizationId, id, tx)
      if (current.version !== input.expectedVersion) throw new ServiceDeskError("version_conflict")
      if (!["waiting", "called", "in-service"].includes(current.status))
        throw new ServiceDeskError("invalid_transition")
      const items = await tx
        .select()
        .from(serviceDeskItem)
        .where(
          and(
            eq(serviceDeskItem.organizationId, actor.organizationId),
            eq(serviceDeskItem.visitId, id),
          ),
        )
        .for("update")
      await tx
        .update(serviceDeskItem)
        .set({ status: "canceled", updatedAt: new Date() })
        .where(
          and(
            eq(serviceDeskItem.organizationId, actor.organizationId),
            eq(serviceDeskItem.visitId, id),
            inArray(serviceDeskItem.status, ["pending", "active"]),
          ),
        )
      if (items.length)
        await tx.delete(schedulingOccupancy).where(
          and(
            eq(schedulingOccupancy.organizationId, actor.organizationId),
            eq(schedulingOccupancy.source, "service"),
            inArray(
              schedulingOccupancy.sourceId,
              items.map((item) => item.id),
            ),
          ),
        )
      const performed = items.filter((item) => item.status === "completed")
      const now = new Date()
      const status = performed.length ? "completed" : "canceled"
      const version = current.version + 1
      const [row] = await tx
        .update(serviceDeskVisit)
        .set({ status, closureReason: input.reason, finishedAt: now, version, updatedAt: now })
        .where(eq(serviceDeskVisit.id, id))
        .returning()
      if (current.appointmentId) {
        const [booking] = await tx
          .select()
          .from(appointment)
          .where(eq(appointment.id, current.appointmentId))
          .for("update")
        if (booking)
          await scheduling.transitionFromFulfillmentInTransaction(
            tx,
            actor,
            booking.id,
            status === "completed" ? "completed" : "canceled",
            booking.version,
          )
      }
      if (performed.length) {
        const payload: CompletedServiceHandoff = {
          schemaVersion: 1,
          tenantId: actor.organizationId,
          unitId: row.unitId,
          unitName: row.unitName,
          timezone: row.timezone,
          visitId: row.id,
          clientId: row.clientId,
          appointmentId: row.appointmentId,
          customerDisplayName: row.customerDisplayName,
          finishedAt: now.toISOString(),
          visitVersion: version,
          items: performed.map((item) => ({
            itemId: item.id,
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            professionalId: item.professionalId ?? "",
            professionalName: item.professionalName ?? "",
            priceCents: item.priceCents,
            startedAt: item.startedAt?.toISOString() ?? "",
            finishedAt: item.finishedAt?.toISOString() ?? "",
          })),
        }
        await tx
          .insert(serviceDeskHandoff)
          .values({ id: createId(), organizationId: actor.organizationId, visitId: id, payload })
        if (current.clientId)
          await tx
            .update(client)
            .set({ lastVisitAt: now, updatedAt: now })
            .where(
              and(
                eq(client.organizationId, actor.organizationId),
                eq(client.id, current.clientId),
                sql`${client.lastVisitAt} is null or ${client.lastVisitAt} < ${now}`,
              ),
            )
      }
      await appendEvent(tx, actor, row, "interrupt", ["status", "items"])
      return row
    })
  }
  async function finish(actor: Actor, id: string, raw: unknown) {
    const input = commandSchema.strict().parse(raw)
    return execute(actor, input.idempotencyKey, "finish", { id, ...input }, async (tx) => {
      const current = await get(actor.organizationId, id, tx)
      if (current.version !== input.expectedVersion) throw new ServiceDeskError("version_conflict")
      if (current.status !== "in-service") throw new ServiceDeskError("invalid_transition")
      const items = await tx
        .select()
        .from(serviceDeskItem)
        .where(
          and(
            eq(serviceDeskItem.organizationId, actor.organizationId),
            eq(serviceDeskItem.visitId, id),
          ),
        )
        .orderBy(asc(serviceDeskItem.sequence))
        .for("update")
      if (!items.length || items.some((item) => item.status !== "completed"))
        throw new ServiceDeskError("active_dependency")
      if (
        items.some(
          (item) =>
            !item.professionalId || !item.professionalName || !item.startedAt || !item.finishedAt,
        )
      )
        throw new ServiceDeskError("active_dependency")
      const now = new Date()
      const version = current.version + 1
      const [row] = await tx
        .update(serviceDeskVisit)
        .set({ status: "completed", finishedAt: now, version, updatedAt: now })
        .where(eq(serviceDeskVisit.id, id))
        .returning()
      if (current.appointmentId) {
        const [booking] = await tx
          .select()
          .from(appointment)
          .where(eq(appointment.id, current.appointmentId))
          .for("update")
        if (booking)
          await scheduling.transitionFromFulfillmentInTransaction(
            tx,
            actor,
            booking.id,
            "completed",
            booking.version,
          )
      }
      if (current.clientId)
        await tx
          .update(client)
          .set({ lastVisitAt: now, updatedAt: now })
          .where(
            and(
              eq(client.organizationId, actor.organizationId),
              eq(client.id, current.clientId),
              sql`${client.lastVisitAt} is null or ${client.lastVisitAt} < ${now}`,
            ),
          )
      const payload: CompletedServiceHandoff = {
        schemaVersion: 1,
        tenantId: actor.organizationId,
        unitId: row.unitId,
        unitName: row.unitName,
        timezone: row.timezone,
        visitId: row.id,
        clientId: row.clientId,
        appointmentId: row.appointmentId,
        customerDisplayName: row.customerDisplayName,
        finishedAt: now.toISOString(),
        visitVersion: version,
        items: items.map((item) => ({
          itemId: item.id,
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          professionalId: item.professionalId ?? "",
          professionalName: item.professionalName ?? "",
          priceCents: item.priceCents,
          startedAt: item.startedAt?.toISOString() ?? "",
          finishedAt: item.finishedAt?.toISOString() ?? "",
        })),
      }
      await tx
        .insert(serviceDeskHandoff)
        .values({ id: createId(), organizationId: actor.organizationId, visitId: id, payload })
      await appendEvent(tx, actor, row, "finish", ["status", "finishedAt"])
      return row
    })
  }
  async function detail(organizationId: string, id: string) {
    const [row] = await db
      .select()
      .from(serviceDeskVisit)
      .where(and(eq(serviceDeskVisit.organizationId, organizationId), eq(serviceDeskVisit.id, id)))
    if (!row) throw new ServiceDeskError("not_found")
    const items = await db
      .select()
      .from(serviceDeskItem)
      .where(
        and(eq(serviceDeskItem.organizationId, organizationId), eq(serviceDeskItem.visitId, id)),
      )
      .orderBy(asc(serviceDeskItem.sequence))
    return { ...row, items }
  }
  async function queue(organizationId: string, unitId: string, stage?: string, cursor?: string) {
    const stages = stage ? [stage] : ["waiting", "called", "in-service"]
    const rows = await db
      .select()
      .from(serviceDeskVisit)
      .where(
        and(
          eq(serviceDeskVisit.organizationId, organizationId),
          eq(serviceDeskVisit.unitId, unitId),
          inArray(serviceDeskVisit.status, stages as ("waiting" | "called" | "in-service")[]),
          cursor
            ? sql`(${serviceDeskVisit.arrivedAt}, ${serviceDeskVisit.id}) > (${new Date(cursor.split("|")[0])}, ${cursor.split("|")[1]})`
            : undefined,
        ),
      )
      .orderBy(asc(serviceDeskVisit.arrivedAt), asc(serviceDeskVisit.id))
      .limit(51)
    return {
      items: rows.slice(0, 50),
      nextCursor: rows.length > 50 ? `${rows[49].arrivedAt.toISOString()}|${rows[49].id}` : null,
    }
  }
  async function arrivals(organizationId: string, unitId: string) {
    return db
      .select({
        id: appointment.id,
        version: appointment.version,
        clientId: appointment.clientId,
        customerName: appointment.customerName,
        serviceId: appointment.serviceId,
        serviceName: appointment.serviceName,
        professionalId: appointment.professionalId,
        professionalName: appointment.professionalName,
        startsAt: appointment.startsAt,
      })
      .from(appointment)
      .leftJoin(
        serviceDeskVisit,
        and(
          eq(serviceDeskVisit.organizationId, appointment.organizationId),
          eq(serviceDeskVisit.appointmentId, appointment.id),
        ),
      )
      .where(
        and(
          eq(appointment.organizationId, organizationId),
          eq(appointment.unitId, unitId),
          eq(appointment.status, "arrived"),
          isNull(serviceDeskVisit.id),
        ),
      )
      .orderBy(asc(appointment.startsAt), asc(appointment.id))
      .limit(50)
  }
  async function history(
    organizationId: string,
    unitId: string,
    page: number,
    pageSize: 10 | 20 | 50,
  ) {
    const where = and(
      eq(serviceDeskVisit.organizationId, organizationId),
      eq(serviceDeskVisit.unitId, unitId),
      inArray(serviceDeskVisit.status, ["completed", "canceled"]),
    )
    const [total] = await db.select({ value: count() }).from(serviceDeskVisit).where(where)
    const items = await db
      .select()
      .from(serviceDeskVisit)
      .where(where)
      .orderBy(desc(serviceDeskVisit.finishedAt), desc(serviceDeskVisit.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
    return { items, total: total.value, page, pageSize }
  }
  async function completedHandoffs(organizationId: string, after?: Date, limit = 50) {
    return db
      .select({ payload: serviceDeskHandoff.payload })
      .from(serviceDeskHandoff)
      .where(
        and(
          eq(serviceDeskHandoff.organizationId, organizationId),
          after ? sql`${serviceDeskHandoff.createdAt} > ${after}` : undefined,
        ),
      )
      .orderBy(asc(serviceDeskHandoff.createdAt), asc(serviceDeskHandoff.id))
      .limit(Math.min(limit, 50))
  }
  return {
    admitWalkIn,
    admitScheduled,
    transition,
    addItem,
    start,
    finishItem,
    updateNotes,
    removeItem,
    assignItem,
    extendItem,
    interrupt,
    finish,
    detail,
    queue,
    arrivals,
    history,
    completedHandoffs,
  }
}
export type ServiceDeskService = ReturnType<typeof createServiceDeskService>
