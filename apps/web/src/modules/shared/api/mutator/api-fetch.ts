import { env } from "@/modules/shared/config/env"

export type ErrorType<Error> = ApiClientError<Error>
export type BodyType<BodyData> = BodyData

export class ApiClientError<ErrorBody = unknown> extends Error {
  readonly status: number
  readonly body: ErrorBody | undefined

  constructor(message: string, status: number, body?: ErrorBody) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.body = body
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${url}`, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new ApiClientError("API request failed.", response.status, await readBody(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return readBody<T>(response)
}

async function readBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>
  }

  return response.text() as Promise<T>
}
