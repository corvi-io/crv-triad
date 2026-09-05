import { describe, expect, it } from "vitest"
import {
  ClientMemoryRepository,
  normalizeEmail,
  normalizePhone,
} from "@/dev/clients/memory-repository"
import { SimulatedMockFailure } from "@/dev/mock-engine"
import {
  clientFormSchema,
  clientFormValuesToInput,
  createClientFormDefaults,
  noteSchema,
} from "@/modules/clients/client-schema"
import { ClientOperationInvalidatedError } from "@/modules/clients/contracts"
import { resolveClientScenario, validateClientSearch } from "@/modules/clients/search"

const query = {
  contact: "all" as const,
  duplicate: "all" as const,
  page: 1,
  pageSize: 10 as const,
  scenarioId: "typical" as const,
  search: "",
  sort: { direction: "asc" as const, field: "name" as const },
  status: "active" as const,
  tag: "",
}

describe("client management contracts", () => {
  it("allowlists safe URL state and excludes free-text search", () => {
    const result = validateClientSearch(
      {
        contact: "bad",
        duplicate: "possible",
        email: "private@example.invalid",
        page: -4,
        pageSize: 999,
        scenario: "unknown",
        search: "private name",
        sortDirection: "sideways",
        sortField: "privateField",
        status: "archived",
        tag: "not safe!",
      },
      resolveClientScenario,
    )
    expect(result).toEqual({
      client: undefined,
      contact: "all",
      duplicate: "possible",
      mode: undefined,
      page: 1,
      pageSize: 20,
      scenario: "typical",
      sortDirection: "asc",
      sortField: "name",
      status: "archived",
      tag: "",
    })
    expect(result).not.toHaveProperty("search")
  })

  it("validates name and at least one contact with Brazilian Portuguese messages", () => {
    const empty = clientFormSchema.safeParse(createClientFormDefaults())
    expect(empty.success).toBe(false)
    if (empty.success) return
    expect(empty.error.issues.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        "Informe o nome do cliente.",
        "Informe pelo menos um telefone ou e-mail.",
      ]),
    )
    const valid = clientFormSchema.parse({
      ...createClientFormDefaults(),
      email: "CLIENTE@EXAMPLE.INVALID",
      name: "Cliente Sintético Novo",
    })
    expect(clientFormValuesToInput(valid).email).toBe("cliente@example.invalid")
  })

  it("preserves legacy service preferences while editing a client", () => {
    const values = createClientFormDefaults({
      email: "cliente@example.invalid",
      name: "Cliente Sintético",
      phone: "",
      preferenceNote: "",
      servicePreferences: ["Preferência histórica"],
      tags: [],
    })
    expect(clientFormValuesToInput(clientFormSchema.parse(values)).servicePreferences).toEqual([
      "Preferência histórica",
    ])
  })

  it("accepts a real localized tag as URL-backed filter state", () => {
    expect(validateClientSearch({ tag: "Manhã VIP" }, resolveClientScenario).tag).toBe("Manhã VIP")
  })

  it("restores a shareable client drawer and only serializes edit as a mode", () => {
    expect(
      validateClientSearch({ client: "client_01", mode: "edit" }, resolveClientScenario),
    ).toMatchObject({ client: "client_01", mode: "edit" })
    expect(
      validateClientSearch({ client: "client_01", mode: "view" }, resolveClientScenario),
    ).toMatchObject({ client: "client_01", mode: undefined })
    expect(
      validateClientSearch({ client: "../unsafe" }, resolveClientScenario).client,
    ).toBeUndefined()
  })

  it.each([
    ["name", "x".repeat(101), "Use no máximo 100 caracteres no nome."],
    ["phone", "1".repeat(14), "Informe um telefone com no máximo 13 dígitos."],
    ["tagsText", "x".repeat(121), "Use no máximo 120 caracteres nas tags."],
  ] as const)("localizes the %s maximum-length validation", (field, value, message) => {
    const result = clientFormSchema.safeParse({
      ...createClientFormDefaults(),
      email: "cliente@example.invalid",
      name: "Cliente Sintético",
      [field]: value,
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues).toContainEqual(expect.objectContaining({ message, path: [field] }))
  })

  it("localizes the note maximum-length validation", () => {
    const result = noteSchema.safeParse({ body: "x".repeat(501) })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        message: "Use no máximo 500 caracteres na nota.",
        path: ["body"],
      }),
    )
  })

  it("normalizes exact duplicate contacts without fuzzy matching", () => {
    expect(normalizeEmail(" Igual@Example.Invalid ")).toBe("igual@example.invalid")
    expect(normalizePhone("+55 (81) 99999-0001")).toBe("5581999990001")
  })
})

