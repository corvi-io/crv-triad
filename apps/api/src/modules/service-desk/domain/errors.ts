export class ServiceDeskError extends Error {
  constructor(
    public readonly code: string,
    public readonly field?: string,
  ) {
    super(code)
    this.name = "ServiceDeskError"
  }
}
