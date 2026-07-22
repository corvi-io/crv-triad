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

export const approvedKanbanFixtures: readonly Appointment[] = [
  appointment("kanban-01", "João Vitor", "09:30", {
    notes: "Prefere pompadour com volume",
    professionalId: "professional-carlos",
    rating: 4.5,
    status: "confirmed",
    tags: ["VIP", "Em 20 min"],
  }),
  appointment("kanban-02", "Pedro Henrique", "10:15", {
    durationMinutes: 35,
    notes: "Degradê alto, transição suave",
    priceCents: 4500,
    professionalId: "professional-bruno",
    rating: 4.6,
    serviceId: "service-fade",
    status: "confirmed",
    tags: ["Em 1h"],
  }),
  appointment("kanban-03", "Guilherme Souza", "11:00", {
    durationMinutes: 50,
    notes: "Barba alinhada na navalha",
    priceCents: 7500,
    professionalId: "professional-ana",
    rating: 4.8,
    status: "confirmed",
    tags: ["VIP", "Em 1h30"],
  }),
  appointment("kanban-04", "Carlos Lima", "09:50", {
    durationMinutes: 40,
    notes: "Laterais baixas, topo texturizado",
    priceCents: 5500,
    professionalId: "professional-bruno",
    rating: 4.6,
    status: "arrived",
    tags: ["Novo"],
  }),
  appointment("kanban-05", "Matheus R.", "10:20", {
    durationMinutes: 35,
    notes: "Risco na sobrancelha",
    paymentStatus: "paid",
    priceCents: 4500,
    professionalId: "professional-ana",
    serviceId: "service-fade",
    status: "arrived",
  }),
  appointment("kanban-06", "Lucas Silva", "10:50", {
    paymentStatus: "paid",
    professionalId: "professional-carlos",
    status: "arrived",
  }),
  appointment("kanban-07", "Felipe Andrade", "09:20", {
    notes: "Prefere volume no topo",
    professionalId: "professional-ana",
    rating: 4.8,
    serviceId: "service-cut-beard",
    status: "waiting",
    tags: ["Retorno", "Atrasado 10 min"],
  }),
  appointment("kanban-08", "Carian R.", "09:50", {
    notes: "Barba cheia bem alinhada",
    status: "waiting",
    tags: ["Em 10 min"],
  }),
  appointment("kanban-09", "Gabriel Lima", "10:20", {
    durationMinutes: 35,
    notes: "Degradê médio",
    priceCents: 4500,
    serviceId: "service-fade",
    status: "waiting",
    tags: ["Em 20 min"],
  }),
  appointment("kanban-10", "André Silva", "09:10", {
    notes: "Acabamento com máquina 0 alta",
    rating: 4.8,
    serviceId: "service-cut-beard",
    status: "in-progress",
  }),
  appointment("kanban-11", "Paulo Henrique", "09:30", {
    professionalId: "professional-bruno",
    status: "in-progress",
  }),
  appointment("kanban-12", "Gustavo Oliveira", "09:50", {
    durationMinutes: 35,
    notes: "Topo texturizado",
    priceCents: 4500,
    rating: 4.9,
    serviceId: "service-fade",
    status: "in-progress",
  }),
  appointment("kanban-13", "Marcos Paulo", "08:30", {
    notes: "",
    paymentStatus: "paid",
    rating: 4.8,
    status: "completed",
  }),
  appointment("kanban-14", "Felipe Andrade", "08:50", {
    durationMinutes: 30,
    notes: "",
    paymentStatus: "paid",
    priceCents: 3500,
    professionalId: "professional-bruno",
    rating: 4.6,
    serviceId: "service-simple-cut",
    status: "completed",
  }),
  appointment("kanban-15", "Gustavo Oliveira", "09:20", {
    notes: "",
    paymentStatus: "paid",
    professionalId: "professional-ana",
    status: "completed",
  }),
  appointment("kanban-16", "Paulo Henrique", "09:15", {
    cancellationReason: "client",
    notes: "Cliente cancelou",
    status: "canceled",
  }),
  appointment("kanban-17", "Gustavo Oliveira", "11:30", {
    cancellationReason: "no-show",
    durationMinutes: 35,
    notes: "Não compareceu",
    priceCents: 4500,
    professionalId: "professional-bruno",
    serviceId: "service-fade",
    status: "no-show",
  }),
  appointment("kanban-18", "Bruno Rocha", "12:00", {
    cancellationReason: "barbershop",
    durationMinutes: 35,
    notes: "",
    priceCents: 4500,
    professionalId: "professional-bruno",
    serviceId: "service-fade",
    status: "canceled",
  }),
]

const dense = Array.from({ length: 72 }, (_, index) => {
  const source = approvedKanbanFixtures[index % approvedKanbanFixtures.length]
  return {
    ...source,
    clientId: `${source.clientId}-dense-${index}`,
    customerName: `${source.customerName} ${index + 1}`,
    id: `appointment-dense-${String(index + 1).padStart(2, "0")}`,
  }
})

export const schedulingScenarios: readonly ScenarioDefinition<Appointment>[] = [
  {
    id: "normal",
    label: "Kanban aprovado",
    description: "Os 18 registros sintéticos aprovados para a jornada principal.",
    records: approvedKanbanFixtures,
  },
  { id: "empty", label: "Vazio", description: "Período sem agendamentos.", records: [] },
  {
    id: "empty-column",
    label: "Coluna vazia",
    description: "Jornada sem registros em espera.",
    records: approvedKanbanFixtures.filter(({ status }) => status !== "waiting"),
  },
  {
    id: "filtered-empty",
    label: "Filtro sem resultado",
    description: "Registros disponíveis para validar um filtro sem correspondência.",
    records: approvedKanbanFixtures,
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
    records: approvedKanbanFixtures,
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
    records: approvedKanbanFixtures.slice(0, 3),
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
    records: approvedKanbanFixtures,
  },
  {
    id: "next-failure",
    label: "Próxima falha",
    description: "A próxima consulta falha uma vez.",
    records: approvedKanbanFixtures,
  },
  {
    id: "transition-rollback",
    label: "Rollback de status",
    description: "A próxima transição falha após o movimento otimista.",
    records: approvedKanbanFixtures,
  },
  {
    id: "persistent-error",
    label: "Erro persistente",
    description: "Todas as operações falham até trocar o cenário.",
    persistentFailure: true,
    records: approvedKanbanFixtures,
  },
]
