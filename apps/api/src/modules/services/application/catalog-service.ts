import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { z } from "zod"

import type { IdpDatabase } from "../../idp/database/client.js"
import { invitation, member, organizationInvitation, user } from "../../idp/database/schema.js"
import { normalizeEmail } from "../../idp/identity/access-policy.js"
import {
  createInvitationSecret,
  findPendingInvitationByEmail,
  lockPendingInvitationEmail,
} from "../../idp/identity/invitations.js"
import {
  professional,
  professionalInvitation,
  professionalUnit,
} from "../../professionals/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import { unit } from "../../units/database/schema.js"
import { professionalService, service, serviceUnit } from "../database/schema.js"

const weekdays = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
])
const openingPeriod = z
  .object({
    days: z.array(weekdays).min(1),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((value) => value.start < value.end)
const unitInput = z.object({
  address: z.string().trim().min(5).max(500),
  businessHours: z
    .object({
      days: z.array(weekdays).min(1),
      start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      periods: z.array(openingPeriod).min(1).max(14).optional(),
    })
    .refine((value) => value.start < value.end)
    .refine((value) => {
      const days = (value.periods ?? [value]).flatMap((period) => period.days)
      return new Set(days).size === days.length
    }),
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(160),
})
const professionalInput = z.object({
  commissionBasisPoints: z.number().int().min(0).max(10_000).default(0),
  role: z.string().trim().min(2).max(100),
  serviceIds: z.array(z.string()).max(50).default([]),
  specialties: z.array(z.string().trim().min(2).max(100)).max(30).default([]),
  unitIds: z.array(z.string()).max(50).default([]),
})
const professionalInvitationInput = professionalInput.extend({ email: z.email().max(254) })
const serviceInput = z.object({
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5).max(2_000),
  durationMinutes: z.number().int().min(15).max(300).multipleOf(15),
  name: z.string().trim().min(2).max(160),
  priceCents: z.number().int().min(0).max(100_000_000),
  professionalIds: z.array(z.string()).max(50).default([]),
  unitIds: z.array(z.string()).max(50).default([]),
})

export type CatalogKind = "professional" | "service" | "unit"
export class CatalogError extends Error {
  constructor(
    readonly code:
      | "already_member"
      | "invitation_pending"
      | "invalid_relation"
      | "invalid_request"
      | "not_found"
      | "version_conflict",
  ) {
    super(code)
  }
}
type CatalogDatabase = Omit<IdpDatabase, "$client">

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
}
function unique(values: readonly string[]) {
  return [...new Set(values)]
}

function uniqueRows<T extends { id: string }>(rows: readonly T[]) {
  return [...new Map(rows.map((row) => [row.id, row])).values()]
}

