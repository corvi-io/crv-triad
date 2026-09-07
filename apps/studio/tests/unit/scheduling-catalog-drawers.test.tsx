import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster } from "sonner"
import { describe, expect, it, vi } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import type {
  SetupEntityKind,
  SetupProfessional,
  SetupService,
  SetupUnit,
} from "@/modules/barbershop-setup/contracts"
import { SetupEntityDrawer } from "@/modules/barbershop-setup/entity-drawer"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"
import { FormSubmissionError } from "@/modules/shared/forms/form-submission-error"

async function open(
  kind: SetupEntityKind,
  mode: "edit" | "view" | "create" = "edit",
  onSave = vi.fn().mockResolvedValue(undefined),
) {
  const repository = new BarbershopSetupMemoryRepository()
  const lists = await Promise.all(
    (["unit", "professional", "service"] as const).map((kind) =>
      repository.list({
        kind,
        scenarioId: "multi-unit",
        page: 1,
        pageSize: 50,
        search: "",
        sort: { field: "name", direction: "asc" },
        status: "active",
      }),
    ),
  )
  const units = lists[0].items as SetupUnit[],
    professionals = lists[1].items as SetupProfessional[],
    services = lists[2].items as SetupService[]
  const entity = [...units, ...professionals, ...services].find((item) => item.kind === kind)
  if (!entity) throw new Error("Missing catalog fixture")
  const onClose = vi.fn()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <BarbershopSetupRepositoryProvider repository={repository}>
        <SetupEntityDrawer
          state={mode === "create" ? { kind: "create", entityKind: kind } : { kind: mode, entity }}
          units={units}
          professionals={professionals}
          services={services}
          onSave={onSave}
          onClose={onClose}
          onCloseComplete={vi.fn()}
          isSaving={false}
        />
        <Toaster />
      </BarbershopSetupRepositoryProvider>
    </QueryClientProvider>,
  )
  await screen.findByRole("dialog")
  return { entity, onSave, onClose }
}
describe("catalog drawers feeding canonical scheduling references", { timeout: 20000 }, () => {
  it.each([
    "unit",
    "professional",
    "service",
  ] as const)("renders the %s read model and closes without a mutation", async (kind) => {
    const { entity, onClose, onSave } = await open(kind, "view")
    expect(screen.getByText(entity.name)).toBeVisible()
    await userEvent.click(screen.getAllByRole("button", { name: "Fechar" })[0])
    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })
  it.each([
    "unit",
    "professional",
    "service",
  ] as const)("submits the existing %s with canonical relations and monetary values", async (kind) => {
    const { entity, onSave } = await open(kind)
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
    expect(onSave.mock.calls[0][0]).toBe(kind)
    const input = onSave.mock.calls[0][1]
    if (entity.kind === "unit")
      expect(input.businessHours.periods).toHaveLength(entity.businessHours.periods?.length ?? 1)
    if (entity.kind === "service") expect(input.priceCents).toBe(entity.priceCents)
    if (entity.kind === "professional")
      expect(input.commissionBasisPoints).toBe(entity.commissionBasisPoints)
  })
  it.each([
    "unit",
    "professional",
    "service",
  ] as const)("keeps invalid new %s drafts open and exposes accessible field errors", async (kind) => {
    const { onSave } = await open(kind, "create")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(onSave).not.toHaveBeenCalled()
    expect(document.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThan(0)
    expect(screen.getByRole("dialog")).toBeVisible()
  })
  it("preserves a unit draft across a transient save failure and retries", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("Falha temporária de conexão."))
      .mockResolvedValue(undefined)
    await open("unit", "edit", onSave)
    fireEvent.change(screen.getByRole("textbox", { name: "Nome" }), {
      target: { value: "Unidade revisada" },
    })
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(await screen.findByText("Falha temporária de conexão.")).toBeVisible()
    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveValue("Unidade revisada")
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(onSave.mock.calls[1][1].name).toBe("Unidade revisada")
  })
  it("focuses a server-rejected unique code while preserving all other fields", async () => {
    await open(
      "unit",
      "edit",
      vi
        .fn()
        .mockRejectedValue(
          new FormSubmissionError("duplicate_code", "Código já cadastrado.", "code"),
        ),
    )
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(await screen.findByText("Código já cadastrado.")).toBeVisible()
    expect(screen.getByLabelText("Código")).toHaveFocus()
    expect(screen.getByRole("dialog")).toBeVisible()
  })
  it("offers explicit reload after a catalog version conflict", async () => {
    await open(
      "service",
      "edit",
      vi
        .fn()
        .mockRejectedValue(
          new FormSubmissionError("version_conflict", "Outra pessoa alterou este serviço."),
        ),
    )
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(await screen.findByRole("button", { name: "Recarregar dados" })).toBeVisible()
    expect(screen.getByRole("dialog")).toBeVisible()
  })
})
