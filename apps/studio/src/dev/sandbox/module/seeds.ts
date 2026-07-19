import { faker } from "@faker-js/faker"
import type { ScenarioDefinition } from "@/dev/mock-engine"
import type { SandboxRecord } from "./contracts"

const vocabulary = ["Alpha", "Bravo", "Charlie", "Delta", "Eco", "Foxtrot"] as const

export const sandboxScenarios: readonly ScenarioDefinition<SandboxRecord>[] = [
  scenario("default", "Padrão", "Dados equilibrados para interação diária.", 24),
  scenario("empty", "Vazio", "Nenhum registro para validar o estado vazio.", 0),
  scenario(
    "all-states",
    "Todos os estados",
    "Distribuição pequena de estados e conteúdo longo.",
    12,
  ),
  scenario("dense", "Denso", "Mais linhas em uma área vertical limitada.", 60),
  scenario(
    "large",
    "Maior",
    "Conjunto local maior para estresse visual, sem alegação de capacidade.",
    500,
  ),
  { ...scenario("slow", "Lento", "Latência determinística e limitada.", 24), latencyMs: 700 },
  {
    ...scenario("error", "Erro", "Falha intencional persistente até a troca do cenário.", 24),
    persistentFailure: true,
  },
]

function scenario(
  id: string,
  label: string,
  description: string,
  count: number,
): ScenarioDefinition<SandboxRecord> {
  faker.seed(3300 + count + id.length)
  return {
    id,
    label,
    description,
    records: Array.from({ length: count }, (_, index) => ({
      id: `record-${String(index + 1).padStart(4, "0")}`,
      title: `Registro ${String(index + 1).padStart(3, "0")}`,
      summary:
        id === "all-states" && index === 0
          ? "Conteúdo deliberadamente longo para verificar quebra de linha, leitura e adaptação responsiva sem introduzir semântica de produto."
          : `${faker.helpers.arrayElement(vocabulary)} ${faker.number.int({ min: 10, max: 99 })}`,
      state: index % 3 === 0 ? "paused" : "active",
      updatedAt: new Date(Date.UTC(2026, 0, 1 + (index % 28), 12)).toISOString(),
    })),
  }
}
