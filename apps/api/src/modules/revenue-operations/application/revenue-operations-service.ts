import { createHmac } from "node:crypto"
import { and, asc, count, desc, eq, gt, sql } from "drizzle-orm"
import type { IdpDatabase } from "../../idp/database/client.js"
import { user } from "../../idp/database/schema.js"
import type { ServiceDeskService } from "../../service-desk/application/service-desk-service.js"
import type { CompletedServiceHandoff } from "../../service-desk/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import type { TenantContext } from "../../tenancy/domain/business-context.js"
import { unit } from "../../units/database/schema.js"
import {
  revenueCashDay,
  revenueCashMovement,
  revenueCheckout,
  revenueCheckoutAdjustment,
  revenueCheckoutLine,
  revenueCheckoutTender,
  revenueClosingRevision,
  revenueCommand,
  revenuePaymentMethod,
  revenueReceipt,
  revenueReceiptLine,
  revenueReceiptReversal,
  revenueReceiptTender,
} from "../database/schema.js"
import { RevenueOperationsError } from "../domain/errors.js"
import {
  allocateNet,
  cents,
  reason,
  reconcileTenders,
  type TenderInput,
  type TenderMethod,
  tenderMethods,
  validateTenderDraft,
} from "../domain/money.js"

type Database = IdpDatabase
type Actor = TenantContext
type Clock = () => Date
const CASH_DAY_DETAIL_LIMIT = 50

export async function hasOpenRevenueCashDay(
  db: Pick<Database, "select">,
  organizationId: string,
  unitId: string,
) {
  const [row] = await db
    .select({ id: revenueCashDay.id })
    .from(revenueCashDay)
    .where(
      and(
        eq(revenueCashDay.organizationId, organizationId),
        eq(revenueCashDay.unitId, unitId),
        eq(revenueCashDay.status, "open"),
      ),
    )
    .limit(1)
  return Boolean(row)
}

function localDate(at: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(at)
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${value.year}-${value.month}-${value.day}`
  } catch {
    throw new RevenueOperationsError("invalid_request", "timezone")
  }
}

async function lock(db: Database, resource: string) {
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${resource}, 24))`)
}

async function actorName(db: Database, actor: Actor) {
  const [row] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, actor.actorUserId))
    .limit(1)
  return row?.name?.trim().slice(0, 120) || "Responsável indisponível"
}

function fingerprint(secret: string, action: string, structuralInput: unknown) {
  return createHmac("sha256", secret)
    .update(JSON.stringify({ action, structuralInput }))
    .digest("hex")
}

function assertKey(key: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(key))
    throw new RevenueOperationsError("invalid_request", "idempotencyKey")
}

