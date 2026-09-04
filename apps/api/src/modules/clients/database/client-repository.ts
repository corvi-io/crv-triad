import { and, asc, count, desc, eq, ilike, isNotNull, isNull, ne, or, sql } from "drizzle-orm"
import type { IdpDatabase } from "../../idp/database/client.js"
import { createId } from "../../shared/infra/ids.js"
import type {
  ClientDetail,
  ClientRepository,
  DuplicateCandidate,
} from "../application/client-repository.js"
import type { ClientListQuery } from "../domain/client-query.js"
import { client, clientNote } from "./schema.js"

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

    const notes = await db
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
      .limit(100)

    return { ...record, notes }
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
        await tx.insert(client).values({
          ...profile,
          id: newId,
          organizationId,
          servicePreferences: [...profile.servicePreferences],
          tags: [...profile.tags],
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
      const updated = await db
        .update(client)
        .set({
          ...input.profile,
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