describe("client memory repository", () => {
  it("queries the full bounded collection before pagination and exposes exact duplicate warnings", async () => {
    const repository = new ClientMemoryRepository()
    const dense = await repository.list({ ...query, page: 99, scenarioId: "dense" })
    expect(dense.pageSize).toBe(10)
    expect(dense.totalCount).toBe(86)
    expect(dense.page).toBe(dense.totalPages)
    expect(dense.items.length).toBeLessThanOrEqual(10)

    const duplicates = await repository.list({
      ...query,
      duplicate: "possible",
      scenarioId: "duplicate-candidates",
    })
    expect(duplicates.totalCount).toBe(4)
    const warnings = await repository.findDuplicates(
      { email: "duplicado.a@example.invalid", phone: "5581999990001" },
      "client-01",
    )
    expect(warnings).toContainEqual(
      expect.objectContaining({
        candidateId: "client-02",
        field: "phone",
        label: "Mesmo telefone",
      }),
    )
  })

  it("keeps create, edit, archive, restore, and note mutations in session memory", async () => {
    const repository = new ClientMemoryRepository()
    await repository.list({ ...query, scenarioId: "empty" })
    const input = {
      email: "novo@example.invalid",
      name: "Cliente Sintético Novo",
      phone: "",
      preferenceNote: "",
      servicePreferences: ["Corte clássico"],
      tags: ["novo"],
    }
    const created = await repository.create(input)
    expect(created.id).toBe("client-0001")
    expect(
      (await repository.update(created.id, { ...input, name: "Cliente Sintético Editado" }, 1))
        .name,
    ).toContain("Editado")
    expect((await repository.setArchived(created.id, true, 1)).status).toBe("archived")
    expect((await repository.setArchived(created.id, false, 1)).status).toBe("active")
    const withNote = await repository.addNote(created.id, {
      body: "Nota sintética de atendimento.",
    })
    const note = withNote.notes[0]
    expect(note).toBeDefined()
    const edited = await repository.updateNote(
      created.id,
      note?.id ?? "",
      { body: "Nota revisada." },
      note?.version ?? 1,
    )
    expect(edited.notes[0]?.body).toBe("Nota revisada.")
    expect(
      (await repository.removeNote(created.id, note?.id ?? "", note?.version ?? 1)).notes,
    ).toHaveLength(0)
  })

  it("keeps failed mutations atomic so retry starts from the original snapshot", async () => {
    const repository = new ClientMemoryRepository()
    const before = await repository.get("client-01", "typical")
    repository.failNextOperation()
    await expect(
      repository.update(before.id, { ...before, name: "Alteração que deve falhar" }, 1),
    ).rejects.toBeInstanceOf(SimulatedMockFailure)
    expect(await repository.get(before.id, "typical")).toEqual(before)
    await expect(
      repository.update(before.id, { ...before, name: "Alteração após retry" }, 1),
    ).resolves.toMatchObject({ name: "Alteração após retry" })
  })

  it("resets deterministically on a fresh repository and rolls back the one-shot failure atomically", async () => {
    const first = new ClientMemoryRepository()
    await first.list({ ...query, scenarioId: "empty" })
    const input = {
      email: "reload@example.invalid",
      name: "Cliente Sintético Reload",
      phone: "",
      preferenceNote: "",
      servicePreferences: [],
      tags: [],
    }
    expect((await first.create(input)).id).toBe("client-0001")
    const reloaded = new ClientMemoryRepository()
    expect((await reloaded.list({ ...query, scenarioId: "empty" })).totalCount).toBe(0)
    expect((await reloaded.create(input)).id).toBe("client-0001")

    const failing = new ClientMemoryRepository()
    await expect(failing.list({ ...query, scenarioId: "next-failure" })).rejects.toBeInstanceOf(
      SimulatedMockFailure,
    )
    const before = await failing.get("client-01", "next-failure")
    await expect(
      failing.update(before.id, { ...before, name: "Cliente após retry" }, 1),
    ).resolves.toMatchObject({ name: "Cliente após retry" })
  })

  it("isolates a delayed result after a scenario generation change", async () => {
    const repository = new ClientMemoryRepository()
    const stale = repository.list({ ...query, scenarioId: "slow" })
    await repository.list({ ...query, scenarioId: "typical" })
    await expect(stale).rejects.toBeInstanceOf(ClientOperationInvalidatedError)
  })

  it("rejects a delayed stale mutation before it can write into the active scenario", async () => {
    const repository = new ClientMemoryRepository()
    await repository.list({ ...query, scenarioId: "slow" })
    const slowClient = await repository.get("client-01", "slow")
    const staleMutation = repository.update(
      slowClient.id,
      { ...slowClient, name: "STALE MUTATION" },
      1,
    )

    await repository.list({ ...query, scenarioId: "typical" })
    const activeBefore = await repository.get(slowClient.id, "typical")

    await expect(staleMutation).rejects.toBeInstanceOf(ClientOperationInvalidatedError)
    expect(await repository.get(slowClient.id, "typical")).toEqual(activeBefore)
    expect(activeBefore.name).not.toBe("STALE MUTATION")
  })

  it("keeps persistent errors persistent", async () => {
    const repository = new ClientMemoryRepository()
    await expect(
      repository.list({ ...query, scenarioId: "persistent-error" }),
    ).rejects.toBeInstanceOf(SimulatedMockFailure)
    await expect(
      repository.list({ ...query, scenarioId: "persistent-error" }),
    ).rejects.toBeInstanceOf(SimulatedMockFailure)
  })
})
