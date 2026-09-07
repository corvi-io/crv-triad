export class ClientValidationError extends Error {
  readonly code = "invalid_request"

  constructor(readonly fields: Readonly<Record<string, readonly string[]>>) {
    super("Client input is invalid.")
    this.name = "ClientValidationError"
  }
}

export class ClientVersionConflictError extends Error {
  readonly code = "version_conflict"

  constructor() {
    super("Client version is stale.")
    this.name = "ClientVersionConflictError"
  }
}

export class ClientNotFoundError extends Error {
  readonly code = "resource_not_found"

  constructor() {
    super("Client was not found.")
    this.name = "ClientNotFoundError"
  }
}

export class ClientQuotaReachedError extends Error {
  readonly code = "quota_reached"

  constructor(readonly limit: number) {
    super("Active client quota reached.")
    this.name = "ClientQuotaReachedError"
  }
}
