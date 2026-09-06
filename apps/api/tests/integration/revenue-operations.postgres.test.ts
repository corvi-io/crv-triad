import { fileURLToPath } from "node:url"
import { eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createAvailabilityService } from "../../src/modules/availability/application/availability-service.js"
import { member, organization, user } from "../../src/modules/idp/database/schema.js"
import {
  createRevenueOperationsService,
  hasOpenRevenueCashDay,
} from "../../src/modules/revenue-operations/application/revenue-operations-service.js"
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
} from "../../src/modules/revenue-operations/database/schema.js"
import {
  serviceDeskHandoff,
  serviceDeskVisit,
} from "../../src/modules/service-desk/database/schema.js"
import { service as catalogService } from "../../src/modules/services/database/schema.js"
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

const pool = new Pool({ connectionString: url })
const db = drizzle(pool)
const actor = {
  organizationId: "revenue-a",
  organizationName: "Revenue A",
  membershipId: "revenue-member-a",
  actorUserId: "revenue-owner",
  role: "owner" as const,
}
const otherActor = {
  organizationId: "revenue-b",
  organizationName: "Revenue B",
  membershipId: "revenue-member-b",
  actorUserId: "revenue-other-owner",
  role: "owner" as const,
}
const now = new Date("2026-09-05T15:00:00.000Z")
const deskPort = {
  async completedHandoff(organizationId: string, visitId: string) {
    const [row] = await db
      .select({ payload: serviceDeskHandoff.payload })
      .from(serviceDeskHandoff)
      .where(
        sql`${serviceDeskHandoff.organizationId} = ${organizationId} and ${serviceDeskHandoff.visitId} = ${visitId}`,
      )
      .limit(1)
    return row ?? null
  },
}
const service = createRevenueOperationsService(
  db as never,
  deskPort as never,
  "revenue-operations-test-secret",
  () => now,
)

const visitIds = ["revenue-visit-1", "revenue-visit-2", "revenue-visit-3"]

beforeAll(async () => {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  await db.insert(organization).values([
    { id: actor.organizationId, name: "Revenue A", slug: "revenue-a" },
    { id: otherActor.organizationId, name: "Revenue B", slug: "revenue-b" },
  ])
  await db.insert(user).values([
    { id: actor.actorUserId, name: "Revenue Owner", email: "revenue-a@example.invalid" },
    { id: otherActor.actorUserId, name: "Other Owner", email: "revenue-b@example.invalid" },
  ])
  await db.insert(member).values([
    {
      id: "revenue-member-a",
      organizationId: actor.organizationId,
      userId: actor.actorUserId,
      role: "owner",
    },
    {
      id: "revenue-member-b",
      organizationId: otherActor.organizationId,
      userId: otherActor.actorUserId,
      role: "owner",
    },
  ])
  await db.insert(unit).values([
    {
      id: "revenue-unit-a",
      organizationId: actor.organizationId,
      name: "Centro",
      code: "RA",
      normalizedCode: "ra",
      address: "Synthetic",
      openingDays: ["monday"],
      openingStart: "08:00",
      openingEnd: "18:00",
      timezone: "America/Recife",
    },
    {
      id: "revenue-unit-b",
      organizationId: otherActor.organizationId,
      name: "Other",
      code: "RB",
      normalizedCode: "rb",
      address: "Synthetic",
      openingDays: ["monday"],
      openingStart: "08:00",
      openingEnd: "18:00",
      timezone: "America/Recife",
    },
  ])
  await db.insert(catalogService).values({
    id: "revenue-service-a",
    organizationId: actor.organizationId,
    name: "Corte",
    normalizedName: "corte",
    category: "Cabelo",
    description: "Synthetic",
    durationMinutes: 30,
    priceCents: 10_001,
  })
  await db.insert(serviceDeskVisit).values(
    visitIds.map((visitId, index) => ({
      id: visitId,
      organizationId: actor.organizationId,
      unitId: "revenue-unit-a",
      source: "walk-in" as const,
      status: "completed" as const,
      customerDisplayName: index === 0 ? "Cliente vinculado" : `Visitante ${index}`,
      unitName: "Centro",
      timezone: "America/Recife",
      requestedServiceId: "revenue-service-a",
      arrivedAt: new Date(now.getTime() - 7_200_000),
      finishedAt: new Date(now.getTime() - 3_600_000),
      version: index + 4,
    })),
  )
  await db.insert(serviceDeskHandoff).values(
    visitIds.map((visitId, index) => ({
      id: `revenue-handoff-${index + 1}`,
      organizationId: actor.organizationId,
      visitId,
      schemaVersion: 1,
      payload: {
        schemaVersion: 1 as const,
        tenantId: actor.organizationId,
        unitId: "revenue-unit-a",
        unitName: "Centro",
        timezone: "America/Recife",
        visitId,
        clientId: index === 0 ? "revenue-client-snapshot" : null,
        appointmentId: null,
        customerDisplayName: index === 0 ? "Cliente vinculado" : `Visitante ${index}`,
        finishedAt: new Date(now.getTime() - (index + 1) * 3_600_000).toISOString(),
        visitVersion: index + 4,
        items: [
          {
            itemId: `revenue-item-${index + 1}`,
            serviceId: "service-snapshot",
            serviceName: "Corte snapshot",
            professionalId: "professional-snapshot",
            professionalName: "Profissional snapshot",
            priceCents: index === 0 ? 10_001 : 5_000,
            startedAt: new Date(now.getTime() - 7_200_000).toISOString(),
            finishedAt: new Date(now.getTime() - 3_600_000).toISOString(),
          },
        ],
      },
    })),
  )
})

