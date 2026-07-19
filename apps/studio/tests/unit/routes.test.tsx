import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { type AuthState, AuthStateProvider } from "@/modules/auth/services/auth-provider"
import { ThemeProvider } from "@/modules/shared/theme/theme-provider"
import { routeTree } from "@/routeTree.gen"

const signOut = vi.fn()

vi.mock("@/modules/auth/services/auth-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/services/auth-client")>()
  return { ...actual, signOut: () => signOut() }
})

function renderRoute(path: string, authState: AuthState) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  render(
    <ThemeProvider>
      <AuthStateProvider value={authState}>
        <RouterProvider router={router} />
      </AuthStateProvider>
    </ThemeProvider>,
  )

  return router
}

const authenticatedState = (): AuthState => ({
  error: null,
  isPending: false,
  refetch: vi.fn(),
  session: {
    user: {
      email: "maria@example.com",
      name: "Maria Souza",
    },
  },
})

describe("routes", () => {
  it("redirects unauthenticated private routes to login", async () => {
    renderRoute("/profile", {
      error: null,
      isPending: false,
      refetch: vi.fn(),
      session: null,
    })

    expect(
      await screen.findByRole("heading", { name: "Entrar no TRIAD Studio" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Meu perfil" })).not.toBeInTheDocument()
  })

  it("keeps the neutral development workspace preview available without a session", async () => {
    renderRoute("/workspace-preview", {
      error: null,
      isPending: false,
      refetch: vi.fn(),
      session: null,
    })

    expect(await screen.findByText("Pré-visualização de desenvolvimento")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
    expect(
      screen
        .getAllByRole("link", { name: "Dashboard" })
        .find((link) => link.hasAttribute("aria-current")),
    ).toHaveAttribute("href", "/overview")
    expect(
      screen.queryByRole("heading", { name: "Entrar no TRIAD Studio" }),
    ).not.toBeInTheDocument()
  })

  it("redirects authenticated root and login visits to overview", async () => {
    const rootRouter = renderRoute("/", authenticatedState())

    await waitFor(() => expect(rootRouter.state.location.pathname).toBe("/overview"))
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument()

    cleanup()

    const loginRouter = renderRoute("/login", authenticatedState())
    await waitFor(() => expect(loginRouter.state.location.pathname).toBe("/overview"))
  })

  it("keeps profile private and reachable inside the neutral shell", async () => {
    const user = userEvent.setup()
    renderRoute("/profile", authenticatedState())

    expect(await screen.findByText("Nome")).toBeInTheDocument()
    const navigation = screen.getByRole("navigation", { name: "Navegação principal" })
    expect(within(navigation).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/overview",
    )
    expect(within(navigation).queryByRole("link", { name: "Usuários" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Abrir menu de Maria Souza" }))
    expect(await screen.findByRole("menuitem", { name: "Meu perfil" })).toHaveAttribute(
      "href",
      "/profile",
    )
  })
})
