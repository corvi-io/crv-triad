import { env } from "@/modules/shared/config/env"

type IdpErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

export type IdpRole = "admin" | "member"
export type IdpUserStatus = "active" | "disabled"
export type IdpInvitationStatus = "pending" | "accepted" | "expired" | "revoked"
export type IdpSortDirection = "asc" | "desc"

export type IdpPage = {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type IdpUser = {
  id: string
  name: string
  email: string
  image: string | null
  role: IdpRole
  status: IdpUserStatus
  createdAt: string
  updatedAt: string
}

export type IdpInvitation = {
  id: string
  email: string
  role: IdpRole
  status: IdpInvitationStatus
  invitedByUserId: string | null
  expiresAt: string
  acceptedAt: string | null
  acceptedByUserId: string | null
  createdAt: string
  updatedAt: string
}

export type ListUsersParams = {
  page?: number
  pageSize?: number
  q?: string
  role?: IdpRole[]
  status?: IdpUserStatus[]
  sortBy?: string | null
  sortDirection?: IdpSortDirection | null
}

export type ListInvitationsParams = {
  page?: number
  pageSize?: number
  q?: string
  role?: IdpRole[]
  status?: IdpInvitationStatus[]
  sortBy?: string | null
  sortDirection?: IdpSortDirection | null
}

export type ListUsersResponse = {
  users: IdpUser[]
  page: IdpPage
}

export type ListInvitationsResponse = {
  invitations: IdpInvitation[]
  page: IdpPage
}

export type InvitationEmailDelivery = "failed" | "sent" | "skipped"

export class IdpAdminApiError extends Error {
  readonly body: IdpErrorBody | undefined
  readonly status: number

  constructor(message: string, status: number, body?: IdpErrorBody) {
    super(message)
    this.name = "IdpAdminApiError"
    this.status = status
    this.body = body
  }
}

export async function listUsers(params: ListUsersParams) {
  return idpFetch<ListUsersResponse>(`/users?${buildSearchParams(params)}`)
}

export async function updateUser(
  userId: string,
  payload: Partial<Pick<IdpUser, "role" | "status">>,
) {
  return idpFetch<{ user: IdpUser }>(`/users/${userId}`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  })
}

export async function listInvitations(params: ListInvitationsParams) {
  return idpFetch<ListInvitationsResponse>(`/invitations?${buildSearchParams(params)}`)
}

export async function createInvitation(payload: { email: string; role: IdpRole }) {
  return idpFetch<{ emailDelivery: InvitationEmailDelivery; invitation: IdpInvitation }>(
    "/invitations",
    {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  )
}

export async function revokeInvitation(invitationId: string) {
  return idpFetch<{ invitation: IdpInvitation }>(`/invitations/${invitationId}/revoke`, {
    method: "POST",
  })
}

function buildSearchParams(params: ListUsersParams | ListInvitationsParams) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, item)
      }
      continue
    }

    search.set(key, String(value))
  }

  return search.toString()
}

async function idpFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getIdpBaseUrl()}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new IdpAdminApiError("IDP request failed.", response.status, await readBody(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return readBody<T>(response)
}

function getIdpBaseUrl() {
  return env.authBaseUrl.replace(/\/api\/auth\/?$/, "")
}

async function readBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>
  }

  return (await response.text()) as T
}