afterAll(async () => {
  for (const table of [
    revenueReceiptReversal,
    revenueReceiptTender,
    revenueReceiptLine,
    revenueCashMovement,
    revenueClosingRevision,
    revenueReceipt,
    revenueCheckoutTender,
    revenueCheckoutAdjustment,
    revenueCheckoutLine,
    revenueCommand,
    revenuePaymentMethod,
    revenueCashDay,
    revenueCheckout,
    serviceDeskHandoff,
    serviceDeskVisit,
  ])
    await db.delete(table).where(sql`${table.organizationId} in ('revenue-a', 'revenue-b')`)
  await db.delete(unit).where(sql`${unit.organizationId} in ('revenue-a', 'revenue-b')`)
  await db.delete(catalogService).where(eq(catalogService.organizationId, actor.organizationId))
  await db.delete(member).where(sql`${member.organizationId} in ('revenue-a', 'revenue-b')`)
  await db.delete(user).where(sql`${user.id} in ('revenue-owner', 'revenue-other-owner')`)
  await db.delete(organization).where(sql`${organization.id} in ('revenue-a', 'revenue-b')`)
  await pool.end()
})

describe.sequential("production revenue operations", () => {
  it("opens exactly one checkout from the immutable handoff and keeps reads side-effect free", async () => {
    expect(await service.getCheckoutByVisit(actor, visitIds[0])).toBeNull()
    const key = crypto.randomUUID()
    const checkout = await service.openCheckout(actor, visitIds[0], key)
    expect(checkout).toMatchObject({
      visitId: visitIds[0],
      customerDisplayName: "Cliente vinculado",
      subtotal: 10_001,
      total: 10_001,
      status: "open",
      handoffVersion: 4,
    })
    expect(checkout.lines[0]).toMatchObject({
      priceCents: 10_001,
      netCents: 10_001,
      snapshot: { serviceName: "Corte snapshot", handoffPriceCents: 10_001 },
    })
    expect((await service.openCheckout(actor, visitIds[0], key)).id).toBe(checkout.id)
    expect(await db.select({ value: sql<number>`count(*)::int` }).from(revenueCheckout)).toEqual([
      { value: 1 },
    ])
    await expect(service.getCheckout(otherActor, checkout.id)).rejects.toMatchObject({
      code: "not_found",
    })
  })

  it("derives the operational date from the timezone committed before the unit lock", async () => {
    let releaseLock: () => void = () => void 0
    let lockHeld: () => void = () => void 0
    const release = new Promise<void>((resolve) => {
      releaseLock = resolve
    })
    const acquired = new Promise<void>((resolve) => {
      lockHeld = resolve
    })
    const timezoneUpdate = db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`revenue:unit-timezone:${otherActor.organizationId}:revenue-unit-b`}, 24))`,
      )
      await transaction
        .update(unit)
        .set({ timezone: "Pacific/Kiritimati" })
        .where(eq(unit.id, "revenue-unit-b"))
      lockHeld()
      await release
    })
    await acquired

    const opening = service.openCashDay(otherActor, {
      unitId: "revenue-unit-b",
      openingCashCents: 0,
      key: crypto.randomUUID(),
    })
    await expect
      .poll(async () => {
        const result = await pool.query<{ count: string }>(
          "select count(*) from pg_stat_activity where datname = current_database() and wait_event = 'advisory'",
        )
        return Number(result.rows[0]?.count ?? 0)
      })
      .toBeGreaterThan(0)
    releaseLock()
    await timezoneUpdate

    await expect(opening).resolves.toMatchObject({
      localDate: "2026-09-06",
      timezone: "Pacific/Kiritimati",
    })
  })

  it("posts exact receipt and cash ledger snapshots with reason-free idempotency", async () => {
    let checkout = await service.getCheckoutByVisit(actor, visitIds[0])
    if (!checkout) throw new Error("checkout fixture missing")
    const adjustmentKey = crypto.randomUUID()
    checkout = await service.updateAdjustments(actor, {
      checkoutId: checkout.id,
      expectedVersion: checkout.version,
      discountCents: 2,
      surchargeCents: 0,
      discountReason: "Ajuste autorizado",
      key: adjustmentKey,
    })
    const replay = await service.updateAdjustments(actor, {
      checkoutId: checkout.id,
      expectedVersion: checkout.version - 1,
      discountCents: 2,
      surchargeCents: 0,
      discountReason: "Motivo diferente no replay",
      key: adjustmentKey,
    })
    expect(replay.version).toBe(checkout.version)
    expect(replay.total).toBe(9_999)
    checkout = await service.replaceTenders(actor, {
      checkoutId: checkout.id,
      expectedVersion: checkout.version,
      tenders: [
        { method: "pix", appliedCents: 4_999 },
        { method: "cash", appliedCents: 5_000, receivedCents: 6_000 },
      ],
      key: crypto.randomUUID(),
    })
    let day = await service.openCashDay(actor, {
      unitId: "revenue-unit-a",
      openingCashCents: 2_000,
      key: crypto.randomUUID(),
    })
    const availability = createAvailabilityService(
      db as never,
      async () => undefined,
      "revenue-operations-test-secret",
      hasOpenRevenueCashDay,
    )
    await expect(
      availability.timezone(actor.organizationId, "revenue-unit-a", "America/Sao_Paulo", 1),
    ).rejects.toMatchObject({ code: "timezone_in_use" })
    const receipt = await service.registerReceipt(actor, {
      checkoutId: checkout.id,
      expectedCheckoutVersion: checkout.version,
      expectedDayVersion: day.version,
      key: crypto.randomUUID(),
    })
    expect(receipt).toMatchObject({ totalCents: 9_999, changeCents: 1_000, status: "active" })
    expect(receipt.lines).toEqual([
      expect.objectContaining({ grossCents: 10_001, netCents: 9_999 }),
    ])
    day = await service.getCashDayById(actor, day.id)
    expect(day.summary).toMatchObject({
      openingCashCents: 2_000,
      cashReceiptCents: 5_000,
      expectedCashCents: 7_000,
      grossReceiptCents: 9_999,
      netReceiptCents: 9_999,
    })
  })

  it("serializes concurrent registration and closing without omitting an accepted entry", async () => {
    let checkout = await service.openCheckout(actor, visitIds[1], crypto.randomUUID())
    checkout = await service.replaceTenders(actor, {
      checkoutId: checkout.id,
      expectedVersion: checkout.version,
      tenders: [{ method: "cash", appliedCents: 5_000, receivedCents: 5_000 }],
      key: crypto.randomUUID(),
    })
    const day = await service.getCashDay(actor, "revenue-unit-a", "2026-09-05")
    if (!day) throw new Error("cash day fixture missing")
    const results = await Promise.allSettled([
      service.registerReceipt(actor, {
        checkoutId: checkout.id,
        expectedCheckoutVersion: checkout.version,
        expectedDayVersion: day.version,
        key: crypto.randomUUID(),
      }),
      service.closeDay(actor, {
        cashDayId: day.id,
        expectedVersion: day.version,
        countedCashCents: day.summary.expectedCashCents,
        key: crypto.randomUUID(),
      }),
    ])
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    const current = await service.getCashDayById(actor, day.id)
    if (current.status === "closed") {
      expect(current.closings.at(-1)?.snapshot).toMatchObject({
        grossReceiptCents: current.summary.grossReceiptCents,
      })
    } else {
      expect((await service.getCheckout(actor, checkout.id)).status).toBe("registered")
    }
  })

  it("uses immutable opposite entries for movements and receipt cancellation", async () => {
    let day = await service.getCashDay(actor, "revenue-unit-a", "2026-09-05")
    if (!day) throw new Error("cash day fixture missing")
    if (day.status === "closed")
      day = await service.reopenDay(actor, {
        cashDayId: day.id,
        expectedVersion: day.version,
        reason: "Reabrir para correção",
        key: crypto.randomUUID(),
      })
    day = await service.addMovement(actor, {
      cashDayId: day.id,
      kind: "supply",
      amountCents: 300,
      reason: "Suprimento operacional",
      expectedVersion: day.version,
      key: crypto.randomUUID(),
    })
    const supply = day.movements.find((movement) => movement.kind === "supply")
    if (!supply) throw new Error("supply fixture missing")
    day = await service.reverseMovement(actor, {
      cashDayId: day.id,
      movementId: supply.id,
      expectedVersion: day.version,
      reason: "Lançamento equivocado",
      key: crypto.randomUUID(),
    })
    expect(day.summary.supplyCents).toBe(0)

    const [receipt] = await db
      .select({ id: revenueReceipt.id })
      .from(revenueReceipt)
      .where(eq(revenueReceipt.status, "active"))
      .limit(1)
    if (!receipt) return
    await db
      .insert(revenueCashDay)
      .values({
        id: "revenue-prior-day-a",
        organizationId: actor.organizationId,
        unitId: "revenue-unit-a",
        localDate: "2026-09-04",
        timezone: "America/Recife",
        openingCashCents: 0,
        openedBy: actor.actorUserId,
        openedByName: "Revenue Owner",
      })
      .onConflictDoNothing()
    await db
      .update(revenueReceipt)
      .set({ cashDayId: "revenue-prior-day-a", localDate: "2026-09-04" })
      .where(eq(revenueReceipt.id, receipt.id))
    await db
      .update(revenueCashMovement)
      .set({ cashDayId: "revenue-prior-day-a" })
      .where(eq(revenueCashMovement.receiptId, receipt.id))
    const receiptBeforeReversal = await service.loadReceipt(actor, receipt.id)
    const priorBefore = await service.getCashDayById(actor, "revenue-prior-day-a")
    const currentBefore = await service.getCashDayById(actor, day.id)
    const checkoutBeforeReversal = await service.getCheckout(
      actor,
      receiptBeforeReversal.checkoutId,
    )
    const reversed = await service.reverseReceipt(actor, {
      receiptId: receipt.id,
      expectedCheckoutVersion: checkoutBeforeReversal.version,
      expectedDayVersion: day.version,
      reason: "Registro financeiro incorreto",
      key: crypto.randomUUID(),
    })
    expect(reversed.status).toBe("reversed")
    expect(reversed.reversal).toMatchObject({
      reason: "Registro financeiro incorreto",
      snapshot: {
        totalCents: -receiptBeforeReversal.totalCents,
        lines: [expect.objectContaining({ netCents: -receiptBeforeReversal.lines[0].netCents })],
      },
    })
    const priorAfter = await service.getCashDayById(actor, "revenue-prior-day-a")
    const currentAfter = await service.getCashDayById(actor, day.id)
    expect(priorAfter.summary).toMatchObject({
      grossReceiptCents: priorBefore.summary.grossReceiptCents,
      netReceiptCents: priorBefore.summary.grossReceiptCents,
      reversalCount: 0,
      reversedReceiptCents: 0,
    })
    expect(currentAfter.summary.reversalCount).toBe(currentBefore.summary.reversalCount + 1)
    expect(currentAfter.summary.reversedReceiptCents).toBe(
      currentBefore.summary.reversedReceiptCents + receiptBeforeReversal.totalCents,
    )
    const reversedMethod = receiptBeforeReversal.tenders[0]?.method
    expect(
      currentAfter.summary.paymentMethods.find(({ method }) => method === reversedMethod),
    ).toMatchObject({
      reversedCents: receiptBeforeReversal.tenders[0]?.appliedCents,
    })
    await expect(service.getCheckout(otherActor, reversed.checkoutId)).rejects.toMatchObject({
      code: "not_found",
    })
  })
})
