import { createHmac } from "node:crypto"
import { and, asc, count, eq, gte, isNull, lte, or, sql } from "drizzle-orm"
import { z } from "zod"
import type { IdpDatabase } from "../../idp/database/client.js"
import { createId } from "../../shared/infra/ids.js"
import { unit } from "../../units/database/schema.js"
import {
  resolveAvailabilityCatalog,
  type TransactionDatabase,
} from "../database/catalog-context.js"
import { availabilityCommand, availabilitySeries } from "../database/schema.js"
import {
  assertOpeningHours,
  availabilityInput,
  occurs,
  projectAvailability,
  type Series,
  seriesOverlap,
} from "../domain/availability.js"
import { dateRange, localDate, SchedulingError, toInstant, validTimezone } from "../domain/time.js"
export async function lockSchedule(db: TransactionDatabase, organizationId: string) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`scheduling:${organizationId}`}, 0))`,
  )
}
export async function readSeries(
  db: TransactionDatabase,
  organizationId: string,
  unitId: string,
  start: string,
  end: string,
) {
  return (await db
    .select()
    .from(availabilitySeries)
    .where(
      and(
        eq(availabilitySeries.organizationId, organizationId),
        eq(availabilitySeries.unitId, unitId),
        eq(availabilitySeries.status, "active"),
        lte(availabilitySeries.effectiveFrom, end),
        or(
          isNull(availabilitySeries.effectiveUntil),
          gte(availabilitySeries.effectiveUntil, start),
        ),
      ),
    )
    .orderBy(asc(availabilitySeries.id))
    .limit(2001)) as Series[]
}
export type AvailabilityOccupancyGuard = (
  db: TransactionDatabase,
  organizationId: string,
  unitId: string,
  professionalId: string,
  series: readonly Series[],
) => Promise<void>
export type AvailabilityTimezoneGuard = (
  db: TransactionDatabase,
  organizationId: string,
  unitId: string,
) => Promise<boolean>
export function createAvailabilityService(
  db: IdpDatabase,
  guardOccupancy: AvailabilityOccupancyGuard,
  fingerprintSecret = "",
  hasOpenFinancialDay: AvailabilityTimezoneGuard = async () => false,
) {
  type Command = { actorUserId: string; key: string }
  async function execute<T extends { id: string; version: number }>(
    organizationId: string,
    action: string,
    input: unknown,
    command: Command | undefined,
    operation: (tx: TransactionDatabase) => Promise<T>,
  ) {
    if (command) z.uuid().parse(command.key)
    const fingerprint = createHmac("sha256", fingerprintSecret)
      .update(JSON.stringify({ action, input }))
      .digest("hex")
    return db.transaction(async (tx) => {
      await lockSchedule(tx, organizationId)
      if (command) {
        const [receipt] = await tx
          .select()
          .from(availabilityCommand)
          .where(
            and(
              eq(availabilityCommand.organizationId, organizationId),
              eq(availabilityCommand.actorUserId, command.actorUserId),
              eq(availabilityCommand.key, command.key),
            ),
          )
        if (receipt) {
          if (receipt.fingerprint !== fingerprint) throw new SchedulingError("idempotency_conflict")
          return { id: receipt.resourceId, version: receipt.resourceVersion }
        }
      }
      const result = await operation(tx)
      if (command)
        await tx.insert(availabilityCommand).values({
          id: createId(),
          organizationId,
          ...command,
          fingerprint,
          action,
          resourceId: result.id,
          resourceVersion: result.version,
        })
      return { id: result.id, version: result.version }
    })
  }
  async function range(
    organizationId: string,
    query: {
      unitId: string
      startDate: string
      endDate: string
      professionalId?: string
      includeArchived?: boolean
    },
  ) {
    dateRange(query.startDate, query.endDate)
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
    const series = await readSeries(
      db,
      organizationId,
      query.unitId,
      query.startDate,
      query.endDate,
    )
    if (series.length > 2000) throw new SchedulingError("range_capacity_exceeded")
    const archived = query.includeArchived
      ? await db
          .select()
          .from(availabilitySeries)
          .where(
            and(
              eq(availabilitySeries.organizationId, organizationId),
              eq(availabilitySeries.unitId, query.unitId),
              eq(availabilitySeries.status, "archived"),
              lte(availabilitySeries.effectiveFrom, query.endDate),
              or(
                isNull(availabilitySeries.effectiveUntil),
                gte(availabilitySeries.effectiveUntil, query.startDate),
              ),
              query.professionalId
                ? eq(availabilitySeries.professionalId, query.professionalId)
                : undefined,
            ),
          )
          .orderBy(asc(availabilitySeries.id))
          .limit(2001)
      : []
    if (archived.length > 2000) throw new SchedulingError("range_capacity_exceeded")
    return {
      archived,
      timezone: location.timezone,
      unit: location,
      series: series.filter(
        (item) => !query.professionalId || item.professionalId === query.professionalId,
      ),
      occurrences: projectAvailability(series, query.startDate, query.endDate).filter(
        (item) => !query.professionalId || item.professionalId === query.professionalId,
      ),
    }
  }
  async function save(
    organizationId: string,
    raw: unknown,
    existing?: {
      id: string
      version: number
      scope: "series" | "occurrence"
      date?: string
      archive?: boolean
      restore?: boolean
    },
    command?: Command,
  ) {
    const input = raw === null ? null : availabilityInput.parse(raw)
    return execute(
      organizationId,
      existing?.restore ? "restore" : existing?.archive ? "archive" : existing ? "edit" : "create",
      { raw, existing },
      command,
      async (tx) => {
        const [current] = existing
          ? await tx
              .select()
              .from(availabilitySeries)
              .where(
                and(
                  eq(availabilitySeries.organizationId, organizationId),
                  eq(availabilitySeries.id, existing.id),
                ),
              )
              .for("update")
          : []
        if (existing && !current) throw new SchedulingError("not_found")
        if (existing && current?.version !== existing.version)
          throw new SchedulingError("version_conflict")
        if (existing?.archive && existing.restore) throw new SchedulingError("invalid_request")
        if (current?.status === "archived" && !existing?.restore)
          throw new SchedulingError("invalid_transition")
        const values = input ?? current
        if (!values) throw new SchedulingError("invalid_request")
        if (
          current &&
          input &&
          (input.unitId !== current.unitId || input.professionalId !== current.professionalId)
        )
          throw new SchedulingError("invalid_relation", "professionalId")
        const context = await resolveAvailabilityCatalog(
          tx,
          organizationId,
          values.unitId,
          values.professionalId,
        )
        if (!existing?.archive) assertOpeningHours(values as Series, context.periods)
        let id = current?.id ?? createId()
        if (existing?.scope === "occurrence") {
          const date = localDate.parse(existing.date)
          if (
            !current ||
            (!existing.restore && !occurs(current as Series, date)) ||
            (existing.restore && !current.excludedDates.includes(date))
          )
            throw new SchedulingError("not_found")
          if (!existing.restore && current.excludedDates.length >= 1000)
            throw new SchedulingError("series_capacity_exceeded")
          await tx
            .update(availabilitySeries)
            .set({
              excludedDates: existing.restore
                ? current.excludedDates.filter((excluded) => excluded !== date)
                : [...current.excludedDates, date],
              version: current.version + 1,
              updatedAt: new Date(),
            })
            .where(eq(availabilitySeries.id, current.id))
          id = existing.restore || existing.archive ? current.id : createId()
          if (!existing.archive && !existing.restore)
            await tx.insert(availabilitySeries).values({
              ...values,
              id,
              organizationId,
              status: "active",
              effectiveFrom: date,
              effectiveUntil: date,
              excludedDates: [],
              version: 1,
            })
        } else if (current) {
          await tx
            .update(availabilitySeries)
            .set({
              ...(input ?? {}),
              status: existing?.archive ? "archived" : "active",
              version: current.version + 1,
              updatedAt: new Date(),
            })
            .where(eq(availabilitySeries.id, current.id))
        } else await tx.insert(availabilitySeries).values({ ...values, id, organizationId })
        const all = (await tx
          .select()
          .from(availabilitySeries)
          .where(
            and(
              eq(availabilitySeries.organizationId, organizationId),
              eq(availabilitySeries.professionalId, values.professionalId),
              eq(availabilitySeries.status, "active"),
            ),
          )
          .limit(2001)) as Series[]
        if (all.length > 2000) throw new SchedulingError("series_capacity_exceeded")
        const changed = all.find((item) => item.id === id)
        if (changed) {
          for (const other of all)
            if (
              other.id !== id &&
              (other.unitId !== changed.unitId ||
                (other.kind === "available") === (changed.kind === "available")) &&
              seriesOverlap(changed, other)
            )
              throw new SchedulingError("availability_overlap", "start")
          toInstant(changed.effectiveFrom, changed.start, context.location.timezone as string)
          toInstant(changed.effectiveFrom, changed.end, context.location.timezone as string)
        }
        await guardOccupancy(
          tx,
          organizationId,
          values.unitId,
          values.professionalId,
          all.filter((item) => item.unitId === values.unitId),
        )
        return {
          id,
          version:
            existing?.scope === "occurrence" && !existing.archive && !existing.restore
              ? 1
              : (current?.version ?? 0) + 1,
        }
      },
    )
  }
  async function timezone(
    organizationId: string,
    unitId: string,
    timezone: string,
    version: number,
    command?: Command,
  ) {
    if (!validTimezone(timezone)) throw new SchedulingError("invalid_request", "timezone")
    return execute(
      organizationId,
      "timezone",
      { unitId, timezone, version },
      command,
      async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`revenue:unit-timezone:${organizationId}:${unitId}`}, 24))`,
        )
        const [location] = await tx
          .select()
          .from(unit)
          .where(and(eq(unit.organizationId, organizationId), eq(unit.id, unitId)))
          .for("update")
        if (location?.status !== "active") throw new SchedulingError("not_found")
        if (location.version !== version) throw new SchedulingError("version_conflict")
        const [rule] = await tx
          .select({ id: availabilitySeries.id })
          .from(availabilitySeries)
          .where(
            and(
              eq(availabilitySeries.organizationId, organizationId),
              eq(availabilitySeries.unitId, unitId),
            ),
          )
          .limit(1)
        if (rule && location.timezone !== timezone)
          throw new SchedulingError("timezone_in_use", "timezone")
        if (
          location.timezone !== timezone &&
          (await hasOpenFinancialDay(tx, organizationId, unitId))
        )
          throw new SchedulingError("timezone_in_use", "timezone")
        const [updated] = await tx
          .update(unit)
          .set({ timezone, version: version + 1, updatedAt: new Date() })
          .where(eq(unit.id, unitId))
          .returning()
        return updated
      },
    )
  }
  async function detail(organizationId: string, id: string) {
    const [record] = await db
      .select()
      .from(availabilitySeries)
      .where(
        and(eq(availabilitySeries.organizationId, organizationId), eq(availabilitySeries.id, id)),
      )
    if (!record) throw new SchedulingError("not_found")
    return record
  }
  async function summary(organizationId: string) {
    const [result] = await db
      .select({ activeSeries: count() })
      .from(availabilitySeries)
      .innerJoin(
        unit,
        and(
          eq(unit.organizationId, availabilitySeries.organizationId),
          eq(unit.id, availabilitySeries.unitId),
        ),
      )
      .where(
        and(
          eq(availabilitySeries.organizationId, organizationId),
          eq(availabilitySeries.status, "active"),
          eq(availabilitySeries.kind, "available"),
          eq(unit.status, "active"),
        ),
      )
    return { activeSeries: result.activeSeries }
  }
  return { range, save, timezone, summary, detail }
}
export type AvailabilityService = ReturnType<typeof createAvailabilityService>
