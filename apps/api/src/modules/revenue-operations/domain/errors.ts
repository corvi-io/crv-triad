export type RevenueErrorCode =
  | "not_found"
  | "invalid_request"
  | "invalid_money"
  | "invalid_reason"
  | "invalid_tenders"
  | "version_conflict"
  | "idempotency_conflict"
  | "cash_day_required"
  | "cash_day_closed"
  | "cash_day_date_mismatch"
  | "insufficient_cash"
  | "already_registered"
  | "already_reversed"
  | "later_cash_day_exists"
  | "payment_method_disabled"

export class RevenueOperationsError extends Error {
  constructor(
    readonly code: RevenueErrorCode,
    readonly field?: string,
  ) {
    super(code)
    this.name = "RevenueOperationsError"
  }
}
