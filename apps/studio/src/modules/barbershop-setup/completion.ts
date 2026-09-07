import type {
  BarbershopProfile,
  BasePaymentMethodId,
  PaymentMethodSetting,
  ProfessionalAccessPolicy,
  ProfessionalServiceOverride,
  SetupAvailability,
  SetupProfessional,
  SetupReadiness,
  SetupService,
  SetupUnit,
} from "./contracts"
import { basePaymentMethodIds, professionalAccessChoices } from "./contracts"

export const paymentMethodLabels = {
  cash: "Dinheiro",
  credit: "Cartão de crédito",
  debit: "Cartão de débito",
  mixed: "Pagamento misto",
  pix: "Pix",
} as const

export function createDefaultPaymentMethods(
  active: readonly BasePaymentMethodId[] = ["pix", "cash", "debit", "credit"],
): readonly PaymentMethodSetting[] {
  const activeIds = new Set(active)
  return [
    ...basePaymentMethodIds.map((id) => ({
      active: activeIds.has(id),
      id,
      label: paymentMethodLabels[id],
    })),
    {
      active: active.length >= 2,
      id: "mixed" as const,
      label: paymentMethodLabels.mixed,
    },
  ]
}

export function validatePaymentMethods(
  settings: readonly PaymentMethodSetting[],
): readonly PaymentMethodSetting[] {
  const byId = new Map(settings.map((setting) => [setting.id, setting]))
  const base = basePaymentMethodIds.map((id) => ({
    active: byId.get(id)?.active ?? false,
    id,
    label: paymentMethodLabels[id],
  }))
  const activeBaseCount = base.filter(({ active }) => active).length
  if (activeBaseCount === 0) {
    throw new Error("Ative pelo menos uma forma de pagamento.")
  }
  const mixedRequested = byId.get("mixed")?.active ?? false
  if (mixedRequested && activeBaseCount < 2) {
    throw new Error("O pagamento misto exige pelo menos duas formas de pagamento ativas.")
  }
  return [
    ...base,
    {
      active: mixedRequested && activeBaseCount >= 2,
      id: "mixed",
      label: paymentMethodLabels.mixed,
    },
  ]
}

export function createDefaultAccessPolicy(): ProfessionalAccessPolicy {
  return Object.fromEntries(
    professionalAccessChoices.map((choice) => [choice, choice === "own-schedule-only"]),
  ) as ProfessionalAccessPolicy
}

export function normalizeAccessPolicy(policy: ProfessionalAccessPolicy): ProfessionalAccessPolicy {
  const normalized = { ...policy }
  if (normalized["access-other-professionals"]) normalized["own-schedule-only"] = false
  if (normalized["own-schedule-only"]) normalized["access-other-professionals"] = false
  return normalized
}

export function resolveProfessionalService(
  service: SetupService,
  professional: SetupProfessional,
  override?: ProfessionalServiceOverride,
) {
  if (
    service.status !== "active" ||
    professional.status !== "active" ||
    !service.professionalIds.includes(professional.id)
  ) {
    throw new Error("O profissional precisa estar ativo e elegível para este serviço.")
  }
  return {
    durationMinutes: override?.durationMinutes ?? service.durationMinutes,
    priceCents: override?.priceCents ?? service.priceCents,
    professionalId: professional.id,
    serviceId: service.id,
    source:
      override?.durationMinutes !== undefined || override?.priceCents !== undefined
        ? ("professional-override" as const)
        : ("default" as const),
  }
}

export function validateProfessionalServiceOverride(
  input: ProfessionalServiceOverride,
): ProfessionalServiceOverride {
  if (input.priceCents === undefined && input.durationMinutes === undefined) {
    throw new Error("Informe um preço, uma duração ou remova a exceção.")
  }
  if (
    input.priceCents !== undefined &&
    (!Number.isInteger(input.priceCents) || input.priceCents < 0)
  )
    throw new Error("Informe um preço válido.")
  if (
    input.durationMinutes !== undefined &&
    (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 15)
  )
    throw new Error("Informe uma duração mínima de 15 minutos.")
  return { ...input }
}

export function deriveSetupReadiness({
  availability,
  paymentMethods,
  profile,
  professionals,
  services,
  units,
}: {
  availability: readonly SetupAvailability[]
  paymentMethods: readonly PaymentMethodSetting[]
  profile: BarbershopProfile
  professionals: readonly SetupProfessional[]
  services: readonly SetupService[]
  units: readonly SetupUnit[]
}): SetupReadiness {
  const primaryUnit = units.find(
    ({ id, status }) => status === "active" && id === profile.primaryUnitId,
  )
  const activeProfessionals = professionals.filter(({ status }) => status === "active")
  const activeServices = services.filter(({ status }) => status === "active")
  const activeBaseMethods = paymentMethods.filter(
    ({ active, id }) => active && id !== "mixed",
  ).length
  const steps = [
    {
      complete:
        profile.displayName.trim().length >= 2 &&
        /^\d{10,11}$/.test(profile.phone) &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) &&
        Boolean(primaryUnit?.address.trim()),
      description: "Nome de exibição, contato e endereço principal.",
      id: "business" as const,
      section: "business" as const,
      title: "Dados da barbearia",
    },
    {
      complete:
        Boolean(
          primaryUnit &&
            (primaryUnit.businessHours.periods ?? [primaryUnit.businessHours]).every(
              (period) => period.days.length > 0 && period.start < period.end,
            ),
        ) && availability.some(({ closed, periods }) => !closed && periods.length > 0),
      description: "Funcionamento, disponibilidade, pausas e folgas.",
      id: "hours" as const,
      section: "availability" as const,
      title: "Horários",
    },
    {
      complete:
        activeProfessionals.length > 0 &&
        activeProfessionals.every(
          ({ serviceIds, unitIds }) => serviceIds.length > 0 && unitIds.length > 0,
        ),
      description: "Equipe, contatos, serviços, unidades e acesso demonstrativo.",
      id: "professionals" as const,
      section: "professionals" as const,
      title: "Profissionais",
    },
    {
      complete:
        activeServices.length > 0 &&
        activeServices.every(
          ({ professionalIds, unitIds }) => professionalIds.length > 0 && unitIds.length > 0,
        ),
      description: "Catálogo, valores, duração e profissionais elegíveis.",
      id: "services" as const,
      section: "services" as const,
      title: "Serviços",
    },
    {
      complete:
        activeBaseMethods > 0 &&
        activeProfessionals.every(
          ({ commissionBasisPoints = -1 }) =>
            commissionBasisPoints >= 0 && commissionBasisPoints <= 10_000,
        ),
      description: "Formas aceitas e regras de comissão existentes.",
      id: "payments" as const,
      section: "payments" as const,
      title: "Pagamentos e comissões",
    },
  ]
  const allFactsComplete = steps.every(({ complete }) => complete)
  const reviewStep = {
    complete: allFactsComplete,
    description: "Conferência final e entrada no espaço de trabalho.",
    id: "review" as const,
    section: "overview" as const,
    title: "Revisão",
  }
  const completeSteps = [...steps, reviewStep]
  return {
    completedCount: completeSteps.filter(({ complete }) => complete).length,
    nextStepId: completeSteps.find(({ complete }) => !complete)?.id ?? "review",
    steps: completeSteps,
    totalCount: completeSteps.length,
  }
}
