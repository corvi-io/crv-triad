import { getApiUrl } from "@/modules/auth/services/auth-client"
import { FormSubmissionError } from "@/modules/shared/forms/form-submission-error"
import type {
  Appointment,
  AppointmentInput,
  AppointmentTransitionInput,
  CancellationReason,
  ScheduleRange,
  ScheduleRangeQuery,
  SchedulingRepository,
} from "./contracts"
export const schedulingErrorCopy: Record<string, string> = {
  insufficient_role: "Seu acesso não permite esta ação. Fale com o responsável pela barbearia.",
  tenant_forbidden: "Esta barbearia não está disponível para seu acesso.",
  context_required: "Selecione uma barbearia para continuar.",
  unauthenticated: "Entre novamente para continuar. Seus dados foram mantidos.",
  range_capacity_exceeded: "Há muitos registros neste período. Reduza o intervalo ou use filtros.",
  timezone_required: "Confirme o fuso horário da unidade antes de agendar.",
  timezone_in_use: "O fuso desta unidade já está em uso na disponibilidade.",
  appointment_conflict: "Este horário já foi ocupado. Escolha outro horário.",
  unavailable: "O profissional não está disponível neste horário. Revise a data e o horário.",
  outside_hours: "O horário precisa estar dentro do funcionamento da unidade.",
  availability_overlap: "Este bloco se sobrepõe a outro. Revise os horários.",
  appointment_dependency:
    "A alteração afeta agendamentos existentes. Remarque esses agendamentos primeiro.",
  version_conflict:
    "Este registro foi atualizado após a abertura. Seus dados foram mantidos; recarregue a versão atual para revisar.",
  invalid_relation: "Esta opção não está disponível para o agendamento. Revise sua seleção.",
  invalid_transition: "Esta ação não está disponível no estado atual do agendamento.",
  ambiguous_local_time: "Este horário ocorre duas vezes no fuso da unidade. Escolha outro horário.",
  invalid_local_time: "Este horário não existe no fuso da unidade. Escolha outro horário.",
  capability_forbidden: "Seu acesso não permite esta ação. Fale com o responsável pela barbearia.",
  module_not_included: "Este recurso não está incluído no plano da barbearia.",
  subscription_inactive: "O plano da barbearia está inativo. Fale com o responsável.",
  subscription_required: "A barbearia precisa de um plano ativo para usar este recurso.",
  not_found: "Este registro não está mais disponível.",
  invalid_range: "Selecione um intervalo menor para consultar a agenda.",
  invalid_request: "Revise os campos informados.",
}
export async function schedulingRequest<T>(
  path: string,
  options: { body?: unknown; method?: string; key?: string; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(getApiUrl(path), {
      credentials: "include",
      method: options.method ?? "GET",
      signal: options.signal,
      headers: {
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...(options.key ? { "idempotency-key": options.key } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new FormSubmissionError(
      "network_error",
      "Não foi possível conectar. Seus dados foram mantidos. Tente novamente.",
    )
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      code?: string
      details?: { field?: string }
    }
    throw new FormSubmissionError(
      error.code ?? "source_error",
      schedulingErrorCopy[error.code ?? ""] ?? "Não foi possível concluir a ação. Tente novamente.",
      error.details?.field,
    )
  }
  return response.json() as Promise<T>
}
export function scheduleParams(query: ScheduleRangeQuery) {
  const params = new URLSearchParams({
    unitId: query.unitId,
    startDate: query.startDate,
    endDate: query.endDate,
  })
  for (const field of ["clientIds", "professionalIds", "serviceIds", "statusIds"] as const)
    if (query[field]?.length) params.set(field, query[field].join(","))
  if (query.search) params.set("search", query.search)
  return params
}
function payload(input: AppointmentInput) {
  return {
    clientId: input.clientId,
    unitId: input.unitId,
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    date: input.date,
    start: input.start,
    notes: input.notes,
    origin: input.origin,
  }
}
export class SchedulingHttpRepository implements SchedulingRepository {
  readonly source = "http" as const
  private retries = new Map<string, string>()
  async getRange(query: ScheduleRangeQuery, signal?: AbortSignal) {
    return schedulingRequest<ScheduleRange>(`/api/scheduling/range?${scheduleParams(query)}`, {
      signal,
    })
  }
  async units(signal?: AbortSignal) {
    return schedulingRequest<
      readonly { id: string; name: string; timezone: string | null; version: number }[]
    >("/api/scheduling/units", { signal })
  }
  async detail(id: string, signal?: AbortSignal) {
    return schedulingRequest<Appointment>(
      `/api/scheduling/appointments/${encodeURIComponent(id)}`,
      { signal },
    )
  }
  private async mutate(path: string, body: unknown, method = "POST") {
    const token = JSON.stringify({ path, body })
    const key = this.retries.get(token) ?? globalThis.crypto.randomUUID()
    this.retries.set(token, key)
    try {
      const result = await schedulingRequest<Appointment>(path, { body, method, key })
      this.retries.delete(token)
      return result
    } catch (error) {
      if (
        error instanceof FormSubmissionError &&
        !["network_error", "internal_error", "source_error"].includes(error.code)
      )
        this.retries.delete(token)
      throw error
    }
  }
  create(input: AppointmentInput) {
    return this.mutate("/api/scheduling/appointments", payload(input))
  }
  update(id: string, input: AppointmentInput) {
    return this.mutate(
      `/api/scheduling/appointments/${encodeURIComponent(id)}`,
      { ...payload(input), version: input.version },
      "PATCH",
    )
  }
  reschedule(id: string, input: AppointmentInput) {
    return this.mutate(`/api/scheduling/appointments/${encodeURIComponent(id)}/reschedule`, {
      ...payload(input),
      version: input.version,
    })
  }
  cancel(
    id: string,
    reason: Exclude<CancellationReason, "no-show">,
    version?: number,
    note?: string,
  ) {
    return this.mutate(`/api/scheduling/appointments/${encodeURIComponent(id)}/cancel`, {
      cancellationReason: reason,
      cancellationNote: note,
      version,
    })
  }
  transition(input: AppointmentTransitionInput) {
    const action = {
      confirmed: "confirm",
      arrived: "check-in",
      canceled: "cancel",
      "no-show": "no-show",
    }[input.status as "confirmed" | "arrived" | "canceled" | "no-show"]
    if (!action)
      return Promise.reject(
        new FormSubmissionError("invalid_transition", schedulingErrorCopy.invalid_transition),
      )
    return this.mutate(`/api/scheduling/appointments/${encodeURIComponent(input.id)}/${action}`, {
      version: input.version,
      ...(action === "cancel" ? { cancellationReason: input.cancellationReason } : {}),
    })
  }
  scenarios() {
    return []
  }
  async reset() {
    throw new Error("No development source is active.")
  }
  async selectScenario() {
    throw new Error("No development source is active.")
  }
}

export function createSchedulingCommandClient() {
  const retries = new Map<string, string>()
  return async <T>(path: string, body: unknown, method = "POST"): Promise<T> => {
    const token = JSON.stringify({ path, body, method })
    const key = retries.get(token) ?? globalThis.crypto.randomUUID()
    retries.set(token, key)
    try {
      const result = await schedulingRequest<T>(path, { body, method, key })
      retries.delete(token)
      return result
    } catch (error) {
      if (
        error instanceof FormSubmissionError &&
        !["network_error", "internal_error", "source_error"].includes(error.code)
      )
        retries.delete(token)
      throw error
    }
  }
}
