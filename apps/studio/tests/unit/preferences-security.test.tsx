import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthStateProvider } from "@/modules/auth/services/auth-provider"
import { PreferencesScreen } from "@/modules/preferences/components/preferences-screen"
import { ThemeProvider } from "@/modules/shared/theme/theme-provider"
import { routeTree } from "@/routeTree.gen"

const authMocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  linkGoogle: vi.fn(),
  listAccounts: vi.fn(),
  requestPasswordReset: vi.fn(),
  signOut: vi.fn(),
  unlinkGoogle: vi.fn(),
}))

vi.mock("@/modules/auth/services/auth-client", () => authMocks)

function renderPreferences(googleResult?: "connected" | "error") {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthStateProvider
          value={{
            error: null,
            isPending: false,
            refetch: vi.fn(),
            session: { user: { email: "test-user@example.invalid", name: "Test User" } },
          }}
        >
          <PreferencesScreen googleResult={googleResult} />
        </AuthStateProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

function renderPreferencesRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthStateProvider
          value={{
            error: null,
            isPending: false,
            refetch: vi.fn(),
            session: { user: { email: "test-user@example.invalid", name: "Test User" } },
          }}
        >
          <RouterProvider router={router} />
        </AuthStateProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )

  return router
}

describe("security and access preferences", () => {
  beforeEach(() => {
    authMocks.changePassword.mockReset()
    authMocks.changePassword.mockResolvedValue({})
    authMocks.linkGoogle.mockReset()
    authMocks.linkGoogle.mockResolvedValue({})
    authMocks.listAccounts.mockReset()
    authMocks.listAccounts.mockResolvedValue({
      data: [{ providerId: "credential" }, { providerId: "google" }],
    })
    authMocks.requestPasswordReset.mockReset()
    authMocks.requestPasswordReset.mockResolvedValue({})
    authMocks.signOut.mockReset()
    authMocks.signOut.mockResolvedValue({})
    authMocks.unlinkGoogle.mockReset()
    authMocks.unlinkGoogle.mockResolvedValue({})
  })

  it("shows connected methods and changes a credential with current-password proof", async () => {
    const user = userEvent.setup()
    renderPreferences()

    expect(await screen.findByRole("heading", { name: "Segurança e acesso" })).toBeInTheDocument()
    expect(await screen.findByRole("list", { name: "Métodos de acesso" })).toHaveTextContent(
      "E-mail e senha",
    )
    expect(screen.getByRole("button", { name: "Desconectar Google" })).toBeEnabled()

    await user.type(screen.getByLabelText("Senha atual"), "old-password-123")
    await user.type(screen.getByLabelText("Nova senha"), "new-password-123")
    await user.type(screen.getByLabelText("Confirmar nova senha"), "new-password-123")
    await user.click(screen.getByRole("button", { name: "Alterar senha" }))

    expect(authMocks.changePassword).toHaveBeenCalledWith({
      currentPassword: "old-password-123",
      newPassword: "new-password-123",
    })
    expect(await screen.findByText(/As outras sessões foram encerradas/)).toBeInTheDocument()
  })

  it("prevents a Google-only account from removing its last method and offers recovery", async () => {
    authMocks.listAccounts.mockResolvedValueOnce({ data: [{ providerId: "google" }] })
    const user = userEvent.setup()
    renderPreferences()

    const disconnect = await screen.findByRole("button", { name: "Desconectar Google" })
    expect(disconnect).toBeDisabled()
    expect(screen.getByText(/Crie uma senha antes de desconectar/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Criar senha" }))

    expect(authMocks.requestPasswordReset).toHaveBeenCalledWith("test-user@example.invalid")
    expect(await screen.findByText(/Se a conta estiver elegível/)).toBeInTheDocument()
  })

  it("offers native Google linking when the provider is not connected", async () => {
    authMocks.listAccounts.mockResolvedValueOnce({ data: [{ providerId: "credential" }] })
    const user = userEvent.setup()
    renderPreferences()

    await user.click(await screen.findByRole("button", { name: "Conectar Google" }))

    expect(authMocks.linkGoogle).toHaveBeenCalledOnce()
  })

  it("confirms a Google callback only after the linked account is listed", async () => {
    renderPreferences("connected")

    expect(await screen.findByText("Google conectado com sucesso.")).toBeInTheDocument()
  })

  it("does not claim Google was connected when the listed account state disagrees", async () => {
    authMocks.listAccounts.mockResolvedValueOnce({ data: [{ providerId: "credential" }] })
    renderPreferences("connected")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível confirmar a conexão com o Google.",
    )
    expect(screen.queryByText("Google conectado com sucesso.")).not.toBeInTheDocument()
  })

  it("keeps confirmed feedback after consuming the Google result URL marker", async () => {
    const router = renderPreferencesRoute("/preferences?google=connected")

    expect(await screen.findByText("Google conectado com sucesso.")).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.href).not.toContain("google="))
    expect(screen.getByText("Google conectado com sucesso.")).toBeInTheDocument()
  })
})
