import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthStateProvider } from "@/modules/auth/services/auth-provider"
import { ThemeProvider } from "@/modules/shared/theme/theme-provider"
import { routeTree } from "@/routeTree.gen"

const acceptInvitation = vi.fn()
const acceptExistingInvitation = vi.fn()
const resolveInvitation = vi.fn()
const resolveInvitationLogo = vi.fn()

vi.mock("@/modules/auth/services/auth-client", () => ({
  acceptExistingInvitation: (token: string) => acceptExistingInvitation(token),
  acceptInvitation: (input: unknown) => acceptInvitation(input),
  resolveInvitation: (token: string, signal?: AbortSignal) => resolveInvitation(token, signal),
  resolveInvitationLogo: (token: string, signal?: AbortSignal) =>
    resolveInvitationLogo(token, signal),
}))

function renderAcceptance(
  path = "/accept-invitation?token=synthetic-invitation-proof",
  authenticated = true,
) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthStateProvider
          value={{
            error: null,
            isPending: false,
            refetch: vi.fn(),
            session: authenticated
              ? { user: { email: "member@example.com", name: "Pessoa Convidada" } }
              : null,
          }}
        >
          <RouterProvider router={router} />
        </AuthStateProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return router
}

describe("invitation acceptance", () => {
  beforeEach(() => {
    acceptInvitation.mockReset()
    acceptInvitation.mockResolvedValue({ status: true })
    acceptExistingInvitation.mockReset()
    acceptExistingInvitation.mockResolvedValue({ status: true })
    resolveInvitation.mockReset()
    resolveInvitation.mockResolvedValue({ state: "valid", role: "member" })
    resolveInvitationLogo.mockReset()
    resolveInvitationLogo.mockResolvedValue(null)
  })

  it("validates, removes the query proof, and exposes accessible password guidance", async () => {
    renderAcceptance()

    expect(await screen.findByText("Crie seu acesso para confirmar o convite.")).toBeInTheDocument()
    expect(screen.getByLabelText("Seu nome")).toHaveAttribute("autocomplete", "name")
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

    await user.type(await screen.findByLabelText("Seu nome"), "Pessoa Convidada")
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
    await user.type(await screen.findByLabelText("Seu nome"), "Pessoa Convidada")
    const password = await screen.findByLabelText("Nova senha")
    await user.type(password, "Senha válida 1!")
    await user.type(screen.getByLabelText("Confirmar nova senha"), "Senha válida 1!")
    await user.click(screen.getByRole("button", { name: "Criar senha" }))

    expect(
      await screen.findByText("Escolha uma senha menos comum ou previsível."),
    ).toBeInTheDocument()
    expect(password).toHaveFocus()
  })

  it("accepts an existing authenticated identity without replacing its profile", async () => {
    resolveInvitation.mockResolvedValueOnce({ state: "valid", role: "member", hasAccount: true })
    const user = userEvent.setup()
    const router = renderAcceptance()

    expect(
      await screen.findByText("Entre com seu acesso para confirmar o convite."),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Entrar e aceitar convite" }))
    expect(acceptExistingInvitation).toHaveBeenCalledWith("synthetic-invitation-proof")
    await waitFor(() => expect(router.state.location.pathname).toBe("/overview"))
    expect(screen.queryByLabelText("Seu nome")).not.toBeInTheDocument()
  })

  it("shows trusted business context and lands a professional on the Agenda", async () => {
    resolveInvitation.mockResolvedValueOnce({
      context: {
        inviterName: "Ana",
        organizationName: "Barbearia Aurora",
        professionalRole: "Barbeiro sênior",
        unitNames: ["Boa Viagem"],
      },
      hasAccount: true,
      role: "member",
      state: "valid",
    })
    const user = userEvent.setup()
    const router = renderAcceptance()

    expect(await screen.findByRole("heading", { name: "Barbearia Aurora" })).toBeInTheDocument()
    expect(screen.getByText("Barbeiro sênior")).toBeInTheDocument()
    expect(screen.getByText(/Unidade: Boa Viagem/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Entrar e aceitar convite" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/agenda"))
  })

  it("loads safe logo bytes and renders multiple ordered units", async () => {
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:invitation-logo"),
        revokeObjectURL: vi.fn(),
      }),
    )
    resolveInvitation.mockResolvedValueOnce({
      context: {
        logoAvailable: true,
        organizationName: "Barbearia Aurora",
        unitNames: ["Boa Viagem", "Centro"],
      },
      hasAccount: true,
      role: "member",
      state: "valid",
    })
    resolveInvitationLogo.mockResolvedValueOnce(new Blob(["logo"], { type: "image/png" }))
    renderAcceptance()

    expect(await screen.findByText("Unidades: Boa Viagem, Centro")).toBeVisible()
    await waitFor(() =>
      expect(document.querySelector('img[src="blob:invitation-logo"]')).not.toBeNull(),
    )
  })

  it.each([
    ["invalid_invitation", "é inválido"],
    ["unavailable", "Não foi possível criar sua senha agora"],
  ] as const)("handles safe new-account failure %s", async (error, copy) => {
    acceptInvitation.mockResolvedValueOnce({ error })
    const user = userEvent.setup()
    renderAcceptance()
    await user.type(await screen.findByLabelText("Seu nome"), "Pessoa Convidada")
    await user.type(screen.getByLabelText("Nova senha"), "Senha válida 1!")
    await user.type(screen.getByLabelText("Confirmar nova senha"), "Senha válida 1!")
    await user.click(screen.getByRole("button", { name: "Criar senha" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(copy)
  })

  it("recovers safely when new-account acceptance rejects", async () => {
    acceptInvitation.mockRejectedValueOnce(new Error("offline"))
    const user = userEvent.setup()
    renderAcceptance()
    await user.type(await screen.findByLabelText("Seu nome"), "Pessoa Convidada")
    await user.type(screen.getByLabelText("Nova senha"), "Senha válida 1!")
    await user.type(screen.getByLabelText("Confirmar nova senha"), "Senha válida 1!")
    await user.click(screen.getByRole("button", { name: "Criar senha" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível criar sua senha agora",
    )
  })

  it("redirects an unauthenticated existing identity to login with the opaque proof", async () => {
    resolveInvitation.mockResolvedValueOnce({ state: "valid", role: "member", hasAccount: true })
    acceptExistingInvitation.mockResolvedValueOnce({ error: "unauthenticated" })
    const user = userEvent.setup()
    const router = renderAcceptance(undefined, false)

    await user.click(await screen.findByRole("button", { name: "Entrar e aceitar convite" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({
      invitationToken: "synthetic-invitation-proof",
    })
  })

  it("recovers safely when existing-account acceptance rejects", async () => {
    resolveInvitation.mockResolvedValueOnce({ state: "valid", role: "member", hasAccount: true })
    acceptExistingInvitation.mockRejectedValueOnce(new Error("offline"))
    const user = userEvent.setup()
    renderAcceptance()

    await user.click(await screen.findByRole("button", { name: "Entrar e aceitar convite" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível aceitar o convite agora",
    )
  })

  it.each([
    [
      "account_mismatch",
      "Este convite pertence a outra conta. Saia e entre com o e-mail que recebeu o convite.",
    ],
    [
      "invitation_changed",
      "Este convite foi alterado ou já foi utilizado. Valide o link novamente.",
    ],
    [
      "completion_failed",
      "O acesso foi iniciado, mas o vínculo não foi concluído. Tente novamente.",
    ],
  ] as const)("shows the safe %s acceptance failure", async (error, copy) => {
    resolveInvitation.mockResolvedValueOnce({ state: "valid", role: "member", hasAccount: true })
    acceptExistingInvitation.mockResolvedValueOnce({ error })
    const user = userEvent.setup()
    renderAcceptance()

    await user.click(await screen.findByRole("button", { name: "Entrar e aceitar convite" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(copy)
    expect(document.body).not.toHaveTextContent("synthetic-invitation-proof")
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