export function createCatalogService(db: IdpDatabase) {
  async function relations(organizationId: string, kind: CatalogKind, ids: readonly string[]) {
    const result = new Map<
      string,
      { professionalIds: string[]; serviceIds: string[]; unitIds: string[] }
    >()
    for (const id of ids) result.set(id, { professionalIds: [], serviceIds: [], unitIds: [] })
    if (ids.length === 0) return result
    if (kind === "professional") {
      const [units, services] = await Promise.all([
        db
          .select()
          .from(professionalUnit)
          .where(
            and(
              eq(professionalUnit.organizationId, organizationId),
              inArray(professionalUnit.professionalId, [...ids]),
            ),
          ),
        db
          .select()
          .from(professionalService)
          .where(
            and(
              eq(professionalService.organizationId, organizationId),
              inArray(professionalService.professionalId, [...ids]),
            ),
          ),
      ])
      for (const row of units) result.get(row.professionalId)?.unitIds.push(row.unitId)
      for (const row of services) result.get(row.professionalId)?.serviceIds.push(row.serviceId)
    } else if (kind === "service") {
      const [units, professionals] = await Promise.all([
        db
          .select()
          .from(serviceUnit)
          .where(
            and(
              eq(serviceUnit.organizationId, organizationId),
              inArray(serviceUnit.serviceId, [...ids]),
            ),
          ),
        db
          .select()
          .from(professionalService)
          .where(
            and(
              eq(professionalService.organizationId, organizationId),
              inArray(professionalService.serviceId, [...ids]),
            ),
          ),
      ])
      for (const row of units) result.get(row.serviceId)?.unitIds.push(row.unitId)
      for (const row of professionals)
        result.get(row.serviceId)?.professionalIds.push(row.professionalId)
    }
    return result
  }

  async function validateActiveIds(
    organizationId: string,
    tableKind: "professional" | "service" | "unit",
    ids: readonly string[],
    existingIds: readonly string[] = [],
  ) {
    const values = unique(ids)
    if (values.length === 0) return
    const rows =
      tableKind === "unit"
        ? await db
            .select({ id: unit.id })
            .from(unit)
            .where(
              and(
                eq(unit.organizationId, organizationId),
                or(eq(unit.status, "active"), inArray(unit.id, unique(existingIds))),
                inArray(unit.id, values),
              ),
            )
        : tableKind === "professional"
          ? await db
              .select({ id: professional.id })
              .from(professional)
              .where(
                and(
                  eq(professional.organizationId, organizationId),
                  or(
                    eq(professional.status, "active"),
                    inArray(professional.id, unique(existingIds)),
                  ),
                  inArray(professional.id, values),
                ),
              )
          : await db
              .select({ id: service.id })
              .from(service)
              .where(
                and(
                  eq(service.organizationId, organizationId),
                  or(eq(service.status, "active"), inArray(service.id, unique(existingIds))),
                  inArray(service.id, values),
                ),
              )
    if (rows.length !== values.length) throw new CatalogError("invalid_relation")
  }

  async function replaceProfessionalRelations(
    tx: CatalogDatabase,
    organizationId: string,
    professionalId: string,
    input: z.infer<typeof professionalInput>,
    preserveArchived = false,
  ) {
    const [existingUnits, existingServices] = preserveArchived
      ? await Promise.all([
          db
            .select({ id: professionalUnit.unitId })
            .from(professionalUnit)
            .where(
              and(
                eq(professionalUnit.organizationId, organizationId),
                eq(professionalUnit.professionalId, professionalId),
              ),
            ),
          db
            .select({ id: professionalService.serviceId })
            .from(professionalService)
            .where(
              and(
                eq(professionalService.organizationId, organizationId),
                eq(professionalService.professionalId, professionalId),
              ),
            ),
        ])
      : [[], []]
    await validateActiveIds(
      organizationId,
      "unit",
      input.unitIds,
      existingUnits.map(({ id }) => id),
    )
    if (input.serviceIds.length) {
      await validateActiveIds(
        organizationId,
        "service",
        input.serviceIds,
        existingServices.map(({ id }) => id),
      )
      const sharedServices = await db
        .select({ serviceId: serviceUnit.serviceId })
        .from(serviceUnit)
        .where(
          and(
            eq(serviceUnit.organizationId, organizationId),
            inArray(serviceUnit.serviceId, unique(input.serviceIds)),
            inArray(serviceUnit.unitId, unique(input.unitIds)),
          ),
        )
      if (
        new Set(sharedServices.map((row) => row.serviceId)).size !== unique(input.serviceIds).length
      )
        throw new CatalogError("invalid_relation")
    }
    await tx
      .delete(professionalUnit)
      .where(
        and(
          eq(professionalUnit.organizationId, organizationId),
          eq(professionalUnit.professionalId, professionalId),
        ),
      )
    if (input.unitIds.length)
      await tx
        .insert(professionalUnit)
        .values(unique(input.unitIds).map((unitId) => ({ organizationId, professionalId, unitId })))
    await tx
      .delete(professionalService)
      .where(
        and(
          eq(professionalService.organizationId, organizationId),
          eq(professionalService.professionalId, professionalId),
        ),
      )
    if (input.serviceIds.length)
      await tx.insert(professionalService).values(
        unique(input.serviceIds).map((serviceId) => ({
          organizationId,
          professionalId,
          serviceId,
        })),
      )
  }

  async function replaceServiceRelations(
    tx: CatalogDatabase,
    organizationId: string,
    serviceId: string,
    input: z.infer<typeof serviceInput>,
    preserveArchived = false,
  ) {
    const [existingUnits, existingProfessionals] = preserveArchived
      ? await Promise.all([
          db
            .select({ id: serviceUnit.unitId })
            .from(serviceUnit)
            .where(
              and(
                eq(serviceUnit.organizationId, organizationId),
                eq(serviceUnit.serviceId, serviceId),
              ),
            ),
          db
            .select({ id: professionalService.professionalId })
            .from(professionalService)
            .where(
              and(
                eq(professionalService.organizationId, organizationId),
                eq(professionalService.serviceId, serviceId),
              ),
            ),
        ])
      : [[], []]
    await validateActiveIds(
      organizationId,
      "unit",
      input.unitIds,
      existingUnits.map(({ id }) => id),
    )
    await validateActiveIds(
      organizationId,
      "professional",
      input.professionalIds,
      existingProfessionals.map(({ id }) => id),
    )
    if (input.professionalIds.length) {
      const shared = await db
        .select({ professionalId: professionalUnit.professionalId })
        .from(professionalUnit)
        .where(
          and(
            eq(professionalUnit.organizationId, organizationId),
            inArray(professionalUnit.professionalId, unique(input.professionalIds)),
            inArray(professionalUnit.unitId, unique(input.unitIds)),
          ),
        )
      if (
        new Set(shared.map((row) => row.professionalId)).size !==
        unique(input.professionalIds).length
      )
        throw new CatalogError("invalid_relation")
    }
    await tx
      .delete(serviceUnit)
      .where(
        and(eq(serviceUnit.organizationId, organizationId), eq(serviceUnit.serviceId, serviceId)),
      )
    await tx
      .delete(professionalService)
      .where(
        and(
          eq(professionalService.organizationId, organizationId),
          eq(professionalService.serviceId, serviceId),
        ),
      )
    if (input.unitIds.length)
      await tx
        .insert(serviceUnit)
        .values(unique(input.unitIds).map((unitId) => ({ organizationId, serviceId, unitId })))
    if (input.professionalIds.length)
      await tx.insert(professionalService).values(
        unique(input.professionalIds).map((professionalId) => ({
          organizationId,
          professionalId,
          serviceId,
        })),
      )
  }

  async function list(
    organizationId: string,
    kind: CatalogKind,
    rawQuery: Record<string, string | undefined>,
  ) {
    const page = Math.max(1, Number(rawQuery.page) || 1)
    const pageSize = [10, 20, 50].includes(Number(rawQuery.pageSize))
      ? Number(rawQuery.pageSize)
      : 20
    const status =
      rawQuery.status === "archived" ? "archived" : rawQuery.status === "all" ? undefined : "active"
    const search = rawQuery.search?.trim()
      ? `%${rawQuery.search.trim().replace(/[\\%_]/g, "\\$&")}%`
      : undefined
    if (kind === "professional") {
      const predicate = and(
        eq(professional.organizationId, organizationId),
        status ? eq(professional.status, status) : undefined,
        search ? ilike(user.name, search) : undefined,
      )
      const direction = rawQuery.sortDirection === "desc" ? desc : asc
      const [rows, total] = await Promise.all([
        db
          .select({ professional, userName: user.name })
          .from(professional)
          .innerJoin(user, eq(professional.globalUserId, user.id))
          .where(predicate)
          .orderBy(
            direction(rawQuery.sortBy === "status" ? professional.status : user.name),
            direction(professional.id),
          )
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db
          .select({ value: count() })
          .from(professional)
          .innerJoin(user, eq(professional.globalUserId, user.id))
          .where(predicate),
      ])
      const relationMap = await relations(
        organizationId,
        kind,
        rows.map(({ professional: item }) => item.id),
      )
      return {
        items: rows.map(({ professional: item, userName }) =>
          present(kind, { ...item, name: userName }, relationMap.get(item.id)),
        ),
        page,
        pageSize,
        totalCount: total[0]?.value ?? 0,
        totalPages: Math.max(1, Math.ceil((total[0]?.value ?? 0) / pageSize)),
      }
    }
    const table = kind === "unit" ? unit : service
    const predicate = and(
      eq(table.organizationId, organizationId),
      status ? eq(table.status, status) : undefined,
      search ? or(ilike(table.name, search)) : undefined,
    )
    const direction = rawQuery.sortDirection === "desc" ? desc : asc
    const [items, total] = await Promise.all([
      db
        .select()
        .from(table)
        .where(predicate)
        .orderBy(
          direction(rawQuery.sortBy === "status" ? table.status : table.name),
          direction(table.id),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count() }).from(table).where(predicate),
    ])
    const relationMap = await relations(
      organizationId,
      kind,
      items.map((item) => item.id),
    )
    return {
      items: items.map((item) => present(kind, item, relationMap.get(item.id))),
      page,
      pageSize,
      totalCount: total[0]?.value ?? 0,
      totalPages: Math.max(1, Math.ceil((total[0]?.value ?? 0) / pageSize)),
    }
  }

  async function get(organizationId: string, kind: CatalogKind, id: string) {
    if (kind === "professional") {
      const [row] = await db
        .select({ professional, userName: user.name })
        .from(professional)
        .innerJoin(user, eq(professional.globalUserId, user.id))
        .where(and(eq(professional.organizationId, organizationId), eq(professional.id, id)))
        .limit(1)
      if (!row) throw new CatalogError("not_found")
      const relationMap = await relations(organizationId, kind, [id])
      return present(kind, { ...row.professional, name: row.userName }, relationMap.get(id))
    }
    const table = kind === "unit" ? unit : service
    const rows = await db
      .select()
      .from(table)
      .where(and(eq(table.organizationId, organizationId), eq(table.id, id)))
      .limit(1)
    const item = rows[0]
    if (!item) throw new CatalogError("not_found")
    const relationMap = await relations(organizationId, kind, [id])
    return present(kind, item, relationMap.get(id))
  }

  async function options(
    organizationId: string,
    kind: CatalogKind,
    rawQuery: Record<string, string | undefined>,
  ) {
    if (kind === "professional") {
      const selectedIds = unique((rawQuery.selectedIds ?? "").split(",").filter(Boolean)).slice(
        0,
        50,
      )
      const search = rawQuery.search?.trim()
        ? `%${rawQuery.search.trim().replace(/[\\%_]/g, "\\$&")}%`
        : undefined
      const activeRows = await db
        .select({ id: professional.id, name: user.name, status: professional.status })
        .from(professional)
        .innerJoin(user, eq(professional.globalUserId, user.id))
        .where(
          and(
            eq(professional.organizationId, organizationId),
            rawQuery.all === "true" ? undefined : eq(professional.status, "active"),
            search ? ilike(user.name, search) : undefined,
          ),
        )
        .orderBy(asc(user.name), asc(professional.id))
        .limit(rawQuery.all === "true" ? 10_000 : 50)
      const selectedRows = selectedIds.length
        ? await db
            .select({ id: professional.id, name: user.name, status: professional.status })
            .from(professional)
            .innerJoin(user, eq(professional.globalUserId, user.id))
            .where(
              and(
                eq(professional.organizationId, organizationId),
                inArray(professional.id, selectedIds),
              ),
            )
        : []
      const rows = uniqueRows([...selectedRows, ...activeRows])
      const relationMap = await relations(
        organizationId,
        kind,
        rows.map((row) => row.id),
      )
      return rows.map((row) => ({
        ...row,
        unitIds: relationMap.get(row.id)?.unitIds ?? [],
      }))
    }
    const table = kind === "unit" ? unit : service
    const selectedIds = unique((rawQuery.selectedIds ?? "").split(",").filter(Boolean)).slice(0, 50)
    const search = rawQuery.search?.trim()
      ? `%${rawQuery.search.trim().replace(/[\\%_]/g, "\\$&")}%`
      : undefined
    const activeRows = await db
      .select()
      .from(table)
      .where(
        and(
          eq(table.organizationId, organizationId),
          rawQuery.all === "true" ? undefined : eq(table.status, "active"),
          search ? ilike(table.name, search) : undefined,
        ),
      )
      .orderBy(asc(table.name), asc(table.id))
      .limit(rawQuery.all === "true" ? 10_000 : 50)
    const selectedRows = selectedIds.length
      ? await db
          .select()
          .from(table)
          .where(and(eq(table.organizationId, organizationId), inArray(table.id, selectedIds)))
      : []
    const rows = uniqueRows([...selectedRows, ...activeRows])
    const relationMap = await relations(
      organizationId,
      kind,
      rows.map((row) => row.id),
    )
    return rows.map((row) => {
      const data: CatalogRow = row
      const links = relationMap.get(row.id)
      if (kind === "service")
        return {
          id: row.id,
          name: row.name,
          status: row.status,
          durationMinutes: data.durationMinutes,
          priceCents: data.priceCents,
          professionalIds: links?.professionalIds ?? [],
          unitIds: links?.unitIds ?? [],
        }
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        businessHours: {
          days: data.openingDays,
          start: data.openingStart,
          end: data.openingEnd,
          periods: openingPeriods(data.openingPeriods).length
            ? openingPeriods(data.openingPeriods)
            : [{ days: data.openingDays, start: data.openingStart, end: data.openingEnd }],
        },
      }
    })
  }

  async function inviteProfessional(
    organizationId: string,
    invitedByUserId: string,
    rawInput: unknown,
  ) {
    const input = professionalInvitationInput.parse(rawInput)
    await validateActiveIds(organizationId, "unit", input.unitIds)
    await validateActiveIds(organizationId, "service", input.serviceIds)
    if (input.serviceIds.length) {
      const sharedServices = await db
        .select({ serviceId: serviceUnit.serviceId })
        .from(serviceUnit)
        .where(
          and(
            eq(serviceUnit.organizationId, organizationId),
            inArray(serviceUnit.serviceId, unique(input.serviceIds)),
            inArray(serviceUnit.unitId, unique(input.unitIds)),
          ),
        )
      if (
        new Set(sharedServices.map((row) => row.serviceId)).size !== unique(input.serviceIds).length
      )
        throw new CatalogError("invalid_relation")
    }
    const email = normalizeEmail(input.email)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    return db.transaction(async (transaction) => {
      const tx = transaction as unknown as IdpDatabase
      await lockPendingInvitationEmail(tx, email)
      if (await findPendingInvitationByEmail(tx, email)) {
        throw new CatalogError("invitation_pending")
      }
      const [existingUser] = await tx
        .select({ id: user.id, status: user.status })
        .from(user)
        .where(eq(user.email, email))
        .limit(1)
      if (existingUser?.status === "disabled") throw new CatalogError("invalid_request")
      let hasActiveMembership = false
      if (existingUser) {
        const [existingProfessional] = await tx
          .select({ id: professional.id })
          .from(professional)
          .where(
            and(
              eq(professional.organizationId, organizationId),
              eq(professional.globalUserId, existingUser.id),
            ),
          )
          .limit(1)
        if (existingProfessional) throw new CatalogError("already_member")
        const [existingMembership] = await tx
          .select({ id: member.id, status: member.status })
          .from(member)
          .where(and(eq(member.organizationId, organizationId), eq(member.userId, existingUser.id)))
          .limit(1)
        if (existingMembership?.status === "disabled") throw new CatalogError("invalid_request")
        hasActiveMembership = existingMembership?.status === "active"
      }

      const identityInvitationId = createId()
      const secret = createInvitationSecret()
      await tx.insert(invitation).values({
        email,
        expiresAt,
        id: identityInvitationId,
        invitedByUserId,
        role: "member",
        status: "pending",
        tokenDigest: secret.digest,
        tokenIssuedAt: new Date(),
      })
      if (!hasActiveMembership)
        await tx.insert(organizationInvitation).values({
          email,
          expiresAt,
          id: createId(),
          inviterId: invitedByUserId,
          organizationId,
          role: "member",
          status: "pending",
        })
      await tx.insert(professionalInvitation).values({
        assignments: { serviceIds: unique(input.serviceIds), unitIds: unique(input.unitIds) },
        commissionBasisPoints: input.commissionBasisPoints,
        email,
        id: createId(),
        identityInvitationId,
        organizationId,
        role: input.role,
        specialties: unique(input.specialties),
      })

      return {
        email,
        expiresAt,
        identityInvitationId,
        mode: "invited" as const,
        token: secret.token,
      }
    })
  }

  async function revokeUndeliveredProfessionalInvitation(
    organizationId: string,
    identityInvitationId: string,
    email: string,
  ) {
    await db.transaction(async (transaction) => {
      const tx = transaction as unknown as IdpDatabase
      const now = new Date()
      await Promise.all([
        tx
          .update(invitation)
          .set({ status: "revoked", updatedAt: now })
          .where(and(eq(invitation.id, identityInvitationId), eq(invitation.status, "pending"))),
        tx
          .update(professionalInvitation)
          .set({ status: "revoked", updatedAt: now })
          .where(
            and(
              eq(professionalInvitation.organizationId, organizationId),
              eq(professionalInvitation.identityInvitationId, identityInvitationId),
              eq(professionalInvitation.status, "pending"),
            ),
          ),
        tx
          .update(organizationInvitation)
          .set({ status: "canceled" })
          .where(
            and(
              eq(organizationInvitation.organizationId, organizationId),
              eq(organizationInvitation.email, email),
              eq(organizationInvitation.status, "pending"),
            ),
          ),
      ])
    })
  }

  async function create(organizationId: string, kind: CatalogKind, rawInput: unknown) {
    try {
      if (kind === "unit") {
        const input = unitInput.parse(rawInput)
        const id = createId()
        await db.insert(unit).values({
          id,
          organizationId,
          address: input.address,
          code: input.code,
          normalizedCode: normalize(input.code),
          name: input.name,
          openingDays: input.businessHours.days,
          openingStart: input.businessHours.start,
          openingEnd: input.businessHours.end,
          openingPeriods: input.businessHours.periods ?? [input.businessHours],
        })
        return get(organizationId, kind, id)
      }
      if (kind === "professional") {
        throw new CatalogError("invalid_request")
      }
      const input = serviceInput.parse(rawInput)
      const id = createId()
      await db.transaction(async (tx) => {
        await tx.insert(service).values({
          id,
          organizationId,
          category: input.category,
          description: input.description,
          durationMinutes: input.durationMinutes,
          name: input.name,
          normalizedName: normalize(input.name),
          priceCents: input.priceCents,
        })
        await replaceServiceRelations(tx, organizationId, id, input)
      })
      return get(organizationId, kind, id)
    } catch (error) {
      if (error instanceof CatalogError) throw error
      throw new CatalogError("invalid_request")
    }
  }

  async function update(
    organizationId: string,
    kind: CatalogKind,
    id: string,
    version: number,
    rawInput: unknown,
  ) {
    try {
      await db.transaction(async (tx) => {
        if (kind === "unit") {
          const input = unitInput.parse(rawInput)
          const changed = await tx
            .update(unit)
            .set({
              address: input.address,
              code: input.code,
              normalizedCode: normalize(input.code),
              name: input.name,
              openingDays: input.businessHours.days,
              openingStart: input.businessHours.start,
              openingEnd: input.businessHours.end,
              openingPeriods: input.businessHours.periods ?? [input.businessHours],
              updatedAt: new Date(),
              version: sql`${unit.version} + 1`,
            })
            .where(
              and(
                eq(unit.organizationId, organizationId),
                eq(unit.id, id),
                eq(unit.version, version),
              ),
            )
            .returning({ id: unit.id })
          if (!changed.length) throw new CatalogError("version_conflict")
        } else if (kind === "professional") {
          const input = professionalInput.parse(rawInput)
          const changed = await tx
            .update(professional)
            .set({
              commissionBasisPoints: input.commissionBasisPoints,
              role: input.role,
              specialties: unique(input.specialties),
              updatedAt: new Date(),
              version: sql`${professional.version} + 1`,
            })
            .where(
              and(
                eq(professional.organizationId, organizationId),
                eq(professional.id, id),
                eq(professional.version, version),
              ),
            )
            .returning({ id: professional.id })
          if (!changed.length) throw new CatalogError("version_conflict")
          await replaceProfessionalRelations(tx, organizationId, id, input, true)
        } else {
          const input = serviceInput.parse(rawInput)
          const changed = await tx
            .update(service)
            .set({
              category: input.category,
              description: input.description,
              durationMinutes: input.durationMinutes,
              name: input.name,
              normalizedName: normalize(input.name),
              priceCents: input.priceCents,
              updatedAt: new Date(),
              version: sql`${service.version} + 1`,
            })
            .where(
              and(
                eq(service.organizationId, organizationId),
                eq(service.id, id),
                eq(service.version, version),
              ),
            )
            .returning({ id: service.id })
          if (!changed.length) throw new CatalogError("version_conflict")
          await replaceServiceRelations(tx, organizationId, id, input, true)
        }
      })
      return get(organizationId, kind, id)
    } catch (error) {
      if (error instanceof CatalogError) throw error
      throw new CatalogError("invalid_request")
    }
  }

  async function setArchived(
    organizationId: string,
    kind: CatalogKind,
    id: string,
    archived: boolean,
    version: number,
  ) {
    const table = kind === "unit" ? unit : kind === "professional" ? professional : service
    const changed = await db
      .update(table)
      .set({
        status: archived ? "archived" : "active",
        updatedAt: new Date(),
        version: sql`${table.version} + 1`,
      })
      .where(
        and(eq(table.organizationId, organizationId), eq(table.id, id), eq(table.version, version)),
      )
      .returning({ id: table.id })
    if (!changed.length) {
      const exists = await db
        .select({ id: table.id })
        .from(table)
        .where(and(eq(table.organizationId, organizationId), eq(table.id, id)))
        .limit(1)
      throw new CatalogError(exists.length ? "version_conflict" : "not_found")
    }
    return get(organizationId, kind, id)
  }

  return {
    create,
    get,
    inviteProfessional,
    list,
    options,
    revokeUndeliveredProfessionalInvitation,
    setArchived,
    update,
  }
}

