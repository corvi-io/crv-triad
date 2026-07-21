import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthStateProvider } from "@/modules/auth/services/auth-provider"
import { ThemeProvider } from "@/modules/shared/theme/theme-provider"
import { routeTree } from "@/routeTree.gen"

const resendVerificationEmail = vi.fn()
const signInWithEmail = vi.fn()
const signInWithGoogle = vi.fn()
const signUpWithEmail = vi.fn()

vi.mock("@/modules/auth/services/auth-client", () => ({
  resendVerificationEmail: (email: string) => resendVerificationEmail(email),
  signInWithEmail: (values: unknown) => signInWithEmail(values),
  signInWithGoogle: () => signInWithGoogle(),
  signUpWithEmail: (values: unknown) => signUpWithEmail(values),
}))

function renderLogin(path = "/login") {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  const view = render(
    <ThemeProvider>
      <AuthStateProvider
        value={{
          error: null,
          isPending: false,
          refetch: vi.fn(),
          session: null,
        }}
      >
        <RouterProvider router={router} />
      </AuthStateProvider>
    </ThemeProvider>,
  )

  return { ...view, router }
}

describe("login screen", () => {
  beforeEach(() => {
    resendVerificationEmail.mockReset()
    resendVerificationEmail.mockResolvedValue({})
    signInWithEmail.mockReset()
    signInWithEmail.mockResolvedValue({ error: { message: "Invalid credentials" } })
    signInWithGoogle.mockReset()
    signInWithGoogle.mockResolvedValue({})
    signUpWithEmail.mockReset()
    signUpWithEmail.mockResolvedValue({ error: { message: "Invite required" } })
  })

  it("shows email/password login and first-access action", async () => {
    const user = userEvent.setup()
    renderLogin()

    expect(
      await screen.findByRole("heading", { name: "Entrar no TRIAD Studio" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("region", { name: "Identidade visual do TRIAD Studio" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument()
    expect(screen.getByLabelText("Senha")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Esqueceu a senha?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    )
    expect(screen.getByRole("button", { name: "Continuar com Google" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Criar acesso com convite" })).toBeInTheDocument()

    await user.type(screen.getByLabelText("E-mail"), "test-user@example.invalid")
    await user.type(screen.getByLabelText("Senha"), "password-123")
    await user.click(await screen.findByRole("button", { name: "Entrar" }))

    expect(signInWithEmail).toHaveBeenCalledWith({
      email: "test-user@example.invalid",
      password: "password-123",
    })
    expect(
      await screen.findByText("Não foi possível entrar com esse e-mail e senha."),
    ).toBeInTheDocument()
  })

  it("validates fields before submitting", async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole("button", { name: "Entrar" }))

    expect(await screen.findByText("Informe o e-mail.")).toBeInTheDocument()
    expect(screen.getByText("Informe a senha.")).toBeInTheDocument()
    expect(signInWithEmail).not.toHaveBeenCalled()
  })

  it("initiates Google sign-in through the native client wrapper", async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole("button", { name: "Continuar com Google" }))

    expect(signInWithGoogle).toHaveBeenCalledOnce()
  })

  it("shows a verification notice after invite-gated first access and resends safely", async () => {
    const user = userEvent.setup()
    signUpWithEmail.mockResolvedValueOnce({})
    renderLogin()

    await user.type(await screen.findByLabelText("E-mail"), "test-user@example.invalid")
    await user.type(screen.getByLabelText("Senha"), "password-123")
    await user.click(screen.getByRole("button", { name: "Criar acesso com convite" }))

    expect(await screen.findByText(/Verifique sua caixa de entrada/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reenviar verificação" }))

    expect(resendVerificationEmail).toHaveBeenCalledWith("test-user@example.invalid")
    expect(await screen.findByText(/Se o endereço estiver elegível/)).toBeInTheDocument()
  })

  it("maps provider callback errors to safe copy", async () => {
    renderLogin("/login?error=access_denied")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O acesso com o Google não foi concluído. Tente novamente.",
    )
    expect(screen.queryByText("access_denied")).not.toBeInTheDocument()
  })

  it.each([
    [
      "INVALID_TOKEN",
      "O link de verificação é inválido ou já foi usado. Solicite uma nova verificação.",
    ],
    ["TOKEN_EXPIRED", "O link de verificação expirou. Solicite uma nova verificação."],
  ])("maps %s verification callbacks without contradictory success or Google copy", async (code, copy) => {
    const { router } = renderLogin(`/login?verified=true&error=${code}`)

    expect(await screen.findByRole("alert")).toHaveTextContent(copy)
    expect(screen.queryByText("E-mail confirmado. Você já pode entrar.")).not.toBeInTheDocument()
    expect(
      screen.queryByText("O acesso com o Google não foi concluído. Tente novamente."),
    ).not.toBeInTheDocument()
    await waitFor(() => expect(router.state.location.href).not.toContain("verified"))
  })

  it("keeps verified feedback visible after consuming the one-shot URL marker", async () => {
    const { router } = renderLogin("/login?verified=true")

    expect(await screen.findByText("E-mail confirmado. Você já pode entrar.")).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.href).not.toContain("verified"))
    expect(screen.getByText("E-mail confirmado. Você já pode entrar.")).toBeInTheDocument()
  })
})
