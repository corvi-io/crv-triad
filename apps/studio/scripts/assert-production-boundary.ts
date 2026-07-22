import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"

const distDirectory = path.resolve(import.meta.dir, "../dist")
const forbiddenMarkers = [
  "@faker-js/faker",
  "MemoryScenarioEngine",
  "Sandbox de componentes",
  "Falhar próxima operação",
  "Cenário restaurado",
  "Intentional development failure",
  "SchedulingMemoryRepository",
  "Unidade sintética Centro",
  "Cliente Sintético Com Nome",
  "appointment-dense-",
  "approvedKanbanFixtures",
  "kanban-01",
  "transition-rollback",
  "João Vitor",
  ".stories.",
]

const files = await walk(distDirectory)
if (files.length === 0) {
  throw new Error("Production boundary check requires a completed Studio build.")
}

let totalBytes = 0
for (const file of files) {
  totalBytes += (await stat(file)).size
  if (!/\.(css|html|js|json|map)$/.test(file)) continue
  const contents = await readFile(file, "utf8")
  for (const marker of forbiddenMarkers) {
    if (contents.includes(marker)) {
      throw new Error(
        `Production output contains forbidden development marker ${marker} in ${file}.`,
      )
    }
  }
}

console.log(`Production boundary verified across ${files.length} files (${totalBytes} bytes).`)

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      return entry.isDirectory() ? walk(target) : [target]
    }),
  )
  return nested.flat()
}
