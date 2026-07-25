import type { NotificationSourceFact } from "@/modules/operational-notifications/rules"

export const operationalNotificationScenarioIds = [
  "normal",
  "empty",
  "duplicates",
  "overflow",
  "resolved",
  "missing-target",
  "slow",
  "slow-read",
  "fail-next-read",
  "persistent-error",
  "long-content",
] as const

export type OperationalNotificationScenarioId = (typeof operationalNotificationScenarioIds)[number]

const baseFacts: readonly NotificationSourceFact[] = [
  {
    applies: true,
    category: "scheduling-conflict",
    dedupeKey: "conflict:appointment-conflict",
    destination: { appointmentId: "appointment-conflict", kind: "agenda" },
    detail: "Dois horários ocupam o mesmo intervalo. Revise a Agenda.",
    id: "fact-conflict",
    occurredAt: "2026-07-24T15:34:00-03:00",
    severity: "critical",
    summary: "Conflito identificado na Agenda",
    unitId: "centro",
    version: 1,
  },
  {
    applies: true,
    category: "excessive-wait",
    dedupeKey: "wait:queue-waiting",
    destination: { kind: "service-desk", sessionId: "session-waiting" },
    detail: "A espera atingiu o limite operacional de 15 minutos.",
    id: "fact-waiting",
    occurredAt: "2026-07-24T15:30:00-03:00",
    severity: "critical",
    summary: "Espera acima de 15 minutos",
    unitId: "centro",
    version: 1,
  },
  {
    applies: true,
    category: "overdue-service",
    dedupeKey: "overdue:session-overdue",
    destination: { kind: "service-desk", sessionId: "session-overdue" },
    detail: "O tempo estimado e a tolerância de 15 minutos foram ultrapassados.",
    id: "fact-overdue",
    occurredAt: "2026-07-24T15:25:00-03:00",
    severity: "attention",
    summary: "Atendimento precisa de atualização",
    unitId: "centro",
    version: 1,
  },
  {
    applies: true,
    category: "pending-payment",
    dedupeKey: "payment:session-payment",
    destination: { kind: "checkout", sessionId: "session-payment" },
    detail: "O atendimento está pronto e ainda não teve o pagamento registrado.",
    id: "fact-payment",
    occurredAt: "2026-07-24T15:20:00-03:00",
    severity: "attention",
    summary: "Pagamento aguardando registro",
    unitId: "centro",
    version: 1,
  },
  {
    applies: true,
    category: "upcoming-appointment",
    dedupeKey: "upcoming:appointment-upcoming",
    destination: { appointmentId: "appointment-upcoming", kind: "agenda" },
    detail: "O próximo horário começa dentro de 10 minutos.",
    id: "fact-upcoming",
    occurredAt: "2026-07-24T15:18:00-03:00",
    severity: "informational",
    summary: "Próximo atendimento se aproxima",
    unitId: "centro",
    version: 1,
  },
  {
    applies: true,
    category: "blocked-time",
    dedupeKey: "blocked:blocked-slot",
    destination: { kind: "agenda" },
    detail: "Há um bloqueio ativo no período operacional de hoje.",
    id: "fact-blocked",
    occurredAt: "2026-07-24T15:10:00-03:00",
    severity: "informational",
    summary: "Horário bloqueado na Agenda",
    unitId: "centro",
    version: 1,
  },
  {
    applies: true,
    category: "appointment-change",
    dedupeKey: "event:appointment-changed:2",
    destination: { appointmentId: "appointment-changed", kind: "agenda" },
    detail: "Uma alteração explícita de horário foi registrada.",
    id: "event-appointment-changed",
    occurredAt: "2026-07-24T15:00:00-03:00",
    severity: "informational",
    summary: "Agendamento alterado",
    unitId: "centro",
    version: 2,
  },
  {
    applies: false,
    category: "pending-payment",
    dedupeKey: "payment:session-resolved",
    destination: { kind: "checkout", sessionId: "session-resolved" },
    detail: "O pagamento foi registrado na origem operacional.",
    id: "fact-resolved-payment",
    occurredAt: "2026-07-24T14:30:00-03:00",
    resolvedAt: "2026-07-24T14:50:00-03:00",
    severity: "attention",
    summary: "Pagamento concluído",
    unitId: "centro",
    version: 2,
  },
]

export function factsForScenario(id: OperationalNotificationScenarioId): NotificationSourceFact[] {
  if (id === "empty") return []
  if (id === "resolved") return baseFacts.map((fact) => ({ ...fact, applies: false }))
  if (id === "duplicates") return [...baseFacts, { ...baseFacts[0], id: "duplicate-conflict" }]
  if (id === "missing-target")
    return [
      {
        ...baseFacts[3],
        dedupeKey: "payment:missing",
        destination: { kind: "checkout", sessionId: "unsafe/id" },
        id: "fact-missing",
      },
    ]
  if (id === "overflow")
    return Array.from({ length: 105 }, (_, index) => ({
      ...baseFacts[index % 7],
      dedupeKey: `overflow:${String(index).padStart(3, "0")}`,
      id: `fact-overflow-${index}`,
      occurredAt: `2026-07-24T${String(10 + Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}:00-03:00`,
    }))
  if (id === "long-content")
    return baseFacts.map((fact) => ({
      ...fact,
      detail: `${fact.detail} Esta explicação permanece limitada e quebra em várias linhas para validar conteúdo longo sem ampliar o cartão ou causar rolagem horizontal.`,
    }))
  return [...baseFacts]
}
