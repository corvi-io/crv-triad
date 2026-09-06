export type CommissionRule =
  | { kind: "none"; source: "default" | "override" | "none"; policyVersion?: number }
  | {
      kind: "percentage"
      basisPoints: number
      source: "default" | "override"
      policyVersion: number
    }
  | { kind: "fixed"; fixedCents: number; source: "override"; policyVersion: number }

export function calculateCommission(netBaseCents: number, rule: CommissionRule) {
  if (!Number.isSafeInteger(netBaseCents) || netBaseCents < 0) throw new Error("invalid_net_base")
  const commissionCents =
    rule.kind === "none"
      ? 0
      : rule.kind === "fixed"
        ? Math.min(rule.fixedCents, netBaseCents)
        : Math.round((netBaseCents * rule.basisPoints) / 10_000)
  if (!Number.isSafeInteger(commissionCents)) throw new Error("unsafe_commission")
  return { netBaseCents, commissionCents, barbershopShareCents: netBaseCents - commissionCents }
}
