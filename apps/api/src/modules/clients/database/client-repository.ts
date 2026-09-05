import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm"
import type { IdpDatabase } from "../../idp/database/client.js"
import { user } from "../../idp/database/schema.js"
import { professional } from "../../professionals/database/schema.js"
import { service } from "../../services/database/schema.js"
import { createId } from "../../shared/infra/ids.js"
import { unit } from "../../units/database/schema.js"
import type {
  ClientDetail,
  ClientRepository,
  DuplicateCandidate,
} from "../application/client-repository.js"
import type { ClientListQuery } from "../domain/client-query.js"
import {
  client,
  clientNote,
  clientProfessionalPreference,
  clientServicePreference,
  clientUnitPreference,
} from "./schema.js"

const clientProjection = {
  createdAt: client.createdAt,
  email: client.email,
  id: client.id,
  name: client.name,
  phone: client.phone,
  preferenceNote: client.preferenceNote,
  servicePreferences: client.servicePreferences,
  status: client.status,
  tags: client.tags,
  updatedAt: client.updatedAt,
  version: client.version,
}

export function createDrizzleClientRepository(db: IdpDatabase): ClientRepository {
  async function get(input: {
    clientId: string
    organizationId: string
  }): Promise<ClientDetail | null> {
    const [record] = await db
      .select(clientProjection)
      .from(client)
      .where(and(eq(client.organizationId, input.organizationId), eq(client.id, input.clientId)))
      .limit(1)
    if (!record) return null

    const [notes, professionalPreferences, preferredServices, unitPreferences] = await Promise.all([
      db
        .select({
          body: clientNote.body,
          createdAt: clientNote.createdAt,
          id: clientNote.id,
          updatedAt: clientNote.updatedAt,
          version: clientNote.version,
        })
        .from(clientNote)
        .where(
          and(
            eq(clientNote.organizationId, input.organizationId),
            eq(clientNote.clientId, input.clientId),
          ),
        )
        .orderBy(desc(clientNote.createdAt), desc(clientNote.id))
        .limit(100),
      db
        .select({ id: professional.id, name: user.name, status: professional.status })
        .from(clientProfessionalPreference)
        .innerJoin(
          professional,
          and(
            eq(professional.organizationId, clientProfessionalPreference.organizationId),
            eq(professional.id, clientProfessionalPreference.professionalId),
          ),
        )
        .innerJoin(user, eq(user.id, professional.globalUserId))
        .where(
          and(
            eq(clientProfessionalPreference.organizationId, input.organizationId),
            eq(clientProfessionalPreference.clientId, input.clientId),
          ),
        )
        .orderBy(asc(user.name))
        .limit(5),
      db
        .select({ id: service.id, name: service.name, status: service.status })
        .from(clientServicePreference)
        .innerJoin(
          service,
          and(
            eq(service.organizationId, clientServicePreference.organizationId),
            eq(service.id, clientServicePreference.serviceId),
          ),
        )
        .where(
          and(
            eq(clientServicePreference.organizationId, input.organizationId),
            eq(clientServicePreference.clientId, input.clientId),
          ),
        )
        .orderBy(asc(service.name))
        .limit(20),
      db
        .select({ id: unit.id, name: unit.name, status: unit.status })
        .from(clientUnitPreference)
        .innerJoin(
          unit,
          and(
            eq(unit.organizationId, clientUnitPreference.organizationId),
            eq(unit.id, clientUnitPreference.unitId),
          ),
        )
        .where(
          and(
            eq(clientUnitPreference.organizationId, input.organizationId),
            eq(clientUnitPreference.clientId, input.clientId),
          ),
        )
        .orderBy(asc(unit.name))
        .limit(5),
    ])

    return { ...record, notes, professionalPreferences, preferredServices, unitPreferences }
  }

  return {
    async addNote(input) {
      await db.insert(clientNote).values({
        body: input.body,
        clientId: input.clientId,
        id: createId(),
        organizationId: input.organizationId,
      })
      const detail = await get(input)
      if (!detail) throw new Error("Client disappeared after note creation.")
      return detail
    },

    async create({ activeClientLimit, organizationId, profile }) {
      const id = await db.transaction(async (transaction) => {
        const tx = transaction as unknown as IdpDatabase
        if (activeClientLimit !== undefined) {
          await lockClientCapacity(tx, organizationId)
          if (await clientCapacityReached(tx, organizationId, activeClientLimit)) return null
        }
        const newId = createId()
        const {
          professionalPreferenceIds,
          servicePreferenceIds,
          unitPreferenceIds,
          ...storedProfile
        } = profile
        await tx.insert(client).values({
          ...storedProfile,
          id: newId,
          organizationId,
          servicePreferences: [...profile.servicePreferences],
          tags: [...profile.tags],
        })
        await replacePreferences(tx, organizationId, newId, {
          professionalPreferenceIds: professionalPreferenceIds ?? [],
          servicePreferenceIds: servicePreferenceIds ?? [],
          unitPreferenceIds: unitPreferenceIds ?? [],
        })
        return newId
      })
      if (!id) return "quota_reached"
      const detail = await get({ clientId: id, organizationId })
      if (!detail) throw new Error("Client disappeared after creation.")
      return detail
    },

    async findDuplicates(input) {
      const predicates = []
      if (input.normalizedEmail) {
        predicates.push(eq(client.normalizedEmail, input.normalizedEmail))
      }
      if (input.normalizedPhone) {
        predicates.push(eq(client.normalizedPhone, input.normalizedPhone))
      }
      if (predicates.length === 0) return []

      const rows = await db
        .select({
          id: client.id,
          name: client.name,
          normalizedEmail: client.normalizedEmail,
          normalizedPhone: client.normalizedPhone,
        })
        .from(client)
        .where(
          and(
            eq(client.organizationId, input.organizationId),
            or(...predicates),
            input.excludingId ? ne(client.id, input.excludingId) : undefined,
          ),
        )
        .orderBy(asc(client.name), asc(client.id))
        .limit(100)

      return rows.flatMap((row): DuplicateCandidate[] => {
        const matches: DuplicateCandidate[] = []
        if (input.normalizedEmail && row.normalizedEmail === input.normalizedEmail) {
          matches.push({ candidateId: row.id, candidateName: row.name, field: "email" })
        }
        if (input.normalizedPhone && row.normalizedPhone === input.normalizedPhone) {
          matches.push({ candidateId: row.id, candidateName: row.name, field: "phone" })
        }
        return matches
      })
    },

    get,

    async list({ organizationId, query }) {
      const where = createListPredicate(organizationId, query)
      const order = createListOrder(query)
      const offset = (query.page - 1) * query.pageSize
      const [items, [total]] = await Promise.all([
        db
          .select(clientProjection)
          .from(client)
          .where(where)
          .orderBy(...order)
          .limit(query.pageSize)
          .offset(offset),
        db.select({ value: count() }).from(client).where(where),
      ])
      const totalCount = total?.value ?? 0
      return {
        items,
        page: query.page,
        pageSize: query.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / query.pageSize),
      }
    },

    async listTags({ organizationId }) {
      const tagExpression = sql<string>`unnest(${client.tags})`
      const rows = await db
        .selectDistinct({ tag: tagExpression })
        .from(client)
        .where(eq(client.organizationId, organizationId))
        .orderBy(asc(tagExpression))
        .limit(100)
      return rows.map(({ tag }) => tag)
    },

    async removeNote(input) {
      const removed = await db
        .delete(clientNote)
        .where(
          and(
            eq(clientNote.organizationId, input.organizationId),
            eq(clientNote.clientId, input.clientId),
            eq(clientNote.id, input.noteId),
            eq(clientNote.version, input.noteVersion),
          ),
        )
        .returning({ id: clientNote.id })
      if (removed.length > 0) return "updated"
      return classifyNoteMiss(db, input)
    },

    async setArchived(input) {
      const updated = await db.transaction(async (transaction) => {
        const tx = transaction as unknown as IdpDatabase
        if (!input.archived && input.activeClientLimit !== undefined) {
          await lockClientCapacity(tx, input.organizationId)
          if (await clientCapacityReached(tx, input.organizationId, input.activeClientLimit)) {
            return null
          }
        }
        return tx
          .update(client)
          .set({
            status: input.archived ? "archived" : "active",
            updatedAt: new Date(),
            version: sql`${client.version} + 1`,
          })
          .where(
            and(
              eq(client.organizationId, input.organizationId),
              eq(client.id, input.clientId),
              eq(client.version, input.version),
            ),
          )
          .returning({ id: client.id })
      })
      if (updated === null) return "quota_reached"
      if (updated.length > 0) return "updated"
      return classifyClientMiss(db, input)
    },

    async update(input) {
      const updated = await db.transaction(async (transaction) => {
        const tx = transaction as unknown as IdpDatabase
        const {
          professionalPreferenceIds,
          servicePreferenceIds,
          unitPreferenceIds,
          ...storedProfile
        } = input.profile
        const rows = await tx
          .update(client)
          .set({
            ...storedProfile,
            servicePreferences: [...input.profile.servicePreferences],
            tags: [...input.profile.tags],
            updatedAt: new Date(),
            version: sql`${client.version} + 1`,
          })
          .where(
            and(
              eq(client.organizationId, input.organizationId),
              eq(client.id, input.clientId),
              eq(client.version, input.version),
            ),
          )
          .returning({ id: client.id })
        if (rows.length)
          await replacePreferences(tx, input.organizationId, input.clientId, {
            professionalPreferenceIds: professionalPreferenceIds ?? [],
            servicePreferenceIds: servicePreferenceIds ?? [],
            unitPreferenceIds: unitPreferenceIds ?? [],
          })
        return rows
      })
      if (updated.length > 0) return "updated"
      return classifyClientMiss(db, input)
    },

    async updateNote(input) {
      const updated = await db
        .update(clientNote)
        .set({ body: input.body, updatedAt: new Date(), version: sql`${clientNote.version} + 1` })
        .where(
          and(
            eq(clientNote.organizationId, input.organizationId),
            eq(clientNote.clientId, input.clientId),
            eq(clientNote.id, input.noteId),
            eq(clientNote.version, input.noteVersion),
          ),
        )
        .returning({ id: clientNote.id })
      if (updated.length > 0) return "updated"
      return classifyNoteMiss(db, input)
    },
  }
}

