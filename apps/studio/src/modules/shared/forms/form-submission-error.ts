export type FormErrorCode =
  | "duplicate_code"
  | "duplicate_name"
  | "invalid_request"
  | "version_conflict"

export class FormSubmissionError extends Error {
  readonly code: string
  readonly field?: string

  constructor(code: string, message: string, field?: string) {
    super(message)
    this.name = "FormSubmissionError"
    this.code = code
    this.field = field
  }
}
