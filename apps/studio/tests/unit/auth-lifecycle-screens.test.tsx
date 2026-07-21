import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "@/modules/shared/theme/theme-provider"
import { routeTree } from "@/routeTree.gen"

const requestPasswordReset = vi.fn()
const resetPassword = vi.fn()

vi.mock("@/modules/auth/services/auth-client", () => ({
  requestPasswordReset: (email: string) => requestPasswordReset(email),
  resetPassword: (values: unknown) => resetPassword(values),
}))

function renderPublicRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
}

describe("password recovery routes", () => {
  beforeEach(() => {
    requestPasswordReset.mockReset()
    requestPasswordReset.mockResolvedValue({})
    resetPassword.mockReset()
    resetPassword.mockResolvedValue({})
  })

  it("validates the forgot-password form and presents an enumeration-safe result", async () => {
    const user = userEvent.setup()
    renderPublicRoute("/forgot-password")

    const heading = await screen.findByRole("heading", { name: "Redefinir senha" })
    await waitFor(() => expect(heading).toHaveFocus())

    await user.click(screen.getByRole("button", { name: "Enviar instruções" }))
    expect(await screen.findByText("Informe o e-mail.")).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toHaveFocus()

    await user.type(screen.getByLabelText("E-mail"), "test-user@example.invalid")
    await user.click(screen.getByRole("button", { name: "Enviar instruções" }))

    expect(requestPasswordReset).toHaveBeenCalledWith("test-user@example.invalid")
    expect(
      await screen.findByText(/Se houver uma conta elegível para esse endereço/),
    ).toBeInTheDocument()
  })

  it("handles missing and rejected reset tokens without rendering their values", async () => {
    const { unmount } = renderPublicRoute("/reset-password")

    expect(
      await screen.findByText(/Este link é inválido, expirou ou já foi usado/),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument()
    unmount()

    resetPassword.mockResolvedValueOnce({ error: { code: "INVALID_TOKEN" } })
    const opaqueToken = "opaque-test-token"
    renderPublicRoute(`/reset-password?token=${opaqueToken}`)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText("Nova senha"), "new-password-123")
    await user.type(screen.getByLabelText("Confirmar nova senha"), "new-password-123")
    await user.click(screen.getByRole("button", { name: "Redefinir senha" }))

    expect(resetPassword).toHaveBeenCalledWith({
      newPassword: "new-password-123",
      token: opaqueToken,
    })
    expect(
      await screen.findByText(/Este link é inválido, expirou ou já foi usado/),
    ).toBeInTheDocument()
    expect(screen.queryByText(opaqueToken)).not.toBeInTheDocument()
  })

  it("prevents duplicate reset submissions and guides a successful reset back to login", async () => {
    let resolveReset: (value: object) => void = () => undefined
    resetPassword.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReset = resolve
      }),
    )
    const user = userEvent.setup()
    renderPublicRoute("/reset-password?token=opaque-test-token")

    await user.type(await screen.findByLabelText("Nova senha"), "new-password-123")
    await user.type(screen.getByLabelText("Confirmar nova senha"), "new-password-123")
    const submit = screen.getByRole("button", { name: "Redefinir senha" })
    await user.dblClick(submit)

    expect(resetPassword).toHaveBeenCalledTimes(1)
    resolveReset({})

    expect(
      await screen.findByText("Sua senha foi redefinida. As sessões anteriores foram encerradas."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voltar para entrar" })).toHaveAttribute(
      "href",
      "/login",
    )
  })
})
