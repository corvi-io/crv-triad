import type { ScenarioDefinition } from "@/dev/mock-engine/types"
import type {
  Appointment,
  AppointmentStatus,
  CancellationReason,
  PaymentStatus,
} from "@/modules/scheduling/contracts"

export const SCHEDULING_FIXTURE_DATE = "2026-07-19"

type FixtureOptions = {
  cancellationReason?: CancellationReason
  durationMinutes?: number
  notes?: string
  paymentStatus?: PaymentStatus
  priceCents?: number
  professionalId?: string
  rating?: number
  serviceId?: string
  status?: AppointmentStatus
  tags?: readonly string[]
}

function appointment(
  id: string,
  customerName: string,
  start: string,
  options: FixtureOptions = {},
): Appointment {
  return {
    cancellationReason: options.cancellationReason,
    clientId: `client-${id}`,
    customerName,
    customerPhone: "81900000000",
    date: SCHEDULING_FIXTURE_DATE,
    durationMinutes: options.durationMinutes ?? 45,
    id,
    notes: options.notes ?? "Dados exclusivamente sintéticos para validação visual.",
    origin: "reception",
    paymentStatus: options.paymentStatus ?? "pending",
    priceCents: options.priceCents ?? 6500,
    professionalId: options.professionalId ?? "professional-carlos",
    rating: options.rating ?? 4.7,
    serviceId: options.serviceId ?? "service-hair-beard",
    start,
    status: options.status ?? "confirmed",
    tags: options.tags ?? [],
    unitId: "centro",
  }
}

const professionalFixtures = [
  {
    clients: [
      "João Vitor",
      "Carlos Eduardo",
      "Pedro Henrique",
      "Lucas Martins",
      "Rafael Costa",
      "Guilherme Souza",
      "Felipe Andrade",
    ],
    id: "professional-carlos",
  },
  {
    clients: [
      "Matheus R.",
      "Victor Hugo",
      "Bruno Santos",
      "João Pedro",
      "Rodrigo Alves",
      "Henrique Souza",
      "Eduardo Lima",
    ],
    id: "professional-bruno",
  },
  {
    clients: [
      "Juliana Costa",
      "Beatriz Lima",
      "Isabela Martins",
      "Fernanda Alves",
      "Larissa Souza",
      "Mariana Rocha",
      "Camila Pereira",
    ],
    id: "professional-ana",
  },
  {
    clients: [
      "Thiago Pereira",
      "Gabriel Lima",
      "João Paulo",
      "Leonardo Silva",
      "Paulo Henrique",
      "Ricardo Alves",
      "Bruno Alves",
    ],
    id: "professional-joao",
  },
  {
    clients: [
      "Arthur Santos",
      "Gustavo Oliveira",
      "Bruno Rocha",
      "Mateus Alves",
      "Felipe Andrade",
      "Diogo Henrique",
      "Leonardo Dias",
    ],
    id: "professional-diego",
  },
  {
    clients: [
      "Paulo Henrique",
      "Matheus Silva",
      "Brayan Rocha",
      "Ramon Martins",
      "Gabriel Silva",
      "João Pedro",
      "Ricardo Alves",
    ],
    id: "professional-marcos",
  },
] as const

const fixtureStarts = ["08:00", "08:45", "09:30", "10:15", "11:00", "11:45", "12:30"] as const
const fixtureServices = [
  { durationMinutes: 45, id: "service-hair-beard", priceCents: 6500 },
  { durationMinutes: 35, id: "service-fade", priceCents: 4500 },
  { durationMinutes: 45, id: "service-cut-beard", priceCents: 6500 },
  { durationMinutes: 30, id: "service-simple-cut", priceCents: 3500 },
] as const
const fixtureStatuses: readonly AppointmentStatus[] = [
  "completed",
  "in-progress",
  "arrived",
  "waiting",
  "confirmed",
  "canceled",
  "no-show",
]

export const approvedBoardFixtures: readonly Appointment[] = professionalFixtures.flatMap(
  (professional, professionalIndex) =>
    professional.clients.map((customerName, slotIndex) => {
      const index = professionalIndex * fixtureStarts.length + slotIndex
      const service = fixtureServices[(professionalIndex + slotIndex) % fixtureServices.length]
      const status = fixtureStatuses[(professionalIndex + slotIndex) % fixtureStatuses.length]
      return appointment(
        `kanban-${String(index + 1).padStart(2, "0")}`,
        customerName,
        fixtureStarts[slotIndex],
        {
          cancellationReason:
            status === "no-show" ? "no-show" : status === "canceled" ? "client" : undefined,
          durationMinutes: service.durationMinutes,
          notes:
            status === "no-show"
              ? "Não compareceu"
              : status === "canceled"
                ? "Cliente cancelou"
                : "Preferência sintética registrada para avaliação visual.",
          paymentStatus: status === "completed" ? "paid" : "pending",
          priceCents: service.priceCents,
          professionalId: professional.id,
          rating: 4.5 + ((professionalIndex + slotIndex) % 5) / 10,
          serviceId: service.id,
          status,
          tags: slotIndex % 3 === 0 ? ["Retorno"] : [],
        },
      )
    }),
)

