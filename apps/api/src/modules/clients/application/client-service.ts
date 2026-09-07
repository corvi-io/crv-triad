import { validateClientNote } from "../domain/client-note.js"
import { normalizeEmail, normalizePhone, validateClientProfile } from "../domain/client-profile.js"
import { parseClientListQuery } from "../domain/client-query.js"
import {
  ClientNotFoundError,
  ClientQuotaReachedError,
  ClientValidationError,
  ClientVersionConflictError,
} from "../domain/errors.js"
import type { ClientRepository } from "./client-repository.js"

export function createClientService(repository: ClientRepository) {
  async function get(organizationId: string, clientId: string) {
    const record = await repository.get({ clientId, organizationId })
    if (!record) throw new ClientNotFoundError()
    return record
  }

  async function resolveMutation(
    result: "not_found" | "quota_reached" | "updated" | "version_conflict",
    organizationId: string,
    clientId: string,
    activeClientLimit?: number,
  ) {
    if (result === "not_found") throw new ClientNotFoundError()
    if (result === "version_conflict") throw new ClientVersionConflictError()
    if (result === "quota_reached") throw new ClientQuotaReachedError(activeClientLimit ?? 0)
    return get(organizationId, clientId)
  }

  return {
    async addNote(organizationId: string, clientId: string, input: unknown) {
      await get(organizationId, clientId)
      const note = validateClientNote(input)
      return repository.addNote({ body: note.body, clientId, organizationId })
    },

    async create(organizationId: string, input: unknown, activeClientLimit?: number) {
      let result: Awaited<ReturnType<ClientRepository["create"]>>
      try {
        result = await repository.create({
          activeClientLimit,
          organizationId,
          profile: validateClientProfile(input),
        })
      } catch (error) {
        if (error instanceof Error && error.message === "invalid_catalog_preference")
          throw new ClientValidationError({ preferences: ["invalid_catalog_preference"] })
        throw error
      }
      if (result === "quota_reached") throw new ClientQuotaReachedError(activeClientLimit ?? 0)
      return result
    },

    async findDuplicates(
      organizationId: string,
      input: { email?: unknown; excludingId?: unknown; phone?: unknown },
    ) {
      const email = typeof input.email === "string" ? normalizeEmail(input.email) : null
      const phone = typeof input.phone === "string" ? normalizePhone(input.phone) : null
      if (!email && !phone) throw new ClientValidationError({ contact: ["contact_required"] })
      if (input.excludingId !== undefined && typeof input.excludingId !== "string") {
        throw new ClientValidationError({ excludingId: ["invalid_id"] })
      }
      return repository.findDuplicates({
        excludingId: input.excludingId,
        normalizedEmail: email,
        normalizedPhone: phone,
        organizationId,
      })
    },

    get,

    list(organizationId: string, input: unknown) {
      return repository.list({ organizationId, query: parseClientListQuery(input) })
    },

    listTags(organizationId: string) {
      return repository.listTags({ organizationId })
    },

    async removeNote(
      organizationId: string,
      clientId: string,
      noteId: string,
      noteVersion: number,
    ) {
      return resolveMutation(
        await repository.removeNote({ clientId, noteId, noteVersion, organizationId }),
        organizationId,
        clientId,
      )
    },

    async setArchived(
      organizationId: string,
      clientId: string,
      archived: boolean,
      version: number,
      activeClientLimit?: number,
    ) {
      return resolveMutation(
        await repository.setArchived({
          activeClientLimit,
          archived,
          clientId,
          organizationId,
          version,
        }),
        organizationId,
        clientId,
        activeClientLimit,
      )
    },

    async update(organizationId: string, clientId: string, version: number, input: unknown) {
      try {
        return resolveMutation(
          await repository.update({
            clientId,
            organizationId,
            profile: validateClientProfile(input),
            version,
          }),
          organizationId,
          clientId,
        )
      } catch (error) {
        if (error instanceof Error && error.message === "invalid_catalog_preference")
          throw new ClientValidationError({ preferences: ["invalid_catalog_preference"] })
        throw error
      }
    },

    async updateNote(
      organizationId: string,
      clientId: string,
      noteId: string,
      noteVersion: number,
      input: unknown,
    ) {
      const note = validateClientNote(input)
      return resolveMutation(
        await repository.updateNote({
          body: note.body,
          clientId,
          noteId,
          noteVersion,
          organizationId,
        }),
        organizationId,
        clientId,
      )
    },
  }
}

export type ClientService = ReturnType<typeof createClientService>
