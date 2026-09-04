import { getApiUrl } from "@/modules/auth/services/auth-client"

import {
  type ClientInput,
  type ClientListQuery,
  type ClientNote,
  type ClientPage,
  type ClientRecord,
  type ClientRepository,
  ClientValidationError,
  type DuplicateWarning,
  type NoteInput,
} from "./contracts"

type ApiError = { code?: string; requestId?: string }

export class ClientHttpRepository implements ClientRepository {
  async list(query: ClientListQuery): Promise<ClientPage> {
    const params = new URLSearchParams({
      contact: query.contact,
      duplicate: query.duplicate,
      page: String(query.page),
      pageSize: String(query.pageSize),
      search: query.search,
      sortDirection: query.sort.direction,
      sortBy: query.sort.field,
      status: query.status,
      tag: query.tag,
    })
    const page = await request<ApiClientPage>(`/api/clients/?${params}`)
    return { ...page, items: page.items.map(mapClient) }
  }

  async get(id: string): Promise<ClientRecord> {
    return mapClient(await request<ApiClient>(`/api/clients/${encodeURIComponent(id)}`))
  }

  async listTags(): Promise<readonly string[]> {
    return request<readonly string[]>("/api/clients/tags")
  }

  async create(input: ClientInput): Promise<ClientRecord> {
    return mapClient(await request<ApiClient>("/api/clients/", { body: input, method: "POST" }))
  }

  async update(id: string, input: ClientInput, version: number): Promise<ClientRecord> {
    return mapClient(
      await request<ApiClient>(`/api/clients/${encodeURIComponent(id)}`, {
        body: { ...input, version },
        method: "PATCH",
      }),
    )
  }

  async setArchived(id: string, archived: boolean, version: number): Promise<ClientRecord> {
    return mapClient(
      await request<ApiClient>(
        `/api/clients/${encodeURIComponent(id)}/${archived ? "archive" : "restore"}`,
        { body: { version }, method: "POST" },
      ),
    )
  }

  async findDuplicates(
    input: Pick<ClientInput, "email" | "phone">,
    excludingId?: string,
  ): Promise<readonly DuplicateWarning[]> {
    const candidates = await request<readonly ApiDuplicate[]>("/api/clients/duplicates", {
      body: { ...input, excludingId },
      method: "POST",
    })
    return candidates.map((candidate) => ({
      ...candidate,
      label: candidate.field === "email" ? "Mesmo e-mail" : "Mesmo telefone",
    }))
  }

  async addNote(clientId: string, input: NoteInput): Promise<ClientRecord> {
    return mapClient(
      await request<ApiClient>(`/api/clients/${encodeURIComponent(clientId)}/notes`, {
        body: input,
        method: "POST",
      }),
    )
  }

  async updateNote(
    clientId: string,
    noteId: string,
    input: NoteInput,
    version: number,
  ): Promise<ClientRecord> {
    return mapClient(
      await request<ApiClient>(
        `/api/clients/${encodeURIComponent(clientId)}/notes/${encodeURIComponent(noteId)}`,
        { body: { ...input, version }, method: "PATCH" },
      ),
    )
  }

  async removeNote(clientId: string, noteId: string, version: number): Promise<ClientRecord> {
    return mapClient(
      await request<ApiClient>(
        `/api/clients/${encodeURIComponent(clientId)}/notes/${encodeURIComponent(noteId)}`,
        { body: { version }, method: "DELETE" },
      ),
    )
  }
}

type ApiClient = Omit<ClientRecord, "appointments" | "email" | "phone"> & {
  appointments?: ClientRecord["appointments"]
  email: string | null
  phone: string | null
  notes?: readonly ClientNote[]
}
type ApiClientPage = Omit<ClientPage, "items"> & { items: readonly ApiClient[] }
type ApiDuplicate = Omit<DuplicateWarning, "label">

function mapClient(record: ApiClient): ClientRecord {
  return {
    ...record,
    appointments: record.appointments ?? [],
    email: record.email ?? "",
    notes: record.notes ?? [],
    phone: record.phone ?? "",
  }
}

async function request<T>(path: string, options: { body?: unknown; method?: string } = {}) {
  const response = await fetch(getApiUrl(path), {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: options.body === undefined ? undefined : { "content-type": "application/json" },
    method: options.method ?? "GET",
  })
  if (response.ok) return response.json() as Promise<T>

  const error = (await response.json().catch(() => ({}))) as ApiError
  if (response.status === 400) throw new ClientValidationError("Revise os dados informados.")
  if (response.status === 409)
    throw new ClientValidationError("Os dados mudaram. Recarregue e tente novamente.")
  if (response.status === 401 || response.status === 403) {
    throw new Error("Você não tem acesso a esta ação.")
  }
  throw new Error(
    `Não foi possível concluir a operação. Referência: ${error.requestId ?? "indisponível"}.`,
  )
}
