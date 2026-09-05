import { getApiUrl } from "@/modules/auth/services/auth-client"
import type {
  AvailabilityQuery,
  AvailabilityResult,
  BarbershopProfile,
  BarbershopSetupRepository,
  CopyAvailabilityToWeekdaysInput,
  PaymentMethodSetting,
  ProfessionalInput,
  ProfessionalOperationalSummary,
  ProfessionalServiceOverride,
  ResolvedProfessionalService,
  SetupAvailability,
  SetupCompletion,
  SetupEntity,
  SetupEntityInput,
  SetupEntityKind,
  SetupEntityPage,
  SetupListQuery,
  SetupOverview,
  SetupProfessional,
  SetupService,
  SetupUnit,
  UpdateAvailabilityBatchInput,
  UpdatePaymentMethodsInput,
} from "./contracts"
import { SetupValidationError } from "./contracts"

type ApiError = { code?: string; requestId?: string }

export class BarbershopSetupHttpRepository implements BarbershopSetupRepository {
  readonly catalogSource = "http" as const
  async list(query: SetupListQuery): Promise<SetupEntityPage> {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
      search: query.search,
      sortBy: query.sort.field,
      sortDirection: query.sort.direction,
      status: query.status,
    })
    return request<SetupEntityPage>(`/api/${plural(query.kind)}/?${params}`)
  }

  async create(kind: SetupEntityKind, input: SetupEntityInput) {
    if (kind === "professional") {
      const professional = input as ProfessionalInput
      const result = await request<{ emailDelivery: "failed" | "sent" | "skipped" }>(
        "/api/professionals/invite",
        {
          body: { ...professional, email: professional.invitationEmail },
          method: "POST",
        },
      )
      if (result.emailDelivery === "failed")
        throw new SetupValidationError(
          "Não foi possível entregar o convite. Tente novamente em alguns instantes.",
        )
      return undefined
    }
    return request<SetupEntity>(`/api/${plural(kind)}/`, { body: input, method: "POST" })
  }

  async update(kind: SetupEntityKind, id: string, input: SetupEntityInput, version = 1) {
    return request<SetupEntity>(`/api/${plural(kind)}/${encodeURIComponent(id)}`, {
      body:
        kind === "professional"
          ? { ...input, invitationEmail: undefined, version }
          : { ...input, version },
      method: "PATCH",
    })
  }

  async setArchived(kind: SetupEntityKind, id: string, archived: boolean) {
    const current = await request<SetupEntity>(`/api/${plural(kind)}/${encodeURIComponent(id)}`)
    return request<SetupEntity>(
      `/api/${plural(kind)}/${encodeURIComponent(id)}/${archived ? "archive" : "restore"}`,
      { body: { version: current.version ?? 1 }, method: "POST" },
    )
  }

  async getOverview(): Promise<SetupOverview> {
    const [units, professionals, services] = await Promise.all([
      this.options<SetupUnit>("unit"),
      this.options<SetupProfessional>("professional"),
      this.options<SetupService>("service"),
    ])
    const items = [
      {
        complete: units.length > 0,
        description: units.length
          ? `${units.length} unidade(s) ativa(s).`
          : "Adicione a primeira unidade.",
        section: "units" as const,
        title: "Cadastrar a operação",
      },
      {
        complete:
          professionals.length > 0 && professionals.every((item) => item.unitIds.length > 0),
        description: "Profissionais precisam de ao menos uma unidade ativa.",
        section: "professionals" as const,
        title: "Conectar profissionais",
      },
      {
        complete:
          services.length > 0 &&
          services.every((item) => item.unitIds.length > 0 && item.professionalIds.length > 0),
        description: "Serviços precisam de unidade e profissional compatíveis.",
        section: "services" as const,
        title: "Definir serviços",
      },
      {
        complete: false,
        description: "Disponibilidade ainda não possui persistência de produção.",
        section: "availability" as const,
        title: "Configurar disponibilidade",
      },
    ]
    return {
      completedCount: items.filter((item) => item.complete).length,
      items,
      totalCount: items.length,
    }
  }

  async getAvailability(_query: AvailabilityQuery): Promise<AvailabilityResult> {
    const [units, professionals, services] = await Promise.all([
      this.options<SetupUnit>("unit"),
      this.options<SetupProfessional>("professional"),
      this.options<SetupService>("service"),
    ])
    return {
      conflicts: [],
      professionals: professionals.map((item) => ({ ...item, kind: "professional" as const })),
      records: [],
      services: services.map((item) => ({ ...item, kind: "service" as const })),
      units: units.map((item) => ({ ...item, kind: "unit" as const })),
    }
  }

  private options<T extends SetupEntity>(kind: SetupEntityKind) {
    return request<T[]>(`/api/${plural(kind)}/options?all=true`)
  }
  private unsupported(): never {
    throw new SetupValidationError("Este recurso ainda não está disponível em produção.")
  }
  async getCompletion(_scenarioId: string): Promise<SetupCompletion> {
    const overview = await this.getOverview()
    const steps = overview.items.map((item) => ({
      complete: item.complete,
      description: item.description,
      id:
        item.section === "units"
          ? ("hours" as const)
          : item.section === "professionals"
            ? ("professionals" as const)
            : item.section === "services"
              ? ("services" as const)
              : ("review" as const),
      section: item.section,
      title: item.title,
    }))
    return {
      paymentMethods: [],
      profile: { displayName: "", email: "", phone: "" },
      readiness: {
        completedCount: overview.completedCount,
        nextStepId: steps.find((step) => !step.complete)?.id ?? "review",
        steps,
        totalCount: overview.totalCount,
      },
      serviceOverrides: [],
    }
  }
  getProfessionalOperationalSummary(
    _professionalId: string,
    _date: string,
  ): Promise<ProfessionalOperationalSummary> {
    return Promise.reject(this.unsupported())
  }
  getActivePaymentMethodIds(): Promise<readonly ("pix" | "cash" | "debit" | "credit")[]> {
    return Promise.reject(this.unsupported())
  }
  getProfessionalCommissionBasisPoints(_professionalId: string): Promise<number> {
    return Promise.reject(this.unsupported())
  }
  resolveProfessionalService(
    _serviceId: string,
    _professionalId: string,
  ): Promise<ResolvedProfessionalService> {
    return Promise.reject(this.unsupported())
  }
  setProfessionalServiceOverride(
    _input: ProfessionalServiceOverride,
  ): Promise<ProfessionalServiceOverride | undefined> {
    return Promise.reject(this.unsupported())
  }
  updateAvailability(_input: SetupAvailability): Promise<SetupAvailability> {
    return Promise.reject(this.unsupported())
  }
  updateAvailabilityBatch(
    _input: UpdateAvailabilityBatchInput,
  ): Promise<readonly SetupAvailability[]> {
    return Promise.reject(this.unsupported())
  }
  copyAvailabilityToWeekdays(
    _input: CopyAvailabilityToWeekdaysInput,
  ): Promise<readonly SetupAvailability[]> {
    return Promise.reject(this.unsupported())
  }
  updatePaymentMethods(
    _input: UpdatePaymentMethodsInput,
  ): Promise<readonly PaymentMethodSetting[]> {
    return Promise.reject(this.unsupported())
  }
  updateProfile(_input: BarbershopProfile): Promise<BarbershopProfile> {
    return Promise.reject(this.unsupported())
  }
}

function plural(kind: SetupEntityKind) {
  return kind === "unit" ? "units" : kind === "professional" ? "professionals" : "services"
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
  if (response.status === 503 && error.code === "invitation_delivery_failed")
    throw new SetupValidationError(
      "Não foi possível entregar o convite. Tente novamente em alguns instantes.",
    )
  if (response.status === 400)
    throw new SetupValidationError(
      error.code === "invalid_relation"
        ? "Revise os vínculos: use somente registros ativos e compatíveis."
        : error.code === "already_member"
          ? "Este usuário já faz parte da barbearia. Use outro e-mail para enviar o convite."
          : error.code === "invitation_pending"
            ? "Já existe um convite pendente para este e-mail."
            : "Revise os dados informados.",
    )
  if (response.status === 409)
    throw new SetupValidationError("Os dados mudaram. Recarregue e tente novamente.")
  if (response.status === 401 || response.status === 403)
    throw new Error("Você não tem acesso a esta ação.")
  throw new Error(
    `Não foi possível concluir a operação. Referência: ${error.requestId ?? "indisponível"}.`,
  )
}
