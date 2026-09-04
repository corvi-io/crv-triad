import { MemoryScenarioEngine } from "@/dev/mock-engine"
import type {
  ClientInput,
  ClientListQuery,
  ClientPage,
  ClientRecord,
  ClientRepository,
  ClientScenarioId,
  DuplicateWarning,
  NoteInput,
} from "@/modules/clients/contracts"
import { ClientOperationInvalidatedError, ClientValidationError } from "@/modules/clients/contracts"
import { clientScenarios } from "./scenarios"

export class ClientMemoryRepository implements ClientRepository {
  readonly #engine = new MemoryScenarioEngine<ClientRecord>(clientScenarios, "typical")
  #generation = 0
  #nextFailureArmed = false

  failNextOperation() {
    this.#engine.failNext()
  }

  async list(query: ClientListQuery): Promise<ClientPage> {
    this.#ensureScenario(query.scenarioId)
    const generation = this.#generation
    const result = await this.#engine.execute("list", () => {
      const needle = normalizeText(query.search)
      let items = this.#engine
        .values()
        .filter((record) => record.status === query.status)
        .filter(
          (record) =>
            !needle ||
            normalizeText(`${record.name} ${record.email} ${record.phone}`).includes(needle),
        )
        .filter((record) => !query.tag || record.tags.map(slug).includes(query.tag))
        .filter((record) => {
          if (query.contact === "all") return true
          const complete = Boolean(record.email && record.phone)
          return query.contact === "complete" ? complete : !complete
        })
        .filter(
          (record) =>
            query.duplicate === "all" || this.#duplicatesFor(record, record.id).length > 0,
        )
      items = items.sort((left, right) => {
        const field = query.sort.field
        const compared = String(left[field] ?? "").localeCompare(
          String(right[field] ?? ""),
          "pt-BR",
        )
        return query.sort.direction === "asc" ? compared : -compared
      })
      const totalPages = Math.max(1, Math.ceil(items.length / query.pageSize))
      const page = Math.min(Math.max(1, query.page), totalPages)
      return {
        items: items.slice((page - 1) * query.pageSize, page * query.pageSize),
        page,
        pageSize: query.pageSize,
        totalCount: items.length,
        totalPages,
      }
    })
    this.#assertGeneration(generation)
    return result
  }

  async get(id: string, scenarioId: ClientScenarioId) {
    this.#ensureScenario(scenarioId)
    return this.#read(id)
  }

  async listTags(scenarioId: ClientScenarioId) {
    this.#ensureScenario(scenarioId)
    return [...new Set(this.#engine.values().flatMap(({ tags }) => tags))].sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    )
  }

  async create(input: ClientInput) {
    return this.#mutate("create", () => {
      validateInput(input)
      return this.#engine.create(
        {
          ...input,
          appointments: [],
          createdAt: deterministicTimestamp(this.#engine.values().length + 1),
          lastVisitAt: null,
          nextAppointmentAt: null,
          notes: [],
          status: "active",
        },
        "client",
      )
    })
  }

  async update(id: string, input: ClientInput) {
    return this.#mutate("update", () => {
      validateInput(input)
      const updated = this.#engine.update(id, input)
      if (!updated) throw new ClientValidationError("Cliente não encontrado.")
      return updated
    })
  }

  async setArchived(id: string, archived: boolean) {
    return this.#mutate("update", () => {
      const updated = this.#engine.update(id, { status: archived ? "archived" : "active" })
      if (!updated) throw new ClientValidationError("Cliente não encontrado.")
      return updated
    })
  }

  async addNote(clientId: string, input: NoteInput) {
    return this.#mutate("create", () => {
      const record = this.#record(clientId)
      const body = validateNote(input)
      const timestamp = deterministicTimestamp(record.notes.length + 40)
      const note = {
        body,
        createdAt: timestamp,
        id: `note-${clientId}-${String(record.notes.length + 1).padStart(2, "0")}`,
        updatedAt: timestamp,
      }
      return this.#requiredUpdate(clientId, { notes: [...record.notes, note] })
    })
  }

  async updateNote(clientId: string, noteId: string, input: NoteInput) {
    return this.#mutate("update", () => {
      const record = this.#record(clientId)
      const body = validateNote(input)
      if (!record.notes.some((note) => note.id === noteId))
        throw new ClientValidationError("Nota não encontrada.")
      return this.#requiredUpdate(clientId, {
        notes: record.notes.map((note) =>
          note.id === noteId
            ? { ...note, body, updatedAt: deterministicTimestamp(record.notes.length + 60) }
            : note,
        ),
      })
    })
  }

  async removeNote(clientId: string, noteId: string) {
    return this.#mutate("delete", () => {
      const record = this.#record(clientId)
      if (!record.notes.some((note) => note.id === noteId))
        throw new ClientValidationError("Nota não encontrada.")
      return this.#requiredUpdate(clientId, {
        notes: record.notes.filter((note) => note.id !== noteId),
      })
    })
  }

  async findDuplicates(
    input: Pick<ClientInput, "email" | "phone">,
    excludingId?: string,
  ): Promise<readonly DuplicateWarning[]> {
    const probe = {
      ...this.#engine.values()[0],
      email: input.email,
      phone: input.phone,
    } as ClientRecord
    return this.#duplicatesFor(probe, excludingId)
  }

  async #read(id: string) {
    const generation = this.#generation
    const result = await this.#engine.execute("read", () => this.#record(id))
    this.#assertGeneration(generation)
    return result
  }

  async #mutate(operation: "create" | "delete" | "update", action: () => ClientRecord) {
    const generation = this.#generation
    const result = await this.#engine.execute(operation, () => {
      this.#assertGeneration(generation)
      return action()
    })
    this.#assertGeneration(generation)
    return result
  }

  #ensureScenario(scenarioId: ClientScenarioId) {
    if (this.#engine.snapshot.scenarioId === scenarioId) return
    this.#generation += 1
    this.#engine.selectScenario(scenarioId)
    this.#nextFailureArmed = scenarioId === "next-failure"
    if (this.#nextFailureArmed) {
      this.#engine.failNext()
      this.#nextFailureArmed = false
    }
  }

  #assertGeneration(generation: number) {
    if (generation !== this.#generation) throw new ClientOperationInvalidatedError()
  }

  #record(id: string) {
    const record = this.#engine.get(id)
    if (!record) throw new ClientValidationError("Cliente não encontrado.")
    return record
  }

  #requiredUpdate(id: string, update: Partial<ClientRecord>) {
    const record = this.#engine.update(id, update)
    if (!record) throw new ClientValidationError("Cliente não encontrado.")
    return record
  }

  #duplicatesFor(record: ClientRecord, excludingId?: string): DuplicateWarning[] {
    const email = normalizeEmail(record.email)
    const phone = normalizePhone(record.phone)
    return this.#engine
      .values()
      .filter((candidate) => candidate.id !== excludingId)
      .flatMap((candidate) => {
        const warnings: DuplicateWarning[] = []
        if (email && normalizeEmail(candidate.email) === email) {
          warnings.push({
            candidateId: candidate.id,
            candidateName: candidate.name,
            field: "email",
            label: "Mesmo e-mail",
          })
        }
        if (phone && normalizePhone(candidate.phone) === phone) {
          warnings.push({
            candidateId: candidate.id,
            candidateName: candidate.name,
            field: "phone",
            label: "Mesmo telefone",
          })
        }
        return warnings
      })
  }
}

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR")
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "")
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR")
}

function slug(value: string) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
}

function validateInput(input: ClientInput) {
  if (input.name.trim().length < 2) throw new ClientValidationError("Informe o nome do cliente.")
  if (!normalizeEmail(input.email) && normalizePhone(input.phone).length < 10)
    throw new ClientValidationError("Informe pelo menos um telefone ou e-mail.")
}

function validateNote(input: NoteInput) {
  const body = input.body.trim()
  if (body.length < 2) throw new ClientValidationError("Escreva uma nota antes de salvar.")
  if (body.length > 500) throw new ClientValidationError("Use no máximo 500 caracteres.")
  return body
}

function deterministicTimestamp(sequence: number) {
  return new Date(Date.UTC(2026, 0, 1, 12, sequence)).toISOString()
}
