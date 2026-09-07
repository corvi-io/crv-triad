import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Toaster } from "sonner"
import { describe, expect, it, vi } from "vitest"
import { BarbershopSetupMemoryRepository } from "@/dev/barbershop-setup/memory-repository"
import {
  BusinessProfileSection,
  PaymentsSection,
} from "@/modules/barbershop-setup/completion-sections"
import { BarbershopSetupRepositoryProvider } from "@/modules/barbershop-setup/repository-context"

function setup(
  surface: "profile" | "payments",
  repository = new BarbershopSetupMemoryRepository(),
  scenarioId = "single-unit",
) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <BarbershopSetupRepositoryProvider repository={repository}>
        {surface === "profile" ? (
          <BusinessProfileSection scenarioId={scenarioId} />
        ) : (
          <PaymentsSection scenarioId={scenarioId} />
        )}
        <Toaster />
      </BarbershopSetupRepositoryProvider>
    </QueryClientProvider>,
  )
  return repository
}
describe("setup readiness remains coherent alongside scheduling", { timeout: 20000 }, () => {
  it.each([
    "profile",
    "payments",
  ] as const)("recovers the %s source without synthesizing defaults", async (surface) => {
    const repository = new BarbershopSetupMemoryRepository()
    const read = vi.spyOn(repository, "getCompletion").mockRejectedValueOnce(new Error("Offline"))
    setup(surface, repository)
    await userEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }))
    expect(
      await screen.findByRole("heading", {
        name: surface === "profile" ? "Dados da barbearia" : "Formas de pagamento",
      }),
    ).toBeVisible()
    expect(read).toHaveBeenCalledTimes(2)
  })
  it("validates profile fields, preserves server errors, and retries a canonical update", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const update = vi
      .spyOn(repository, "updateProfile")
      .mockRejectedValueOnce(new Error("Falha temporária."))
    setup("profile", repository)
    const name = await screen.findByLabelText(/Nome de exibição/)
    fireEvent.change(name, { target: { value: "" } })
    fireEvent.submit(name.closest("form") as HTMLFormElement)
    expect(
      await screen.findByText("Preencha todos os campos obrigatórios com dados válidos."),
    ).toBeVisible()
    expect(update).not.toHaveBeenCalled()
    expect(name).toHaveFocus()
    fireEvent.change(name, { target: { value: "Barbearia revisada" } })
    fireEvent.submit(name.closest("form") as HTMLFormElement)
    expect(await screen.findByText("Falha temporária.")).toBeVisible()
    fireEvent.submit(name.closest("form") as HTMLFormElement)
    expect(await screen.findByText("Dados da barbearia atualizados.")).toBeVisible()
    expect((await repository.getCompletion("single-unit")).profile.displayName).toBe(
      "Barbearia revisada",
    )
  })
  it("preserves payment toggles across failure and saves on explicit retry", async () => {
    const repository = new BarbershopSetupMemoryRepository()
    const update = vi
      .spyOn(repository, "updatePaymentMethods")
      .mockRejectedValueOnce(new Error("Falha temporária."))
    setup("payments", repository)
    const pix = await screen.findByRole("switch", { name: "Aceitar Pix" })
    await userEvent.click(pix)
    expect(pix).not.toBeChecked()
    await userEvent.click(screen.getByRole("button", { name: "Salvar formas" }))
    expect(await screen.findByText("Falha temporária.")).toBeVisible()
    expect(pix).not.toBeChecked()
    await userEvent.click(screen.getByRole("button", { name: "Salvar formas" }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(await screen.findByText("Formas de pagamento atualizadas.")).toBeVisible()
  })
  it("saves a professional override then explicitly restores the service default", async () => {
    const repository = setup("payments")
    await screen.findByRole("heading", { name: "Exceção por profissional" })
    fireEvent.change(screen.getByLabelText("Preço (R$), opcional"), { target: { value: "47.50" } })
    fireEvent.change(screen.getByLabelText("Duração (min), opcional"), { target: { value: "45" } })
    await userEvent.click(screen.getByRole("button", { name: "Salvar exceção" }))
    expect(await screen.findByText("Exceção profissional atualizada.")).toBeVisible()
    expect((await repository.getCompletion("single-unit")).serviceOverrides).toContainEqual(
      expect.objectContaining({ priceCents: 4750, durationMinutes: 45 }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }))
    expect(await screen.findByText("Exceção removida; o padrão foi restaurado.")).toBeVisible()
    expect(screen.getByLabelText("Preço (R$), opcional")).toHaveValue(null)
  })
})