// Retained as a compatibility export for focused tests and old development links.
export const approvedKanbanFixtures = approvedBoardFixtures

const dense = Array.from({ length: 72 }, (_, index) => {
  const professionalIndex = index % professionalFixtures.length
  const rowIndex = Math.floor(index / professionalFixtures.length)
  const source = approvedBoardFixtures[index % approvedBoardFixtures.length]
  const startMinutes = 8 * 60 + rowIndex * 45
  return {
    ...source,
    clientId: `${source.clientId}-dense-${index}`,
    customerName: `${source.customerName} ${index + 1}`,
    id: `appointment-dense-${String(index + 1).padStart(2, "0")}`,
    professionalId: professionalFixtures[professionalIndex].id,
    start: `${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}`,
  }
})

export const schedulingScenarios: readonly ScenarioDefinition<Appointment>[] = [
  {
    id: "normal",
    label: "Quadro preenchido",
    description: "Seis barbeiros e 42 agendamentos sintéticos para a jornada principal.",
    records: approvedBoardFixtures,
  },
  { id: "empty", label: "Vazio", description: "Período sem agendamentos.", records: [] },
  {
    id: "empty-column",
    label: "Coluna vazia",
    description: "Jornada sem registros em espera.",
    records: approvedBoardFixtures.filter(({ status }) => status !== "waiting"),
  },
  {
    id: "filtered-empty",
    label: "Filtro sem resultado",
    description: "Registros disponíveis para validar um filtro sem correspondência.",
    records: approvedBoardFixtures,
  },
  {
    id: "all-statuses",
    label: "Todos os status",
    description: "Inclui o status Agendado, mantido fora das seis colunas.",
    records: [
      appointment("status-scheduled", "Cliente agendado", "08:00", { status: "scheduled" }),
      appointment("status-confirmed", "Cliente confirmado", "09:00", { status: "confirmed" }),
      appointment("status-arrived", "Cliente em check-in", "10:00", { status: "arrived" }),
      appointment("status-waiting", "Cliente em espera", "11:00", { status: "waiting" }),
      appointment("status-in-progress", "Cliente em atendimento", "13:00", {
        status: "in-progress",
      }),
      appointment("status-completed", "Cliente finalizado", "14:00", {
        paymentStatus: "paid",
        status: "completed",
      }),
      appointment("status-canceled", "Cliente cancelado", "15:00", {
        cancellationReason: "client",
        status: "canceled",
      }),
      appointment("status-no-show", "Cliente no-show", "16:00", {
        cancellationReason: "no-show",
        status: "no-show",
      }),
    ],
  },
  { id: "dense", label: "Denso", description: "Carga visual com 72 cartões.", records: dense },
  {
    id: "many-professionals",
    label: "Muitos profissionais",
    description: "Grade diária com colunas extras.",
    records: approvedBoardFixtures,
  },
  {
    id: "long-content",
    label: "Conteúdo longo",
    description: "Conteúdo extenso sem ocultar ações ou estado.",
    records: [
      appointment(
        "appointment-long",
        "Cliente Sintético Com Nome Intencionalmente Muito Extenso Para Teste",
        "09:15",
        {
          notes:
            "Observação sintética longa para confirmar leitura, quebra de linha, foco visível e ações em zoom de duzentos por cento.",
          status: "confirmed",
          tags: ["Relacionamento recorrente", "Preferência documentada"],
        },
      ),
    ],
  },
  {
    id: "blocked",
    label: "Bloqueios",
    description: "Pausas e períodos indisponíveis na grade.",
    records: [appointment("appointment-blocked", "Cliente de bloqueio", "13:00")],
  },
  {
    id: "walk-in",
    label: "Encaixes",
    description: "Marcadores de encaixe na grade diária.",
    records: approvedBoardFixtures.slice(0, 3),
  },
  {
    id: "conflict",
    label: "Conflito",
    description: "Horário ocupado para testar recuperação.",
    records: [appointment("appointment-conflict", "Cliente de conflito", "10:00")],
  },
  {
    id: "slow",
    label: "Lento",
    description: "Resposta com atraso controlado.",
    latencyMs: 900,
    records: approvedBoardFixtures,
  },
  {
    id: "next-failure",
    label: "Próxima falha",
    description: "A próxima consulta falha uma vez.",
    records: approvedBoardFixtures,
  },
  {
    id: "transition-rollback",
    label: "Rollback de status",
    description: "A próxima transição falha após o movimento otimista.",
    records: approvedBoardFixtures,
  },
  {
    id: "persistent-error",
    label: "Erro persistente",
    description: "Todas as operações falham até trocar o cenário.",
    persistentFailure: true,
    records: approvedBoardFixtures,
  },
]
