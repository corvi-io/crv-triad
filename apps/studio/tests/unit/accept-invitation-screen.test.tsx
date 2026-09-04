import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "@/modules/shared/theme/theme-provider"
import { routeTree } from "@/routeTree.gen"

const acceptInvitation = vi.fn()
const resolveInvitation = vi.fn()

vi.mock("@/modules/auth/services/auth-client", () => ({
  acceptInvitation: (input: unknown) => acceptInvitation(input),
  resolveInvitation: (token: string, signal?: AbortSignal) => resolveInvitation(token, signal),
}))

function renderAcceptance(path = "/accept-invitation?token=synthetic-invitation-proof") {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
  return router
}

describe("invitation acceptance", () => {
  beforeEach(() => {
    acceptInvitation.mockReset()
    acceptInvitation.mockResolvedValue({ status: true })
    resolveInvitation.mockReset()
    resolveInvitation.mockResolvedValue({ state: "valid", role: "member" })
  })

  it("validates, removes the query proof, and exposes accessible password guidance", async () => {
    renderAcceptance()

    expect(await screen.findByText(/Convite válido para o perfil de membro/)).toBeInTheDocument()
    await waitFor(() => expect(window.location.search).toBe(""))
    const password = screen.getByLabelText("Nova senha")
    expect(password).toHaveAttribute("autocomplete", "new-password")
    expect(password).toHaveAttribute("aria-describedby", expect.stringContaining("guidance"))
    expect(screen.getByRole("list", { name: "Requisitos da nova senha" })).toHaveTextContent(
      "Ter pelo menos 8 caracteres",
    )
    expect(screen.getByRole("list", { name: "Requisitos da nova senha" })).toHaveTextContent(
      "Ter uma letra maiúscula",
    )
    expect(screen.getByRole("list", { name: "Requisitos da nova senha" })).toHaveTextContent(
      "Ter uma letra minúscula",
    )
    expect(screen.getByRole("list", { name: "Requisitos da nova senha" })).toHaveTextContent(
      "Ter um número",
    )
    expect(screen.getByRole("list", { name: "Requisitos da nova senha" })).toHaveTextContent(
      "Ter um caractere especial",
    )
  })

  it("prevents duplicate submission and redirects to the authenticated overview", async () => {
    let finish: (value: object) => void = () => undefined
    acceptInvitation.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const user = userEvent.setup()
    const router = renderAcceptance()

    await user.click(await screen.findByLabelText("Nova senha"))
    await user.paste("Senha válida 1!")
    await user.click(screen.getByLabelText("Confirmar nova senha"))
    await user.paste("Senha válida 1!")
    const submit = screen.getByRole("button", { name: "Criar senha" })
    await user.dblClick(submit)

    expect(acceptInvitation).toHaveBeenCalledTimes(1)
    finish({ status: true })
    await waitFor(() => expect(router.state.location.pathname).toBe("/overview"))
  })

  it.each([
    ["accepted", "já foi usado"],
    ["expired", "expirou"],
    ["invalid", "é inválido"],
    ["revoked", "foi revogado"],
    ["superseded", "foi substituído"],
  ])("renders the %s terminal state", async (state, copy) => {
    resolveInvitation.mockResolvedValueOnce({ state })
    renderAcceptance()

    expect(await screen.findByRole("alert")).toHaveTextContent(copy)
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument()
  })

  it("maps server password-policy rejection to the password field", async () => {
    acceptInvitation.mockResolvedValueOnce({ error: "password_policy" })
    const user = userEvent.setup()
    renderAcceptance()
    const password = await screen.findByLabelText("Nova senha")
    await user.type(password, "Senha válida 1!")
    await user.type(screen.getByLabelText("Confirmar nova senha"), "Senha válida 1!")
    await user.click(screen.getByRole("button", { name: "Criar senha" }))

    expect(
      await screen.findByText("Escolha uma senha menos comum ou previsível."),
    ).toBeInTheDocument()
    expect(password).toHaveFocus()
  })

  it("recovers from a validation network failure without exposing the proof", async () => {
    resolveInvitation
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ state: "valid", role: "member" })
    const user = userEvent.setup()
    renderAcceptance()

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível validar")
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }))

    expect(await screen.findByLabelText("Nova senha")).toBeInTheDocument()
    expect(resolveInvitation).toHaveBeenCalledTimes(2)
    expect(document.body).not.toHaveTextContent("synthetic-invitation-proof")
  })
})
