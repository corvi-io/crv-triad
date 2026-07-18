import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LoginScreen } from "@/modules/auth/components/login-screen"
import { AuthStateProvider } from "@/modules/auth/services/auth-provider"
import { ThemeProvider } from "@/modules/shared/theme/theme-provider"

const requestPasswordReset = vi.fn()
const signInWithEmail = vi.fn()
const signUpWithEmail = vi.fn()

vi.mock("@/modules/auth/services/auth-client", () => ({
  requestPasswordReset: (email: string) => requestPasswordReset(email),
  signInWithEmail: (values: unknown) => signInWithEmail(values),
  signUpWithEmail: (values: unknown) => signUpWithEmail(values),
}))

function renderLogin() {
  return render(
    <ThemeProvider>
      <AuthStateProvider
        value={{
          error: null,
          isPending: false,
          refetch: vi.fn(),
          session: null,
        }}
      >
        <LoginScreen />
      </AuthStateProvider>
    </ThemeProvider>,
  )
}

describe("login screen", () => {
  beforeEach(() => {
    requestPasswordReset.mockReset()
    requestPasswordReset.mockResolvedValue({})
    signInWithEmail.mockReset()
    signInWithEmail.mockResolvedValue({ error: { message: "Invalid credentials" } })
    signUpWithEmail.mockReset()
    signUpWithEmail.mockResolvedValue({ error: { message: "Invite required" } })
  })

  it("shows email/password login and first-access action", async () => {
    const user = userEvent.setup()
    renderLogin()

    expect(screen.getByRole("heading", { name: "Entrar no CRV Triad" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Imagem placeholder" })).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument()
    expect(screen.getByLabelText("Senha")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Criar acesso com convite" })).toBeInTheDocument()

    await user.type(screen.getByLabelText("E-mail"), "maria@example.com")
    await user.type(screen.getByLabelText("Senha"), "password-123")
    await user.click(screen.getByRole("button", { name: "Entrar" }))

    expect(signInWithEmail).toHaveBeenCalledWith({
      email: "maria@example.com",
      password: "password-123",
    })
    expect(
      await screen.findByText("Não foi possível entrar com esse e-mail e senha."),
    ).toBeInTheDocument()
  })

  it("validates fields before submitting", async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole("button", { name: "Entrar" }))

    expect(await screen.findByText("Informe o e-mail.")).toBeInTheDocument()
    expect(screen.getByText("Informe a senha.")).toBeInTheDocument()
    expect(signInWithEmail).not.toHaveBeenCalled()
  })

  it("requests password reset for a typed email", async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText("E-mail"), "maria@example.com")
    await user.click(screen.getByRole("button", { name: "Esqueceu a senha?" }))

    expect(requestPasswordReset).toHaveBeenCalledWith("maria@example.com")
    expect(
      await screen.findByText(
        "Se o e-mail estiver cadastrado, enviaremos as instruções de redefinição.",
      ),
    ).toBeInTheDocument()
  })
})
