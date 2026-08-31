import type { ServiceDeskScenarioId } from "@/modules/service-desk/contracts"

export const developmentScenarioGroups = [
  "queue",
  "reliability",
  "fulfillment",
  "checkout",
] as const
export type DevelopmentScenarioGroup = (typeof developmentScenarioGroups)[number]
export type DevelopmentScenarioPresentation = {
  description: string
  group: DevelopmentScenarioGroup
  label: string
}

export const developmentScenarioPresentation: Record<
  ServiceDeskScenarioId,
  DevelopmentScenarioPresentation
> = {
  typical: {
    description: "Fila normal com trajetos agendado e sem agendamento.",
    group: "queue",
    label: "Normal",
  },
  empty: { description: "Fila sem registros.", group: "queue", label: "Vazio" },
  dense: {
    description: "Coleção limitada para avaliação visual densa.",
    group: "queue",
    label: "Denso",
  },
  "long-wait": {
    description: "Registro com espera longa e conteúdo extenso.",
    group: "queue",
    label: "Espera longa",
  },
  "specific-professional": {
    description: "Preferência por profissional específico.",
    group: "queue",
    label: "Profissional específico",
  },
  "first-available": {
    description: "Preferência sem atribuição automática.",
    group: "queue",
    label: "Primeiro disponível",
  },
  "unavailable-professional": {
    description: "Transição recuperável para profissional indisponível.",
    group: "queue",
    label: "Profissional indisponível",
  },
  slow: {
    description: "Resposta com atraso determinístico.",
    group: "reliability",
    label: "Lento",
  },
  "next-failure": {
    description: "A próxima operação falha antes de escrever.",
    group: "reliability",
    label: "Próxima falha",
  },
  "persistent-error": {
    description: "Operações falham até a troca de cenário.",
    group: "reliability",
    label: "Erro persistente",
  },
  "fulfillment-single": {
    description: "Cenário determinístico de fulfillment.",
    group: "fulfillment",
    label: "Atendimento simples",
  },
  "fulfillment-multiple": {
    description: "Cenário determinístico de fulfillment.",
    group: "fulfillment",
    label: "Múltiplos serviços",
  },
  "fulfillment-multi-professional": {
    description: "Cenário determinístico de fulfillment.",
    group: "fulfillment",
    label: "Múltiplos profissionais",
  },
  "fulfillment-long-running": {
    description: "Cenário determinístico de fulfillment.",
    group: "fulfillment",
    label: "Atendimento longo",
  },
  "fulfillment-long-labels": {
    description: "Cenário determinístico de fulfillment.",
    group: "fulfillment",
    label: "Conteúdo longo",
  },
  "fulfillment-no-eligible": {
    description: "Cenário determinístico de fulfillment.",
    group: "fulfillment",
    label: "Sem profissional elegível",
  },
  "fulfillment-ready": {
    description: "Cenário determinístico de fulfillment.",
    group: "fulfillment",
    label: "Pronto para pagamento",
  },
  "checkout-pix": { description: "Pagamento por PIX.", group: "checkout", label: "PIX" },
  "checkout-cash": { description: "Pagamento em dinheiro.", group: "checkout", label: "Dinheiro" },
  "checkout-debit": { description: "Pagamento no débito.", group: "checkout", label: "Débito" },
  "checkout-credit": { description: "Pagamento no crédito.", group: "checkout", label: "Crédito" },
  "checkout-mixed": { description: "Pagamento dividido.", group: "checkout", label: "Misto" },
  "checkout-discount": {
    description: "Desconto autorizado.",
    group: "checkout",
    label: "Desconto",
  },
  "checkout-surcharge": {
    description: "Acréscimo operacional.",
    group: "checkout",
    label: "Acréscimo",
  },
  "checkout-price-override": {
    description: "Preço ajustado.",
    group: "checkout",
    label: "Preço ajustado",
  },
  "checkout-unauthorized": {
    description: "Ajuste sem autorização.",
    group: "checkout",
    label: "Sem autorização",
  },
  "checkout-fixed-commission": {
    description: "Comissão fixa.",
    group: "checkout",
    label: "Comissão fixa",
  },
  "checkout-no-commission": {
    description: "Sem comissão.",
    group: "checkout",
    label: "Sem comissão",
  },
  "checkout-multi-professional": {
    description: "Dois profissionais.",
    group: "checkout",
    label: "Múltiplos profissionais",
  },
  "checkout-scheduled": {
    description: "Atendimento agendado.",
    group: "checkout",
    label: "Agendado",
  },
  "checkout-walk-in": {
    description: "Atendimento sem agendamento.",
    group: "checkout",
    label: "Sem agendamento",
  },
  "checkout-decline": { description: "Pagamento recusado.", group: "checkout", label: "Recusado" },
  "checkout-slow": { description: "Resposta com atraso.", group: "checkout", label: "Lento" },
  "checkout-next-failure": {
    description: "Próxima operação falha.",
    group: "checkout",
    label: "Próxima falha",
  },
  "checkout-persistent-error": {
    description: "Operações falham.",
    group: "checkout",
    label: "Erro persistente",
  },
  "checkout-paid": { description: "Venda já paga.", group: "checkout", label: "Pago" },
  "checkout-long-content": {
    description: "Conteúdo extenso.",
    group: "checkout",
    label: "Conteúdo longo",
  },
}
export const developmentScenarioGroupLabels: Record<DevelopmentScenarioGroup, string> = {
  queue: "Fila",
  reliability: "Confiabilidade",
  fulfillment: "Execução",
  checkout: "Checkout",
}
