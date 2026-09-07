import { getApiUrl } from "@/modules/auth/services/auth-client"
import { FormSubmissionError } from "@/modules/shared/forms/form-submission-error"
import { createDefaultPaymentMethods } from "./completion"
import type {
  AvailabilityQuery,
  AvailabilityResult,
  BarbershopProfile,
  BarbershopSetupRepository,
  CommissionDetail,
  CommissionPolicy,
  CopyAvailabilityToWeekdaysInput,
  PaymentMethodSetting,
  PendingProfessionalInvitation,
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

type ApiError = { code?: string; details?: { field?: string }; requestId?: string }

export class BarbershopSetupHttpRepository implements BarbershopSetupRepository {
  readonly catalogSource = "http" as const
  #paymentVersion?: number
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

  async listPendingProfessionalInvitations() {
    return request<readonly PendingProfessionalInvitation[]>("/api/professionals/invitations")
  }

  async resendProfessionalInvitation(id: string) {
    await request(`/api/professionals/invitations/${encodeURIComponent(id)}/resend`, {
      method: "POST",
    })
  }

  async revokeProfessionalInvitation(id: string) {
    await request(`/api/professionals/invitations/${encodeURIComponent(id)}/revoke`, {
      method: "POST",
    })
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
    const [units, professionals, services, availability] = await Promise.all([
      this.options<SetupUnit>("unit"),
      this.options<SetupProfessional>("professional"),
      this.options<SetupService>("service"),
      request<{ activeSeries: number }>("/api/availability/summary"),
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
        complete: availability.activeSeries > 0,
        description:
          availability.activeSeries > 0
            ? `${availability.activeSeries} série(s) de disponibilidade ativa(s).`
            : "Confirme o fuso da unidade e configure os horários dos profissionais.",
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
    return request<T[]>(`/api/${plural(kind)}/options`)
  }
  private unsupported(): never {
    throw new SetupValidationError("Este recurso ainda não está disponível em produção.")
  }
  async getCompletion(_scenarioId: string): Promise<SetupCompletion> {
    const [overview, paymentMethods, profile] = await Promise.all([
      this.getOverview(),
      this.#paymentMethods(),
      request<ApiBusinessProfile | null>("/api/business-profile"),
    ])
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
      paymentMethods,
      profile: profile ? mapProfile(profile) : { displayName: "", email: "", phone: "" },
      readiness: {
        completedCount: overview.completedCount,
        nextStepId: steps.find((step) => !step.complete)?.id ?? "review",
        steps,
        totalCount: overview.totalCount,
      },
      serviceOverrides: [],
    }
  }
  async getBusinessProfile(): Promise<BarbershopProfile> {
    const profile = await request<ApiBusinessProfile | null>("/api/business-profile")
    return profile ? mapProfile(profile) : { displayName: "", email: "", phone: "" }
  }
  getBusinessUnits(): Promise<readonly SetupUnit[]> {
    return this.options<SetupUnit>("unit")
  }
  getProfessionalOperationalSummary(
    _professionalId: string,
    _date: string,
  ): Promise<ProfessionalOperationalSummary> {
    return Promise.reject(this.unsupported())
  }
  async getActivePaymentMethodIds(): Promise<readonly ("pix" | "cash" | "debit" | "credit")[]> {
    return (await this.#paymentMethods())
      .filter(({ active, id }) => active && id !== "mixed")
      .map(({ id }) => id as "pix" | "cash" | "debit" | "credit")
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
  async updatePaymentMethods(
    input: UpdatePaymentMethodsInput,
  ): Promise<readonly PaymentMethodSetting[]> {
    if (this.#paymentVersion === undefined) await this.#paymentMethods()
    if (this.#paymentVersion === undefined) throw this.unsupported()
    const base = input.settings.filter(({ id }) => id !== "mixed")
    if (base.length !== 4) throw new SetupValidationError("Revise as formas de pagamento.")
    const rows = await request<readonly ApiPaymentMethod[]>(
      "/api/revenue-operations/payment-methods",
      {
        method: "PUT",
        body: {
          expectedVersion: this.#paymentVersion,
          methods: base.map(({ active, id }) => ({ enabled: active, method: id })),
          idempotencyKey: crypto.randomUUID(),
        },
      },
    )
    return this.#mapPaymentMethods(rows)
  }
  async updateProfile(input: BarbershopProfile): Promise<BarbershopProfile> {
    return mapProfile(
      await request<ApiBusinessProfile>("/api/business-profile", {
        method: "PUT",
        body: {
          displayName: input.displayName,
          email: input.email,
          phone: normalizeBrazilPhone(input.phone),
          whatsapp: input.whatsapp ? normalizeBrazilPhone(input.whatsapp) : null,
          primaryUnitId: input.primaryUnitId ?? null,
          description: input.description || null,
          website: input.website || null,
          instagram: input.instagram || null,
          expectedVersion: input.version ?? null,
        },
      }),
    )
  }
  getCommissionPolicies() {
    return request<readonly CommissionPolicy[]>("/api/commissions/policies")
  }
  getCommissionDetail(filters: { from: string; to: string }) {
    return request<CommissionDetail>(`/api/commissions/detail?${new URLSearchParams(filters)}`)
  }
  saveCommissionPolicy(
    input: Omit<CommissionPolicy, "version"> & { expectedVersion: number | null },
  ) {
    const rule =
      input.kind === "percentage"
        ? { kind: input.kind, basisPoints: input.basisPoints }
        : input.kind === "fixed"
          ? { kind: input.kind, fixedCents: input.fixedCents }
          : { kind: input.kind }
    return request<readonly CommissionPolicy[]>("/api/commissions/policies", {
      method: "PUT",
      body: {
        professionalId: input.professionalId,
        serviceId: input.serviceId ?? null,
        expectedVersion: input.expectedVersion,
        rule,
      },
    })
  }
  async uploadBusinessLogo(file: File, expectedVersion: number) {
    const body = new FormData()
    body.set("file", file)
    body.set("expectedVersion", String(expectedVersion))
    return mapProfile(
      await request<ApiBusinessProfile>("/api/business-profile/logo", { method: "POST", body }),
    )
  }
  async getBusinessLogo() {
    const response = await fetch(getApiUrl("/api/business-profile/logo"), {
      credentials: "include",
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error("Não foi possível carregar o logotipo.")
    return response.blob()
  }
  async removeBusinessLogo(expectedVersion: number) {
    return mapProfile(
      await request<ApiBusinessProfile>(
        `/api/business-profile/logo?expectedVersion=${expectedVersion}`,
        { method: "DELETE" },
      ),
    )
  }

  async #paymentMethods() {
    return this.#mapPaymentMethods(
      await request<readonly ApiPaymentMethod[]>("/api/revenue-operations/payment-methods"),
    )
  }

  #mapPaymentMethods(rows: readonly ApiPaymentMethod[]) {
    this.#paymentVersion = rows[0]?.version
    return createDefaultPaymentMethods(
      rows.filter(({ enabled }) => enabled).map(({ method }) => method),
    )
  }
}

type ApiPaymentMethod = {
  enabled: boolean
  method: "pix" | "cash" | "debit" | "credit"
  version: number
}
type ApiBusinessProfile = BarbershopProfile & { primaryUnitId: string | null; version: number }
function mapProfile(value: ApiBusinessProfile): BarbershopProfile {
  return {
    ...value,
    description: value.description ?? undefined,
    instagram: value.instagram ?? undefined,
    primaryUnitId: value.primaryUnitId ?? undefined,
    website: value.website ?? undefined,
    whatsapp: value.whatsapp ?? undefined,
  }
}
function normalizeBrazilPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`
}

function plural(kind: SetupEntityKind) {
  return kind === "unit" ? "units" : kind === "professional" ? "professionals" : "services"
}
async function request<T>(path: string, options: { body?: unknown; method?: string } = {}) {
  const isForm = options.body instanceof FormData
  const body =
    options.body === undefined ? undefined : isForm ? options.body : JSON.stringify(options.body)
  const response = await fetch(getApiUrl(path), {
    body: body as BodyInit | undefined,
    credentials: "include",
    headers:
      options.body === undefined || isForm ? undefined : { "content-type": "application/json" },
    method: options.method ?? "GET",
  })
  if (response.ok) {
    const payload = await response.text()
    return (payload ? JSON.parse(payload) : null) as T
  }
  const error = (await response.json().catch(() => ({}))) as ApiError
  if (response.status === 503 && error.code === "invitation_delivery_failed")
    throw new SetupValidationError(
      "Não foi possível entregar o convite. Tente novamente em alguns instantes.",
    )
  if (response.status === 400) {
    if (error.code === "duplicate_name")
      throw new FormSubmissionError(
        "duplicate_name",
        "Já existe um registro com este nome.",
        error.details?.field ?? "name",
      )
    if (error.code === "duplicate_code")
      throw new FormSubmissionError(
        "duplicate_code",
        "Já existe uma unidade com este código.",
        error.details?.field ?? "code",
      )
    if (error.details?.field)
      throw new FormSubmissionError(
        "invalid_request",
        error.code === "invalid_relation"
          ? "Revise esta seleção. Use somente opções ativas e compatíveis."
          : "Revise o valor informado.",
        error.details.field,
      )
    throw new SetupValidationError(
      error.code === "invalid_relation"
        ? "Revise os vínculos: use somente registros ativos e compatíveis."
        : error.code === "already_member"
          ? "Este usuário já faz parte da barbearia. Use outro e-mail para enviar o convite."
          : error.code === "invitation_pending"
            ? "Já existe um convite pendente para este e-mail."
            : "Revise os dados informados.",
    )
  }
  if (response.status === 409 && error.code === "version_conflict")
    throw new FormSubmissionError(
      "version_conflict",
      "Outra alteração foi salva depois que você abriu esta tela. Revise a versão mais recente antes de tentar novamente.",
    )
  if (response.status === 401 || response.status === 403)
    throw new Error("Você não tem acesso a esta ação.")
  throw new Error(
    `Não foi possível concluir a operação. Referência: ${error.requestId ?? "indisponível"}.`,
  )
}