async function lockClientCapacity(db: IdpDatabase, organizationId: string) {
  await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${organizationId}, 0))`)
}

async function clientCapacityReached(
  db: IdpDatabase,
  organizationId: string,
  activeClientLimit: number,
) {
  const [usage] = await db
    .select({ value: count() })
    .from(client)
    .where(and(eq(client.organizationId, organizationId), eq(client.status, "active")))
  return (usage?.value ?? 0) >= activeClientLimit
}

async function replacePreferences(
  db: IdpDatabase,
  organizationId: string,
  clientId: string,
  input: {
    professionalPreferenceIds: readonly string[]
    servicePreferenceIds: readonly string[]
    unitPreferenceIds: readonly string[]
  },
) {
  const [currentProfessionals, currentServices, currentUnits] = await Promise.all([
    db
      .select({ id: clientProfessionalPreference.professionalId })
      .from(clientProfessionalPreference)
      .where(
        and(
          eq(clientProfessionalPreference.organizationId, organizationId),
          eq(clientProfessionalPreference.clientId, clientId),
        ),
      ),
    db
      .select({ id: clientServicePreference.serviceId })
      .from(clientServicePreference)
      .where(
        and(
          eq(clientServicePreference.organizationId, organizationId),
          eq(clientServicePreference.clientId, clientId),
        ),
      ),
    db
      .select({ id: clientUnitPreference.unitId })
      .from(clientUnitPreference)
      .where(
        and(
          eq(clientUnitPreference.organizationId, organizationId),
          eq(clientUnitPreference.clientId, clientId),
        ),
      ),
  ])
  const currentProfessionalIds = currentProfessionals.map(({ id }) => id)
  const currentServiceIds = currentServices.map(({ id }) => id)
  const currentUnitIds = currentUnits.map(({ id }) => id)
  const [professionals, services, units] = await Promise.all([
    input.professionalPreferenceIds.length
      ? db
          .select({ value: count() })
          .from(professional)
          .where(
            and(
              eq(professional.organizationId, organizationId),
              or(
                eq(professional.status, "active"),
                currentProfessionalIds.length
                  ? inArray(professional.id, currentProfessionalIds)
                  : eq(professional.status, "active"),
              ),
              or(...input.professionalPreferenceIds.map((id) => eq(professional.id, id))),
            ),
          )
      : [{ value: 0 }],
    input.servicePreferenceIds.length
      ? db
          .select({ value: count() })
          .from(service)
          .where(
            and(
              eq(service.organizationId, organizationId),
              or(
                eq(service.status, "active"),
                currentServiceIds.length
                  ? inArray(service.id, currentServiceIds)
                  : eq(service.status, "active"),
              ),
              or(...input.servicePreferenceIds.map((id) => eq(service.id, id))),
            ),
          )
      : [{ value: 0 }],
    input.unitPreferenceIds.length
      ? db
          .select({ value: count() })
          .from(unit)
          .where(
            and(
              eq(unit.organizationId, organizationId),
              or(
                eq(unit.status, "active"),
                currentUnitIds.length
                  ? inArray(unit.id, currentUnitIds)
                  : eq(unit.status, "active"),
              ),
              or(...input.unitPreferenceIds.map((id) => eq(unit.id, id))),
            ),
          )
      : [{ value: 0 }],
  ])
  if (
    (professionals[0]?.value ?? 0) !== input.professionalPreferenceIds.length ||
    (services[0]?.value ?? 0) !== input.servicePreferenceIds.length ||
    (units[0]?.value ?? 0) !== input.unitPreferenceIds.length
  )
    throw new Error("invalid_catalog_preference")
  await Promise.all([
    db
      .delete(clientProfessionalPreference)
      .where(
        and(
          eq(clientProfessionalPreference.organizationId, organizationId),
          eq(clientProfessionalPreference.clientId, clientId),
        ),
      ),
    db
      .delete(clientServicePreference)
      .where(
        and(
          eq(clientServicePreference.organizationId, organizationId),
          eq(clientServicePreference.clientId, clientId),
        ),
      ),
    db
      .delete(clientUnitPreference)
      .where(
        and(
          eq(clientUnitPreference.organizationId, organizationId),
          eq(clientUnitPreference.clientId, clientId),
        ),
      ),
  ])
  if (input.professionalPreferenceIds.length)
    await db.insert(clientProfessionalPreference).values(
      input.professionalPreferenceIds.map((professionalId) => ({
        clientId,
        organizationId,
        professionalId,
      })),
    )
  if (input.servicePreferenceIds.length)
    await db
      .insert(clientServicePreference)
      .values(
        input.servicePreferenceIds.map((serviceId) => ({ clientId, organizationId, serviceId })),
      )
  if (input.unitPreferenceIds.length)
    await db
      .insert(clientUnitPreference)
      .values(input.unitPreferenceIds.map((unitId) => ({ clientId, organizationId, unitId })))
}

function createListPredicate(organizationId: string, query: ClientListQuery) {
  const search = query.search ? `%${escapeLike(query.search)}%` : null
  const duplicatePredicate = sql`exists (
    select 1 from ${client} duplicate_client
    where duplicate_client.organization_id = ${client.organizationId}
      and duplicate_client.id <> ${client.id}
      and (
        (${client.normalizedEmail} is not null and duplicate_client.normalized_email = ${client.normalizedEmail})
        or (${client.normalizedPhone} is not null and duplicate_client.normalized_phone = ${client.normalizedPhone})
      )
  )`

  return and(
    eq(client.organizationId, organizationId),
    eq(client.status, query.status),
    search
      ? or(ilike(client.name, search), ilike(client.email, search), ilike(client.phone, search))
      : undefined,
    query.contact === "complete"
      ? and(isNotNull(client.normalizedEmail), isNotNull(client.normalizedPhone))
      : query.contact === "incomplete"
        ? or(isNull(client.normalizedEmail), isNull(client.normalizedPhone))
        : undefined,
    query.duplicate === "possible" ? duplicatePredicate : undefined,
    query.tag
      ? sql`exists (
          select 1 from unnest(${client.tags}) stored_tag
          where lower(stored_tag) = lower(${query.tag})
        )`
      : undefined,
  )
}

function createListOrder(query: ClientListQuery) {
  const direction = query.sortDirection === "asc" ? asc : desc
  if (query.sortBy === "name") return [direction(client.name), direction(client.id)]
  if (query.sortBy === "createdAt") return [direction(client.createdAt), direction(client.id)]
  return [direction(client.id)]
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&")
}

async function classifyClientMiss(
  db: IdpDatabase,
  input: { clientId: string; organizationId: string },
) {
  const [existing] = await db
    .select({ id: client.id })
    .from(client)
    .where(and(eq(client.organizationId, input.organizationId), eq(client.id, input.clientId)))
    .limit(1)
  return existing ? ("version_conflict" as const) : ("not_found" as const)
}

async function classifyNoteMiss(
  db: IdpDatabase,
  input: { clientId: string; noteId: string; organizationId: string },
) {
  const [existing] = await db
    .select({ id: clientNote.id })
    .from(clientNote)
    .where(
      and(
        eq(clientNote.organizationId, input.organizationId),
        eq(clientNote.clientId, input.clientId),
        eq(clientNote.id, input.noteId),
      ),
    )
    .limit(1)
  return existing ? ("version_conflict" as const) : ("not_found" as const)
}