export function createRevenueOperationsService(
  db: Database,
  serviceDesk: Pick<ServiceDeskService, "completedHandoff">,
  secret: string,
  clock: Clock = () => new Date(),
) {
  async function transact<T>(
    actor: Actor,
    input: {
      action: string
      key: string
      structuralInput: unknown
      locks: readonly string[]
      resourceType: string
      run: (tx: Database, name: string) => Promise<{ id: string; value: T }>
      replay: (tx: Database, resourceId: string) => Promise<T>
    },
  ) {
    assertKey(input.key)
    const digest = fingerprint(secret, input.action, input.structuralInput)
    return db.transaction(async (transaction) => {
      const tx = transaction as unknown as Database
      for (const resource of input.locks) await lock(tx, resource)
      const [existing] = await tx
        .select()
        .from(revenueCommand)
        .where(
          and(
            eq(revenueCommand.organizationId, actor.organizationId),
            eq(revenueCommand.actorUserId, actor.actorUserId),
            eq(revenueCommand.key, input.key),
          ),
        )
        .limit(1)
      if (existing) {
        if (existing.action !== input.action || existing.fingerprint !== digest)
          throw new RevenueOperationsError("idempotency_conflict")
        return input.replay(tx, existing.resourceId)
      }
      const result = await input.run(tx, await actorName(tx, actor))
      await tx.insert(revenueCommand).values({
        id: createId(),
        organizationId: actor.organizationId,
        actorUserId: actor.actorUserId,
        key: input.key,
        action: input.action,
        fingerprint: digest,
        resourceType: input.resourceType,
        resourceId: result.id,
      })
      return result.value
    })
  }

  async function ensureMethods(tx: Database, actor: Actor) {
    const rows = await tx
      .select()
      .from(revenuePaymentMethod)
      .where(eq(revenuePaymentMethod.organizationId, actor.organizationId))
      .orderBy(asc(revenuePaymentMethod.method))
    if (rows.length === tenderMethods.length) return rows
    const existing = new Set(rows.map((row) => row.method))
    const missing = tenderMethods.filter((method) => !existing.has(method))
    if (missing.length)
      await tx
        .insert(revenuePaymentMethod)
        .values(
          missing.map((method) => ({
            id: createId(),
            organizationId: actor.organizationId,
            method,
            enabled: true,
            updatedBy: actor.actorUserId,
          })),
        )
        .onConflictDoNothing()
    return tx
      .select()
      .from(revenuePaymentMethod)
      .where(eq(revenuePaymentMethod.organizationId, actor.organizationId))
      .orderBy(asc(revenuePaymentMethod.method))
  }

  async function findHandoff(
    organizationId: string,
    visitId: string,
  ): Promise<CompletedServiceHandoff> {
    const match = await serviceDesk.completedHandoff(organizationId, visitId)
    if (match) return match.payload
    throw new RevenueOperationsError("not_found")
  }

  async function cashDayUnit(organizationId: string, cashDayId: string) {
    const [day] = await db
      .select({ unitId: revenueCashDay.unitId })
      .from(revenueCashDay)
      .where(
        and(eq(revenueCashDay.organizationId, organizationId), eq(revenueCashDay.id, cashDayId)),
      )
      .limit(1)
    if (!day) throw new RevenueOperationsError("not_found")
    return day.unitId
  }

  async function loadCheckout(tx: Database, organizationId: string, checkoutId: string) {
    const [checkout] = await tx
      .select()
      .from(revenueCheckout)
      .where(
        and(eq(revenueCheckout.organizationId, organizationId), eq(revenueCheckout.id, checkoutId)),
      )
      .limit(1)
    if (!checkout) throw new RevenueOperationsError("not_found")
    const [lines, tenders, methods, receipts, adjustments] = await Promise.all([
      tx
        .select()
        .from(revenueCheckoutLine)
        .where(
          and(
            eq(revenueCheckoutLine.organizationId, organizationId),
            eq(revenueCheckoutLine.checkoutId, checkoutId),
          ),
        )
        .orderBy(asc(revenueCheckoutLine.sequence)),
      tx
        .select()
        .from(revenueCheckoutTender)
        .where(
          and(
            eq(revenueCheckoutTender.organizationId, organizationId),
            eq(revenueCheckoutTender.checkoutId, checkoutId),
          ),
        )
        .orderBy(asc(revenueCheckoutTender.method)),
      tx
        .select()
        .from(revenuePaymentMethod)
        .where(eq(revenuePaymentMethod.organizationId, organizationId))
        .orderBy(asc(revenuePaymentMethod.method)),
      tx
        .select()
        .from(revenueReceipt)
        .where(
          and(
            eq(revenueReceipt.organizationId, organizationId),
            eq(revenueReceipt.checkoutId, checkoutId),
          ),
        )
        .orderBy(desc(revenueReceipt.registeredAt), desc(revenueReceipt.id))
        .limit(50),
      tx
        .select()
        .from(revenueCheckoutAdjustment)
        .where(
          and(
            eq(revenueCheckoutAdjustment.organizationId, organizationId),
            eq(revenueCheckoutAdjustment.checkoutId, checkoutId),
          ),
        )
        .orderBy(desc(revenueCheckoutAdjustment.createdAt), desc(revenueCheckoutAdjustment.id))
        .limit(50),
    ])
    const totals = allocateNet(
      lines.map((line) => ({ id: line.id, priceCents: line.priceCents })),
      checkout.discountCents,
      checkout.surchargeCents,
    )
    const netCents = new Map(totals.lines.map((line) => [line.id, line.netCents]))
    return {
      ...checkout,
      lines: lines.map((line) => ({ ...line, netCents: netCents.get(line.id) ?? 0 })),
      tenders,
      methods,
      receipts,
      adjustments,
      subtotal: totals.subtotal,
      total: totals.total,
    }
  }

  async function getCheckout(actor: Actor, checkoutId: string) {
    return loadCheckout(db, actor.organizationId, checkoutId)
  }

  async function getCheckoutByVisit(actor: Actor, visitId: string) {
    const [row] = await db
      .select({ id: revenueCheckout.id })
      .from(revenueCheckout)
      .where(
        and(
          eq(revenueCheckout.organizationId, actor.organizationId),
          eq(revenueCheckout.visitId, visitId),
        ),
      )
      .limit(1)
    return row ? loadCheckout(db, actor.organizationId, row.id) : null
  }

  async function registrationContext(actor: Actor, checkoutId: string) {
    const checkout = await loadCheckout(db, actor.organizationId, checkoutId)
    const date = localDate(clock(), checkout.timezone)
    const [day] = await db
      .select({
        id: revenueCashDay.id,
        version: revenueCashDay.version,
        status: revenueCashDay.status,
        localDate: revenueCashDay.localDate,
      })
      .from(revenueCashDay)
      .where(
        and(
          eq(revenueCashDay.organizationId, actor.organizationId),
          eq(revenueCashDay.unitId, checkout.unitId),
          eq(revenueCashDay.localDate, date),
        ),
      )
      .limit(1)
    return {
      operationalDate: date,
      checkoutVersion: checkout.version,
      policyVersion: Math.max(...checkout.methods.map((method) => method.version)),
      methods: checkout.methods,
      cashDay: day ?? null,
    }
  }

  async function openCheckout(actor: Actor, visitId: string, key: string) {
    const handoff = await findHandoff(actor.organizationId, visitId)
    return transact(actor, {
      action: "open-checkout",
      key,
      structuralInput: { visitId, handoffVersion: handoff.visitVersion },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:checkout:${actor.organizationId}:${visitId}`,
      ],
      resourceType: "checkout",
      replay: (tx, id) => loadCheckout(tx, actor.organizationId, id),
      run: async (tx, _name) => {
        await ensureMethods(tx, actor)
        const [existing] = await tx
          .select({ id: revenueCheckout.id })
          .from(revenueCheckout)
          .where(
            and(
              eq(revenueCheckout.organizationId, actor.organizationId),
              eq(revenueCheckout.visitId, visitId),
            ),
          )
          .limit(1)
        if (existing)
          return {
            id: existing.id,
            value: await loadCheckout(tx, actor.organizationId, existing.id),
          }
        if (
          handoff.schemaVersion !== 1 ||
          handoff.tenantId !== actor.organizationId ||
          handoff.items.length === 0
        )
          throw new RevenueOperationsError("not_found")
        const id = createId()
        await tx.insert(revenueCheckout).values({
          id,
          organizationId: actor.organizationId,
          unitId: handoff.unitId,
          visitId: handoff.visitId,
          clientId: handoff.clientId,
          appointmentId: handoff.appointmentId,
          customerDisplayName: handoff.customerDisplayName,
          unitName: handoff.unitName,
          timezone: handoff.timezone,
          handoffVersion: handoff.visitVersion,
          finishedAt: new Date(handoff.finishedAt),
        })
        await tx.insert(revenueCheckoutLine).values(
          handoff.items.map((item, sequence) => ({
            id: createId(),
            organizationId: actor.organizationId,
            checkoutId: id,
            itemId: item.itemId,
            sequence,
            snapshot: { ...item, handoffPriceCents: cents(item.priceCents, "priceCents") },
            priceCents: cents(item.priceCents, "priceCents"),
          })),
        )
        return { id, value: await loadCheckout(tx, actor.organizationId, id) }
      },
    })
  }

  async function updateLine(
    actor: Actor,
    input: {
      checkoutId: string
      lineId: string
      expectedVersion: number
      priceCents: number
      reason: string
      key: string
    },
  ) {
    const nextPrice = cents(input.priceCents, "priceCents")
    const normalizedReason = reason(input.reason)
    return transact(actor, {
      action: "update-line",
      key: input.key,
      structuralInput: {
        checkoutId: input.checkoutId,
        lineId: input.lineId,
        expectedVersion: input.expectedVersion,
        priceCents: nextPrice,
      },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:checkout:${actor.organizationId}:${input.checkoutId}`,
      ],
      resourceType: "checkout",
      replay: (tx, id) => loadCheckout(tx, actor.organizationId, id),
      run: async (tx, name) => {
        const checkout = await loadCheckout(tx, actor.organizationId, input.checkoutId)
        if (checkout.status !== "open") throw new RevenueOperationsError("already_registered")
        if (checkout.version !== input.expectedVersion)
          throw new RevenueOperationsError("version_conflict")
        const line = checkout.lines.find((item) => item.id === input.lineId)
        if (!line) throw new RevenueOperationsError("not_found")
        await tx
          .update(revenueCheckoutLine)
          .set({ priceCents: nextPrice, version: sql`${revenueCheckoutLine.version} + 1` })
          .where(
            and(
              eq(revenueCheckoutLine.organizationId, actor.organizationId),
              eq(revenueCheckoutLine.id, line.id),
            ),
          )
        await tx.insert(revenueCheckoutAdjustment).values({
          id: createId(),
          organizationId: actor.organizationId,
          checkoutId: checkout.id,
          kind: "line-price",
          lineId: line.id,
          previousCents: line.priceCents,
          nextCents: nextPrice,
          reason: normalizedReason,
          actorUserId: actor.actorUserId,
          actorDisplayName: name,
        })
        await tx
          .delete(revenueCheckoutTender)
          .where(
            and(
              eq(revenueCheckoutTender.organizationId, actor.organizationId),
              eq(revenueCheckoutTender.checkoutId, checkout.id),
            ),
          )
        await tx
          .update(revenueCheckout)
          .set({ version: sql`${revenueCheckout.version} + 1`, updatedAt: clock() })
          .where(
            and(
              eq(revenueCheckout.organizationId, actor.organizationId),
              eq(revenueCheckout.id, checkout.id),
            ),
          )
        return { id: checkout.id, value: await loadCheckout(tx, actor.organizationId, checkout.id) }
      },
    })
  }

  async function updateAdjustments(
    actor: Actor,
    input: {
      checkoutId: string
      expectedVersion: number
      discountCents: number
      surchargeCents: number
      discountReason?: string
      surchargeReason?: string
      key: string
    },
  ) {
    const discount = cents(input.discountCents, "discountCents")
    const surcharge = cents(input.surchargeCents, "surchargeCents")
    const discountReason =
      discount !== 0 ? reason(input.discountReason, "discountReason") : undefined
    const surchargeReason =
      surcharge !== 0 ? reason(input.surchargeReason, "surchargeReason") : undefined
    return transact(actor, {
      action: "update-adjustments",
      key: input.key,
      structuralInput: {
        checkoutId: input.checkoutId,
        expectedVersion: input.expectedVersion,
        discountCents: discount,
        surchargeCents: surcharge,
      },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:checkout:${actor.organizationId}:${input.checkoutId}`,
      ],
      resourceType: "checkout",
      replay: (tx, id) => loadCheckout(tx, actor.organizationId, id),
      run: async (tx, name) => {
        const checkout = await loadCheckout(tx, actor.organizationId, input.checkoutId)
        if (checkout.status !== "open") throw new RevenueOperationsError("already_registered")
        if (checkout.version !== input.expectedVersion)
          throw new RevenueOperationsError("version_conflict")
        allocateNet(
          checkout.lines.map((line) => ({ id: line.id, priceCents: line.priceCents })),
          discount,
          surcharge,
        )
        const events = [
          ...(discount !== checkout.discountCents
            ? [
                {
                  kind: "discount" as const,
                  previousCents: checkout.discountCents,
                  nextCents: discount,
                  reason: discountReason ?? reason("Remoção do desconto"),
                },
              ]
            : []),
          ...(surcharge !== checkout.surchargeCents
            ? [
                {
                  kind: "surcharge" as const,
                  previousCents: checkout.surchargeCents,
                  nextCents: surcharge,
                  reason: surchargeReason ?? reason("Remoção do acréscimo"),
                },
              ]
            : []),
        ]
        if (events.length)
          await tx.insert(revenueCheckoutAdjustment).values(
            events.map((event) => ({
              id: createId(),
              organizationId: actor.organizationId,
              checkoutId: checkout.id,
              actorUserId: actor.actorUserId,
              actorDisplayName: name,
              ...event,
            })),
          )
        await tx
          .delete(revenueCheckoutTender)
          .where(
            and(
              eq(revenueCheckoutTender.organizationId, actor.organizationId),
              eq(revenueCheckoutTender.checkoutId, checkout.id),
            ),
          )
        await tx
          .update(revenueCheckout)
          .set({
            discountCents: discount,
            surchargeCents: surcharge,
            version: sql`${revenueCheckout.version} + 1`,
            updatedAt: clock(),
          })
          .where(
            and(
              eq(revenueCheckout.organizationId, actor.organizationId),
              eq(revenueCheckout.id, checkout.id),
            ),
          )
        return { id: checkout.id, value: await loadCheckout(tx, actor.organizationId, checkout.id) }
      },
    })
  }

  async function replaceTenders(
    actor: Actor,
    input: {
      checkoutId: string
      expectedVersion: number
      tenders: readonly TenderInput[]
      key: string
    },
  ) {
    return transact(actor, {
      action: "replace-tenders",
      key: input.key,
      structuralInput: {
        checkoutId: input.checkoutId,
        expectedVersion: input.expectedVersion,
        tenders: input.tenders,
      },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:checkout:${actor.organizationId}:${input.checkoutId}`,
      ],
      resourceType: "checkout",
      replay: (tx, id) => loadCheckout(tx, actor.organizationId, id),
      run: async (tx) => {
        const checkout = await loadCheckout(tx, actor.organizationId, input.checkoutId)
        if (checkout.status !== "open") throw new RevenueOperationsError("already_registered")
        if (checkout.version !== input.expectedVersion)
          throw new RevenueOperationsError("version_conflict")
        if (checkout.total !== 0 || input.tenders.length !== 0) validateTenderDraft(input.tenders)
        const enabled = new Set(
          checkout.methods.filter((method) => method.enabled).map((method) => method.method),
        )
        const disabled = input.tenders.find((tender) => !enabled.has(tender.method))
        if (disabled) throw new RevenueOperationsError("payment_method_disabled", "tenders")
        await tx
          .delete(revenueCheckoutTender)
          .where(
            and(
              eq(revenueCheckoutTender.organizationId, actor.organizationId),
              eq(revenueCheckoutTender.checkoutId, checkout.id),
            ),
          )
        if (input.tenders.length)
          await tx.insert(revenueCheckoutTender).values(
            input.tenders.map((tender) => ({
              id: createId(),
              organizationId: actor.organizationId,
              checkoutId: checkout.id,
              ...tender,
            })),
          )
        await tx
          .update(revenueCheckout)
          .set({ version: sql`${revenueCheckout.version} + 1`, updatedAt: clock() })
          .where(
            and(
              eq(revenueCheckout.organizationId, actor.organizationId),
              eq(revenueCheckout.id, checkout.id),
            ),
          )
        return { id: checkout.id, value: await loadCheckout(tx, actor.organizationId, checkout.id) }
      },
    })
  }

  async function configureMethods(
    actor: Actor,
    input: {
      methods: readonly { method: TenderMethod; enabled: boolean }[]
      expectedVersion: number
      key: string
    },
  ) {
    if (input.methods.length !== 4 || new Set(input.methods.map((item) => item.method)).size !== 4)
      throw new RevenueOperationsError("invalid_request", "methods")
    if (!input.methods.some((item) => item.enabled))
      throw new RevenueOperationsError("invalid_request", "methods")
    return transact(actor, {
      action: "configure-methods",
      key: input.key,
      structuralInput: { methods: input.methods, expectedVersion: input.expectedVersion },
      locks: [`revenue:policy:${actor.organizationId}`],
      resourceType: "payment-policy",
      replay: async (tx) =>
        tx
          .select()
          .from(revenuePaymentMethod)
          .where(eq(revenuePaymentMethod.organizationId, actor.organizationId))
          .orderBy(asc(revenuePaymentMethod.method)),
      run: async (tx, _name) => {
        const current = await ensureMethods(tx, actor)
        const version = Math.max(...current.map((item) => item.version))
        if (version !== input.expectedVersion) throw new RevenueOperationsError("version_conflict")
        for (const item of input.methods)
          await tx
            .update(revenuePaymentMethod)
            .set({
              enabled: item.enabled,
              version: version + 1,
              updatedBy: actor.actorUserId,
              updatedAt: clock(),
            })
            .where(
              and(
                eq(revenuePaymentMethod.organizationId, actor.organizationId),
                eq(revenuePaymentMethod.method, item.method),
              ),
            )
        const value = await tx
          .select()
          .from(revenuePaymentMethod)
          .where(eq(revenuePaymentMethod.organizationId, actor.organizationId))
          .orderBy(asc(revenuePaymentMethod.method))
        return { id: actor.organizationId, value }
      },
    })
  }

  async function openCashDay(
    actor: Actor,
    input: { unitId: string; openingCashCents: number; key: string },
  ) {
    const opening = cents(input.openingCashCents, "openingCashCents")
    const [selectedUnit] = await db
      .select({ timezone: unit.timezone })
      .from(unit)
      .where(and(eq(unit.organizationId, actor.organizationId), eq(unit.id, input.unitId)))
      .limit(1)
    if (!selectedUnit) throw new RevenueOperationsError("not_found")
    if (!selectedUnit.timezone) throw new RevenueOperationsError("invalid_request", "timezone")
    const timezone = selectedUnit.timezone
    const date = localDate(clock(), timezone)
    return transact(actor, {
      action: "open-cash-day",
      key: input.key,
      structuralInput: { unitId: input.unitId, openingCashCents: opening, localDate: date },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:unit-timezone:${actor.organizationId}:${input.unitId}`,
        `revenue:day:${actor.organizationId}:${input.unitId}`,
      ],
      resourceType: "cash-day",
      replay: (tx, id) => loadCashDay(tx, actor.organizationId, id),
      run: async (tx, name) => {
        await ensureMethods(tx, actor)
        const [existing] = await tx
          .select({ id: revenueCashDay.id })
          .from(revenueCashDay)
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.unitId, input.unitId),
              eq(revenueCashDay.localDate, date),
            ),
          )
          .limit(1)
        if (existing)
          return {
            id: existing.id,
            value: await loadCashDay(tx, actor.organizationId, existing.id),
          }
        const id = createId()
        await tx.insert(revenueCashDay).values({
          id,
          organizationId: actor.organizationId,
          unitId: input.unitId,
          localDate: date,
          timezone,
          openingCashCents: opening,
          openedBy: actor.actorUserId,
          openedByName: name,
        })
        return { id, value: await loadCashDay(tx, actor.organizationId, id) }
      },
    })
  }

  async function loadCashDay(tx: Database, organizationId: string, id: string) {
    const [day] = await tx
      .select()
      .from(revenueCashDay)
      .where(and(eq(revenueCashDay.organizationId, organizationId), eq(revenueCashDay.id, id)))
      .limit(1)
    if (!day) throw new RevenueOperationsError("not_found")
    const [movements, receipts, closings, movementTotalsResult, receiptTotalsResult, tenderTotals] =
      await Promise.all([
        tx
          .select()
          .from(revenueCashMovement)
          .where(
            and(
              eq(revenueCashMovement.organizationId, organizationId),
              eq(revenueCashMovement.cashDayId, id),
            ),
          )
          .orderBy(desc(revenueCashMovement.createdAt), desc(revenueCashMovement.id))
          .limit(CASH_DAY_DETAIL_LIMIT),
        tx
          .select()
          .from(revenueReceipt)
          .where(
            and(
              eq(revenueReceipt.organizationId, organizationId),
              eq(revenueReceipt.cashDayId, id),
            ),
          )
          .orderBy(desc(revenueReceipt.registeredAt), desc(revenueReceipt.id))
          .limit(CASH_DAY_DETAIL_LIMIT),
        tx
          .select()
          .from(revenueClosingRevision)
          .where(
            and(
              eq(revenueClosingRevision.organizationId, organizationId),
              eq(revenueClosingRevision.cashDayId, id),
            ),
          )
          .orderBy(desc(revenueClosingRevision.revision))
          .limit(CASH_DAY_DETAIL_LIMIT),
        tx.execute(sql`
        select
          coalesce(sum(case
            when movement.kind = 'supply' then movement.amount_cents
            when movement.kind = 'movement-reversal' and original.kind = 'supply'
              then movement.amount_cents else 0 end), 0) as supply_cents,
          abs(coalesce(sum(case
            when movement.kind = 'withdrawal' then movement.amount_cents
            when movement.kind = 'movement-reversal' and original.kind = 'withdrawal'
              then movement.amount_cents else 0 end), 0)) as withdrawal_cents,
          coalesce(sum(case when movement.kind = 'receipt' then movement.amount_cents else 0 end), 0)
            as cash_receipt_cents,
          abs(coalesce(sum(case when movement.kind = 'receipt-reversal'
            then movement.amount_cents else 0 end), 0)) as cash_receipt_reversal_cents
        from revenue_cash_movements movement
        left join revenue_cash_movements original
          on original.organization_id = movement.organization_id
          and original.id = movement.original_movement_id
        where movement.organization_id = ${organizationId} and movement.cash_day_id = ${id}
      `),
        tx.execute(sql`
        select
          coalesce(sum(total_cents), 0) as gross_receipt_cents,
          coalesce(sum(total_cents) filter (where status = 'reversed'), 0)
            as reversed_receipt_cents,
          count(*)::integer as receipt_count,
          count(*) filter (where status = 'reversed')::integer as reversal_count,
          count(*) filter (where status = 'active' and total_cents = 0)::integer as no_charge_count,
          coalesce(sum(discount_cents) filter (where status = 'active'), 0) as discount_cents,
          coalesce(sum(surcharge_cents) filter (where status = 'active'), 0) as surcharge_cents
        from revenue_receipts
        where organization_id = ${organizationId} and cash_day_id = ${id}
      `),
        tx
          .select({
            method: revenueReceiptTender.method,
            grossCents: sql<string>`coalesce(sum(${revenueReceiptTender.appliedCents}), 0)`,
            reversedCents: sql<string>`coalesce(sum(${revenueReceiptTender.appliedCents}) filter (where ${revenueReceipt.status} = 'reversed'), 0)`,
          })
          .from(revenueReceiptTender)
          .innerJoin(
            revenueReceipt,
            and(
              eq(revenueReceipt.organizationId, revenueReceiptTender.organizationId),
              eq(revenueReceipt.id, revenueReceiptTender.receiptId),
            ),
          )
          .where(
            and(
              eq(revenueReceipt.organizationId, organizationId),
              eq(revenueReceipt.cashDayId, id),
            ),
          )
          .groupBy(revenueReceiptTender.method),
      ])
    const movementTotals = movementTotalsResult.rows[0] as Record<string, string | number>
    const receiptTotals = receiptTotalsResult.rows[0] as Record<string, string | number>
    const aggregateCents = (value: string | number, field: string) => cents(Number(value), field)
    const supplyCents = aggregateCents(movementTotals.supply_cents, "supplyCents")
    const withdrawalCents = aggregateCents(movementTotals.withdrawal_cents, "withdrawalCents")
    const cashReceiptCents = aggregateCents(movementTotals.cash_receipt_cents, "cashReceiptCents")
    const cashReceiptReversalCents = aggregateCents(
      movementTotals.cash_receipt_reversal_cents,
      "cashReceiptReversalCents",
    )
    const expectedCashCents =
      day.openingCashCents +
      supplyCents -
      withdrawalCents +
      cashReceiptCents -
      cashReceiptReversalCents
    const grossReceiptCents = aggregateCents(receiptTotals.gross_receipt_cents, "grossReceiptCents")
    const reversedReceiptCents = aggregateCents(
      receiptTotals.reversed_receipt_cents,
      "reversedReceiptCents",
    )
    const [pending] = await tx
      .select({ value: count() })
      .from(revenueCheckout)
      .where(
        and(
          eq(revenueCheckout.organizationId, organizationId),
          eq(revenueCheckout.unitId, day.unitId),
          eq(revenueCheckout.status, "open"),
        ),
      )
    const paymentMethods = tenderMethods.map((method) => {
      const entry = tenderTotals.find((tender) => tender.method === method)
      const grossCents = aggregateCents(entry?.grossCents ?? 0, `${method}GrossCents`)
      const reversedCents = aggregateCents(entry?.reversedCents ?? 0, `${method}ReversedCents`)
      return { method, grossCents, reversedCents, netCents: grossCents - reversedCents }
    })
    return {
      ...day,
      movements,
      receipts,
      closings,
      summary: {
        openingCashCents: day.openingCashCents,
        cashReceiptCents,
        cashReceiptReversalCents,
        supplyCents,
        withdrawalCents,
        expectedCashCents,
        grossReceiptCents,
        reversedReceiptCents,
        netReceiptCents: grossReceiptCents - reversedReceiptCents,
        noChargeCount: Number(receiptTotals.no_charge_count),
        receiptCount: Number(receiptTotals.receipt_count),
        reversalCount: Number(receiptTotals.reversal_count),
        discountCents: aggregateCents(receiptTotals.discount_cents, "discountCents"),
        surchargeCents: aggregateCents(receiptTotals.surcharge_cents, "surchargeCents"),
        paymentMethods,
        pendingCheckoutCount: pending?.value ?? 0,
      },
    }
  }

  async function getCashDay(actor: Actor, unitId: string, date: string) {
    const [row] = await db
      .select({ id: revenueCashDay.id })
      .from(revenueCashDay)
      .where(
        and(
          eq(revenueCashDay.organizationId, actor.organizationId),
          eq(revenueCashDay.unitId, unitId),
          eq(revenueCashDay.localDate, date),
        ),
      )
      .limit(1)
    return row ? loadCashDay(db, actor.organizationId, row.id) : null
  }

  async function getCurrentCashDay(actor: Actor, unitId: string) {
    const [selectedUnit] = await db
      .select({ timezone: unit.timezone })
      .from(unit)
      .where(and(eq(unit.organizationId, actor.organizationId), eq(unit.id, unitId)))
      .limit(1)
    if (!selectedUnit) throw new RevenueOperationsError("not_found")
    if (!selectedUnit.timezone) throw new RevenueOperationsError("invalid_request", "timezone")
    const date = localDate(clock(), selectedUnit.timezone)
    return { date, day: await getCashDay(actor, unitId, date) }
  }

  async function getCashDayById(actor: Actor, cashDayId: string) {
    return loadCashDay(db, actor.organizationId, cashDayId)
  }

  async function paymentMethods(actor: Actor) {
    return db.transaction(async (transaction) => {
      const tx = transaction as unknown as Database
      await lock(tx, `revenue:policy:${actor.organizationId}`)
      await ensureMethods(tx, actor)
      return tx
        .select()
        .from(revenuePaymentMethod)
        .where(eq(revenuePaymentMethod.organizationId, actor.organizationId))
        .orderBy(asc(revenuePaymentMethod.method))
    })
  }

  async function addMovement(
    actor: Actor,
    input: {
      cashDayId: string
      kind: "supply" | "withdrawal"
      amountCents: number
      reason: string
      expectedVersion: number
      key: string
    },
  ) {
    const amount = cents(input.amountCents, "amountCents", { positive: true })
    const normalizedReason = reason(input.reason)
    const unitId = await cashDayUnit(actor.organizationId, input.cashDayId)
    return transact(actor, {
      action: `cash-${input.kind}`,
      key: input.key,
      structuralInput: {
        cashDayId: input.cashDayId,
        kind: input.kind,
        amountCents: amount,
        expectedVersion: input.expectedVersion,
      },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:day:${actor.organizationId}:${unitId}`,
      ],
      resourceType: "cash-movement",
      replay: async (tx) => loadCashDay(tx, actor.organizationId, input.cashDayId),
      run: async (tx, name) => {
        const day = await loadCashDay(tx, actor.organizationId, input.cashDayId)
        if (day.status !== "open") throw new RevenueOperationsError("cash_day_closed")
        if (day.version !== input.expectedVersion)
          throw new RevenueOperationsError("version_conflict")
        if (day.localDate !== localDate(clock(), day.timezone))
          throw new RevenueOperationsError("cash_day_date_mismatch")
        if (input.kind === "withdrawal" && amount > day.summary.expectedCashCents)
          throw new RevenueOperationsError("insufficient_cash", "amountCents")
        const id = createId()
        await tx.insert(revenueCashMovement).values({
          id,
          organizationId: actor.organizationId,
          cashDayId: day.id,
          kind: input.kind,
          amountCents: input.kind === "supply" ? amount : -amount,
          reason: normalizedReason,
          actorUserId: actor.actorUserId,
          actorDisplayName: name,
        })
        await tx
          .update(revenueCashDay)
          .set({ version: sql`${revenueCashDay.version} + 1`, updatedAt: clock() })
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.id, day.id),
            ),
          )
        return { id, value: await loadCashDay(tx, actor.organizationId, day.id) }
      },
    })
  }

  async function reverseMovement(
    actor: Actor,
    input: {
      cashDayId: string
      movementId: string
      expectedVersion: number
      reason: string
      key: string
    },
  ) {
    const normalizedReason = reason(input.reason)
    const [source] = await db
      .select()
      .from(revenueCashMovement)
      .where(
        and(
          eq(revenueCashMovement.organizationId, actor.organizationId),
          eq(revenueCashMovement.id, input.movementId),
        ),
      )
      .limit(1)
    if (!source || !["supply", "withdrawal"].includes(source.kind))
      throw new RevenueOperationsError("not_found")
    if (source.cashDayId !== input.cashDayId) throw new RevenueOperationsError("not_found")
    const unitId = await cashDayUnit(actor.organizationId, source.cashDayId)
    return transact(actor, {
      action: "reverse-cash-movement",
      key: input.key,
      structuralInput: { movementId: input.movementId, expectedVersion: input.expectedVersion },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:day:${actor.organizationId}:${unitId}`,
      ],
      resourceType: "cash-movement",
      replay: (tx) => loadCashDay(tx, actor.organizationId, source.cashDayId),
      run: async (tx, name) => {
        const day = await loadCashDay(tx, actor.organizationId, source.cashDayId)
        if (day.status !== "open") throw new RevenueOperationsError("cash_day_closed")
        if (day.version !== input.expectedVersion)
          throw new RevenueOperationsError("version_conflict")
        const [existing] = await tx
          .select()
          .from(revenueCashMovement)
          .where(
            and(
              eq(revenueCashMovement.organizationId, actor.organizationId),
              eq(revenueCashMovement.originalMovementId, source.id),
            ),
          )
          .limit(1)
        if (existing) throw new RevenueOperationsError("already_reversed")
        const id = createId()
        await tx.insert(revenueCashMovement).values({
          id,
          organizationId: actor.organizationId,
          cashDayId: day.id,
          kind: "movement-reversal",
          amountCents: -source.amountCents,
          reason: normalizedReason,
          originalMovementId: source.id,
          actorUserId: actor.actorUserId,
          actorDisplayName: name,
        })
        await tx
          .update(revenueCashDay)
          .set({ version: sql`${revenueCashDay.version} + 1`, updatedAt: clock() })
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.id, day.id),
            ),
          )
        return { id, value: await loadCashDay(tx, actor.organizationId, day.id) }
      },
    })
  }

  async function registerReceipt(
    actor: Actor,
    input: {
      checkoutId: string
      expectedCheckoutVersion: number
      expectedDayVersion: number
      key: string
    },
  ) {
    const preview = await loadCheckout(db, actor.organizationId, input.checkoutId)
    return transact(actor, {
      action: "register-receipt",
      key: input.key,
      structuralInput: {
        checkoutId: input.checkoutId,
        expectedCheckoutVersion: input.expectedCheckoutVersion,
        expectedDayVersion: input.expectedDayVersion,
      },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:day:${actor.organizationId}:${preview.unitId}`,
        `revenue:checkout:${actor.organizationId}:${input.checkoutId}`,
      ],
      resourceType: "receipt",
      replay: (tx, id) => loadReceipt(tx, actor.organizationId, id),
      run: async (tx, name) => {
        const checkout = await loadCheckout(tx, actor.organizationId, input.checkoutId)
        if (checkout.version !== input.expectedCheckoutVersion)
          throw new RevenueOperationsError("version_conflict")
        if (checkout.status !== "open") throw new RevenueOperationsError("already_registered")
        const date = localDate(clock(), checkout.timezone)
        const [day] = await tx
          .select()
          .from(revenueCashDay)
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.unitId, checkout.unitId),
              eq(revenueCashDay.localDate, date),
            ),
          )
          .limit(1)
        if (!day) throw new RevenueOperationsError("cash_day_required")
        if (day.status !== "open") throw new RevenueOperationsError("cash_day_closed")
        if (day.version !== input.expectedDayVersion)
          throw new RevenueOperationsError("version_conflict")
        const enabled = new Set(
          checkout.methods.filter((method) => method.enabled).map((method) => method.method),
        )
        if (checkout.tenders.some((tender) => !enabled.has(tender.method)))
          throw new RevenueOperationsError("payment_method_disabled")
        const tenderResult = reconcileTenders(
          checkout.tenders.map((tender) => ({
            method: tender.method,
            appliedCents: tender.appliedCents,
            receivedCents: tender.receivedCents ?? undefined,
          })),
          checkout.total,
        )
        const receiptId = createId()
        const policyVersion = Math.max(...checkout.methods.map((item) => item.version))
        const [replaced] = await tx
          .select({ id: revenueReceipt.id })
          .from(revenueReceipt)
          .where(
            and(
              eq(revenueReceipt.organizationId, actor.organizationId),
              eq(revenueReceipt.checkoutId, checkout.id),
              eq(revenueReceipt.status, "reversed"),
            ),
          )
          .orderBy(desc(revenueReceipt.registeredAt), desc(revenueReceipt.id))
          .limit(1)
        await tx.insert(revenueReceipt).values({
          id: receiptId,
          organizationId: actor.organizationId,
          checkoutId: checkout.id,
          replacesReceiptId: replaced?.id,
          cashDayId: day.id,
          localDate: date,
          timezone: checkout.timezone,
          subtotalCents: checkout.subtotal,
          discountCents: checkout.discountCents,
          surchargeCents: checkout.surchargeCents,
          totalCents: checkout.total,
          changeCents: tenderResult.changeCents,
          checkoutVersion: checkout.version,
          policyVersion,
          actorUserId: actor.actorUserId,
          actorDisplayName: name,
        })
        const allocations = new Map(
          allocateNet(
            checkout.lines.map((line) => ({ id: line.id, priceCents: line.priceCents })),
            checkout.discountCents,
            checkout.surchargeCents,
          ).lines.map((item) => [item.id, item.netCents]),
        )
        await tx.insert(revenueReceiptLine).values(
          checkout.lines.map((line) => ({
            id: createId(),
            organizationId: actor.organizationId,
            receiptId,
            checkoutLineId: line.id,
            sequence: line.sequence,
            snapshot: line.snapshot,
            grossCents: line.priceCents,
            netCents: allocations.get(line.id) ?? 0,
          })),
        )
        if (checkout.tenders.length)
          await tx.insert(revenueReceiptTender).values(
            checkout.tenders.map((tender) => ({
              id: createId(),
              organizationId: actor.organizationId,
              receiptId,
              method: tender.method,
              appliedCents: tender.appliedCents,
              receivedCents: tender.receivedCents,
            })),
          )
        const cashApplied =
          checkout.tenders.find((tender) => tender.method === "cash")?.appliedCents ?? 0
        if (cashApplied)
          await tx.insert(revenueCashMovement).values({
            id: createId(),
            organizationId: actor.organizationId,
            cashDayId: day.id,
            kind: "receipt",
            amountCents: cashApplied,
            receiptId,
            actorUserId: actor.actorUserId,
            actorDisplayName: name,
          })
        await tx
          .update(revenueCheckout)
          .set({
            status: "registered",
            version: sql`${revenueCheckout.version} + 1`,
            updatedAt: clock(),
          })
          .where(
            and(
              eq(revenueCheckout.organizationId, actor.organizationId),
              eq(revenueCheckout.id, checkout.id),
            ),
          )
        await tx
          .update(revenueCashDay)
          .set({ version: sql`${revenueCashDay.version} + 1`, updatedAt: clock() })
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.id, day.id),
            ),
          )
        return { id: receiptId, value: await loadReceipt(tx, actor.organizationId, receiptId) }
      },
    })
  }

  async function loadReceipt(tx: Database, organizationId: string, id: string) {
    const [receipt] = await tx
      .select()
      .from(revenueReceipt)
      .where(and(eq(revenueReceipt.organizationId, organizationId), eq(revenueReceipt.id, id)))
      .limit(1)
    if (!receipt) throw new RevenueOperationsError("not_found")
    const [lines, tenders, reversal] = await Promise.all([
      tx
        .select()
        .from(revenueReceiptLine)
        .where(
          and(
            eq(revenueReceiptLine.organizationId, organizationId),
            eq(revenueReceiptLine.receiptId, id),
          ),
        )
        .orderBy(asc(revenueReceiptLine.sequence)),
      tx
        .select()
        .from(revenueReceiptTender)
        .where(
          and(
            eq(revenueReceiptTender.organizationId, organizationId),
            eq(revenueReceiptTender.receiptId, id),
          ),
        )
        .orderBy(asc(revenueReceiptTender.method)),
      tx
        .select()
        .from(revenueReceiptReversal)
        .where(
          and(
            eq(revenueReceiptReversal.organizationId, organizationId),
            eq(revenueReceiptReversal.receiptId, id),
          ),
        )
        .limit(1),
    ])
    return { ...receipt, lines, tenders, reversal: reversal[0] ?? null }
  }

  async function reverseReceipt(
    actor: Actor,
    input: {
      receiptId: string
      expectedCheckoutVersion: number
      expectedDayVersion: number
      reason: string
      key: string
    },
  ) {
    const normalizedReason = reason(input.reason)
    const source = await loadReceipt(db, actor.organizationId, input.receiptId)
    const unitId = await cashDayUnit(actor.organizationId, source.cashDayId)
    return transact(actor, {
      action: "reverse-receipt",
      key: input.key,
      structuralInput: {
        receiptId: input.receiptId,
        expectedCheckoutVersion: input.expectedCheckoutVersion,
        expectedDayVersion: input.expectedDayVersion,
      },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:day:${actor.organizationId}:${unitId}`,
        `revenue:checkout:${actor.organizationId}:${source.checkoutId}`,
        `revenue:receipt:${actor.organizationId}:${source.id}`,
      ],
      resourceType: "receipt-reversal",
      replay: (tx) => loadReceipt(tx, actor.organizationId, source.id),
      run: async (tx, name) => {
        const receipt = await loadReceipt(tx, actor.organizationId, source.id)
        if (receipt.status === "reversed") throw new RevenueOperationsError("already_reversed")
        const checkout = await loadCheckout(tx, actor.organizationId, receipt.checkoutId)
        if (checkout.version !== input.expectedCheckoutVersion)
          throw new RevenueOperationsError("version_conflict")
        const date = localDate(clock(), checkout.timezone)
        const [day] = await tx
          .select()
          .from(revenueCashDay)
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.unitId, checkout.unitId),
              eq(revenueCashDay.localDate, date),
            ),
          )
          .limit(1)
        if (!day) throw new RevenueOperationsError("cash_day_required")
        if (day.status !== "open") throw new RevenueOperationsError("cash_day_closed")
        if (day.version !== input.expectedDayVersion)
          throw new RevenueOperationsError("version_conflict")
        const reversalId = createId()
        await tx.insert(revenueReceiptReversal).values({
          id: reversalId,
          organizationId: actor.organizationId,
          receiptId: receipt.id,
          cashDayId: day.id,
          snapshot: {
            totalCents: -receipt.totalCents,
            lines: receipt.lines.map((line) => ({
              receiptLineId: line.id,
              netCents: -line.netCents,
            })),
            tenders: receipt.tenders.map((tender) => ({
              receiptTenderId: tender.id,
              method: tender.method,
              appliedCents: -tender.appliedCents,
            })),
          },
          reason: normalizedReason,
          actorUserId: actor.actorUserId,
          actorDisplayName: name,
        })
        const cashApplied =
          receipt.tenders.find((tender) => tender.method === "cash")?.appliedCents ?? 0
        if (cashApplied)
          await tx.insert(revenueCashMovement).values({
            id: createId(),
            organizationId: actor.organizationId,
            cashDayId: day.id,
            kind: "receipt-reversal",
            amountCents: -cashApplied,
            receiptId: receipt.id,
            actorUserId: actor.actorUserId,
            actorDisplayName: name,
          })
        await tx
          .update(revenueReceipt)
          .set({ status: "reversed" })
          .where(
            and(
              eq(revenueReceipt.organizationId, actor.organizationId),
              eq(revenueReceipt.id, receipt.id),
            ),
          )
        await tx
          .update(revenueCheckout)
          .set({ status: "open", version: sql`${revenueCheckout.version} + 1`, updatedAt: clock() })
          .where(
            and(
              eq(revenueCheckout.organizationId, actor.organizationId),
              eq(revenueCheckout.id, receipt.checkoutId),
            ),
          )
        await tx
          .update(revenueCashDay)
          .set({ version: sql`${revenueCashDay.version} + 1`, updatedAt: clock() })
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.id, day.id),
            ),
          )
        return { id: reversalId, value: await loadReceipt(tx, actor.organizationId, receipt.id) }
      },
    })
  }

  async function closeDay(
    actor: Actor,
    input: {
      cashDayId: string
      expectedVersion: number
      countedCashCents: number
      reason?: string
      key: string
    },
  ) {
    const counted = cents(input.countedCashCents, "countedCashCents")
    const unitId = await cashDayUnit(actor.organizationId, input.cashDayId)
    return transact(actor, {
      action: "close-cash-day",
      key: input.key,
      structuralInput: {
        cashDayId: input.cashDayId,
        expectedVersion: input.expectedVersion,
        countedCashCents: counted,
      },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:day:${actor.organizationId}:${unitId}`,
      ],
      resourceType: "closing-revision",
      replay: (tx) => loadCashDay(tx, actor.organizationId, input.cashDayId),
      run: async (tx, name) => {
        const day = await loadCashDay(tx, actor.organizationId, input.cashDayId)
        if (day.status !== "open") throw new RevenueOperationsError("cash_day_closed")
        if (day.version !== input.expectedVersion)
          throw new RevenueOperationsError("version_conflict")
        const differenceCents = counted - day.summary.expectedCashCents
        const normalizedReason =
          differenceCents !== 0
            ? reason(input.reason)
            : input.reason
              ? reason(input.reason)
              : undefined
        const revision = day.closings.length + 1
        const id = createId()
        await tx.insert(revenueClosingRevision).values({
          id,
          organizationId: actor.organizationId,
          cashDayId: day.id,
          revision,
          kind: "close",
          reason: normalizedReason,
          actorUserId: actor.actorUserId,
          actorDisplayName: name,
          snapshot: { ...day.summary, countedCashCents: counted, differenceCents },
        })
        await tx
          .update(revenueCashDay)
          .set({
            status: "closed",
            version: sql`${revenueCashDay.version} + 1`,
            updatedAt: clock(),
          })
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.id, day.id),
            ),
          )
        return { id, value: await loadCashDay(tx, actor.organizationId, day.id) }
      },
    })
  }

  async function reopenDay(
    actor: Actor,
    input: { cashDayId: string; expectedVersion: number; reason: string; key: string },
  ) {
    const normalizedReason = reason(input.reason)
    const unitId = await cashDayUnit(actor.organizationId, input.cashDayId)
    return transact(actor, {
      action: "reopen-cash-day",
      key: input.key,
      structuralInput: { cashDayId: input.cashDayId, expectedVersion: input.expectedVersion },
      locks: [
        `revenue:policy:${actor.organizationId}`,
        `revenue:day:${actor.organizationId}:${unitId}`,
      ],
      resourceType: "closing-revision",
      replay: (tx) => loadCashDay(tx, actor.organizationId, input.cashDayId),
      run: async (tx, name) => {
        const day = await loadCashDay(tx, actor.organizationId, input.cashDayId)
        if (day.status !== "closed") throw new RevenueOperationsError("invalid_request")
        if (day.version !== input.expectedVersion)
          throw new RevenueOperationsError("version_conflict")
        if (day.localDate !== localDate(clock(), day.timezone))
          throw new RevenueOperationsError("cash_day_date_mismatch")
        const [later] = await tx
          .select({ id: revenueCashDay.id })
          .from(revenueCashDay)
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.unitId, day.unitId),
              gt(revenueCashDay.localDate, day.localDate),
            ),
          )
          .limit(1)
        if (later) throw new RevenueOperationsError("later_cash_day_exists")
        const id = createId()
        await tx.insert(revenueClosingRevision).values({
          id,
          organizationId: actor.organizationId,
          cashDayId: day.id,
          revision: day.closings.length + 1,
          kind: "reopen",
          reason: normalizedReason,
          actorUserId: actor.actorUserId,
          actorDisplayName: name,
        })
        await tx
          .update(revenueCashDay)
          .set({ status: "open", version: sql`${revenueCashDay.version} + 1`, updatedAt: clock() })
          .where(
            and(
              eq(revenueCashDay.organizationId, actor.organizationId),
              eq(revenueCashDay.id, day.id),
            ),
          )
        return { id, value: await loadCashDay(tx, actor.organizationId, day.id) }
      },
    })
  }

  async function listCheckouts(
    actor: Actor,
    input: {
      unitId?: string
      status?: "open" | "registered"
      page: number
      pageSize: 10 | 20 | 50
    },
  ) {
    const where = and(
      eq(revenueCheckout.organizationId, actor.organizationId),
      input.unitId ? eq(revenueCheckout.unitId, input.unitId) : undefined,
      input.status ? eq(revenueCheckout.status, input.status) : undefined,
    )
    const [total] = await db.select({ value: count() }).from(revenueCheckout).where(where)
    const items = await db
      .select()
      .from(revenueCheckout)
      .where(where)
      .orderBy(desc(revenueCheckout.finishedAt), desc(revenueCheckout.id))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    return {
      items,
      page: input.page,
      pageSize: input.pageSize,
      totalCount: total?.value ?? 0,
      totalPages: Math.max(1, Math.ceil((total?.value ?? 0) / input.pageSize)),
    }
  }

  async function listCashDays(
    actor: Actor,
    input: { unitId: string; from: string; to: string; page: number; pageSize: 10 | 20 | 50 },
  ) {
    const start = new Date(`${input.from}T00:00:00.000Z`)
    const end = new Date(`${input.to}T00:00:00.000Z`)
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start ||
      (end.getTime() - start.getTime()) / 86_400_000 > 30
    )
      throw new RevenueOperationsError("invalid_request", "to")
    const where = and(
      eq(revenueCashDay.organizationId, actor.organizationId),
      eq(revenueCashDay.unitId, input.unitId),
      sql`${revenueCashDay.localDate} between ${input.from} and ${input.to}`,
    )
    const [total] = await db.select({ value: count() }).from(revenueCashDay).where(where)
    const items = await db
      .select()
      .from(revenueCashDay)
      .where(where)
      .orderBy(desc(revenueCashDay.localDate), desc(revenueCashDay.id))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    return {
      items,
      page: input.page,
      pageSize: input.pageSize,
      totalCount: total?.value ?? 0,
      totalPages: Math.max(1, Math.ceil((total?.value ?? 0) / input.pageSize)),
    }
  }

  return {
    openCheckout,
    getCheckout,
    getCheckoutByVisit,
    registrationContext,
    updateLine,
    updateAdjustments,
    replaceTenders,
    configureMethods,
    openCashDay,
    getCashDay,
    getCurrentCashDay,
    getCashDayById,
    paymentMethods,
    addMovement,
    reverseMovement,
    registerReceipt,
    reverseReceipt,
    closeDay,
    reopenDay,
    listCheckouts,
    listCashDays,
    loadReceipt: (actor: Actor, id: string) => loadReceipt(db, actor.organizationId, id),
  }
}

export type RevenueOperationsService = ReturnType<typeof createRevenueOperationsService>
