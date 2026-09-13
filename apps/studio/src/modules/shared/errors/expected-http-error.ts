export class ExpectedHttpError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ExpectedHttpError"
    this.status = status
  }
}
