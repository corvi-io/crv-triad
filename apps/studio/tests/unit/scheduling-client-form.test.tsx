import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster } from "sonner"
import { describe, expect, it, vi } from "vitest"
import { ClientMemoryRepository } from "@/dev/clients/memory-repository"
import { ClientForm } from "@/modules/clients/client-form"
import { ClientRepositoryProvider } from "@/modules/clients/repository-context"
import { FormSubmissionError } from "@/modules/shared/forms/form-submission-error"

function setup(
  onSubmit = vi.fn().mockResolvedValue(undefined),
  repository = new ClientMemoryRepository(),
) {
  const onCancel = vi.fn()
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ClientRepositoryProvider repository={repository}>
        <ClientForm
          formId="quick-client"
          isSubmitting={false}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
        <Toaster />
      </ClientRepositoryProvider>
    </QueryClientProvider>,
  )
  return { onSubmit, onCancel }
}
async function fill() {
  await act(async () => {
    fireEvent.change(screen.getByRole("textbox", { name: /^Nome/ }), {
      target: { value: "Cliente Cadastro" },
    })
    fireEvent.change(screen.getByRole("textbox", { name: /^E-mail/ }), {
      target: { value: "cliente@example.invalid" },
    })
    await Promise.resolve()
  })
}
describe("canonical quick-client form used from appointments", { timeout: 20000 }, () => {
  it("validates contact requirements, submits canonical values, and cancels independently", async () => {
    const { onSubmit, onCancel } = setup()
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    expect(await screen.findByText("Informe o nome do cliente.")).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()
    await fill()
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "Cliente Cadastro",
      email: "cliente@example.invalid",
    })
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
  it.each([
    "version_conflict",
    "duplicate_name",
    "network",
  ])("preserves the contact draft on %s", async (code) => {
    setup(
      vi
        .fn()
        .mockRejectedValue(
          code === "network"
            ? new Error("Falha de conexão.")
            : new FormSubmissionError(
                code,
                "Revise este cadastro.",
                code === "duplicate_name" ? "name" : undefined,
              ),
        ),
    )
    await fill()
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    if (code === "version_conflict")
      expect(await screen.findByRole("button", { name: "Recarregar dados" })).toBeVisible()
    else
      expect(
        await screen.findByText(code === "network" ? "Falha de conexão." : "Revise este cadastro."),
      ).toBeVisible()
    expect(screen.getByRole("textbox", { name: /^Nome/ })).toHaveValue("Cliente Cadastro")
    if (code === "duplicate_name")
      expect(screen.getByRole("textbox", { name: /^Nome/ })).toHaveFocus()
  })
  it("shows duplicate warnings as advisory and tolerates unavailable preference catalogs", async () => {
    const repository = new ClientMemoryRepository()
    vi.spyOn(repository, "findDuplicates").mockResolvedValue([
      {
        candidateId: "duplicate",
        candidateName: "Cliente existente",
        field: "email",
        label: "Mesmo e-mail",
      },
    ])
    vi.spyOn(repository, "listCatalogOptions").mockRejectedValue(new Error("Unavailable"))
    const { onSubmit } = setup(undefined, repository)
    await fill()
    expect(await screen.findByText("Mesmo e-mail: Cliente existente")).toBeVisible()
    expect(
      (await screen.findAllByText("Não foi possível carregar as opções.")).length,
    ).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  })
  it("allows selecting and removing preferences without automatically selecting anything", async () => {
    const repository = new ClientMemoryRepository()
    vi.spyOn(repository, "findDuplicates").mockRejectedValue(new Error("Unavailable"))
    vi.spyOn(repository, "listCatalogOptions").mockImplementation(async (kind) => [
      { id: `${kind}-active`, name: `Preferência ${kind}`, status: "active" },
      { id: `${kind}-archived`, name: `Antiga ${kind}`, status: "archived" },
    ])
    const { onSubmit } = setup(undefined, repository)
    await fill()
    const choice = await screen.findByRole("checkbox", { name: "Preferência units" })
    expect(choice).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Antiga units (arquivado)" })).toBeDisabled()
    await userEvent.click(choice)
    expect(choice).toBeChecked()
    await userEvent.click(screen.getByRole("checkbox", { name: "Preferência units" }))
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Preferência units" })).not.toBeChecked(),
    )
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0].unitPreferenceIds).toEqual([])
  })
})
