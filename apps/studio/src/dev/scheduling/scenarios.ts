import type { ScenarioDefinition } from "@/dev/mock-engine/types"
import type { Appointment, AppointmentStatus } from "@/modules/scheduling/contracts"

const DATE = "2026-07-19"
const statuses: readonly AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "arrived",
  "waiting",
  "in-progress",
  "completed",
  "canceled",
  "no-show",
]

function appointment(
  id: string,
  start: string,
  professionalId = "professional-ana",
  status: AppointmentStatus = "scheduled",
  customerName = `Cliente sintético ${id}`,
): Appointment {
  return {
    customerName,
    customerPhone: "81900000000",
    date: DATE,
    durationMinutes: 45,
    id,
    notes: "Dados exclusivamente sintéticos para validação visual.",
    origin: "reception",
    priceCents: 5500,
    professionalId,
    serviceId: "service-cut",
    start,
    status,
  }
}

const normal = [
  appointment("appointment-001", "09:00", "professional-ana", "confirmed", "Marina Teste"),
  appointment("appointment-002", "10:30", "professional-bruno", "arrived", "Caio Exemplo"),
  appointment("appointment-003", "14:00", "professional-carla", "in-progress", "Luiza Fictícia"),
]

const dense = Array.from({ length: 24 }, (_, index) => {
  const hour = 8 + Math.floor(index / 3)
  const minute = (index % 3) * 15
  const professional = ["professional-ana", "professional-bruno", "professional-carla"][index % 3]
  return appointment(
    `appointment-dense-${String(index + 1).padStart(2, "0")}`,
    `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    professional,
    statuses[index % statuses.length],
  )
})

export const schedulingScenarios: readonly ScenarioDefinition<Appointment>[] = [
  {
    id: "normal",
    label: "Normal",
    description: "Dia equilibrado para a jornada principal.",
    records: normal,
  },
  { id: "empty", label: "Vazio", description: "Dia sem agendamentos.", records: [] },
  {
    id: "all-statuses",
    label: "Todos os status",
    description: "Um exemplo de cada status.",
    records: statuses.map((status, index) =>
      appointment(
        `appointment-status-${index}`,
        `${String(8 + index).padStart(2, "0")}:00`,
        ["professional-ana", "professional-bruno", "professional-carla"][index % 3],
        status,
      ),
    ),
  },
  {
    id: "dense",
    label: "Denso",
    description: "Muitos agendamentos e rolagem vertical.",
    records: dense,
  },
  {
    id: "many-professionals",
    label: "Muitos profissionais",
    description: "Colunas extras e rolagem horizontal.",
    records: dense.slice(0, 12),
  },
  {
    id: "long-content",
    label: "Conteúdo longo",
    description: "Nomes extensos sem ocultar horário e status.",
    records: [
      appointment(
        "appointment-long",
        "09:15",
        "professional-ana",
        "confirmed",
        "Cliente Sintético Com Nome Intencionalmente Muito Extenso Para Teste",
      ),
    ],
  },
  {
    id: "blocked",
    label: "Bloqueios",
    description: "Pausas e períodos indisponíveis.",
    records: [appointment("appointment-blocked", "13:00")],
  },
  {
    id: "walk-in",
    label: "Encaixes",
    description: "Marcadores visuais de encaixe, sem fila.",
    records: normal,
  },
  {
    id: "conflict",
    label: "Conflito",
    description: "Horário ocupado para testar recuperação.",
    records: [appointment("appointment-conflict", "10:00", "professional-ana", "confirmed")],
  },
  {
    id: "slow",
    label: "Lento",
    description: "Resposta simulada com atraso controlado.",
    latencyMs: 900,
    records: normal,
  },
  {
    id: "next-failure",
    label: "Próxima falha",
    description: "A próxima operação falha uma vez.",
    records: normal,
  },
  {
    id: "persistent-error",
    label: "Erro persistente",
    description: "Todas as operações falham até trocar o cenário.",
    persistentFailure: true,
    records: normal,
  },
]