type CatalogRow = {
  id: string
  status: "active" | "archived"
  version: number
  createdAt: Date
  updatedAt: Date
  name: string
} & Record<string, unknown>

function openingPeriods(value: unknown) {
  return value as readonly { days: readonly string[]; end: string; start: string }[]
}

function present(
  kind: CatalogKind,
  item: CatalogRow,
  links = { professionalIds: [] as string[], serviceIds: [] as string[], unitIds: [] as string[] },
) {
  const base = {
    ...item,
    kind,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
  if (kind === "unit")
    return {
      ...base,
      businessHours: {
        days: item.openingDays,
        start: item.openingStart,
        end: item.openingEnd,
        periods: openingPeriods(item.openingPeriods).length
          ? openingPeriods(item.openingPeriods)
          : [{ days: item.openingDays, start: item.openingStart, end: item.openingEnd }],
      },
      openingDays: undefined,
      openingStart: undefined,
      openingEnd: undefined,
      openingPeriods: undefined,
    }
  if (kind === "professional")
    return {
      ...base,
      accountAccess: "connected",
      professionalIds: undefined,
      serviceIds: links.serviceIds,
      unitIds: links.unitIds,
    }
  return { ...base, professionalIds: links.professionalIds, unitIds: links.unitIds }
}

export type CatalogService = ReturnType<typeof createCatalogService>
