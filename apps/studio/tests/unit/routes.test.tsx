import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type ReactNode, useEffect } from "react"
import { describe, expect, it, vi } from "vitest"

import { type AuthState, AuthStateProvider } from "@/modules/auth/services/auth-provider"
import { clientSearchDefaults } from "@/modules/clients/search"
import { ThemeProvider } from "@/modules/shared/theme/theme-provider"
import { routeTree } from "@/routeTree.gen"

const signOut = vi.fn()

vi.mock("@/modules/auth/services/auth-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/services/auth-client")>()
  return { ...actual, signOut: () => signOut() }
})

function renderRoute(path: string, authState: AuthState) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  render(
    <IsolatedQueryClientProvider queryClient={queryClient}>
      <ThemeProvider>
        <AuthStateProvider value={authState}>
          <RouterProvider router={router} />
        </AuthStateProvider>
      </ThemeProvider>
    </IsolatedQueryClientProvider>,
  )

  return { queryClient, router }
}

function IsolatedQueryClientProvider({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient: QueryClient
}) {
  useEffect(() => () => queryClient.clear(), [queryClient])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
  it("uses and clears an isolated query client for every route render", () => {
    const first = renderRoute("/workspace-preview", authenticatedState())
    first.queryClient.setQueryData(["route-test-isolation"], "first render")
    expect(first.queryClient.getQueryData(["route-test-isolation"])).toBe("first render")

    cleanup()
    expect(first.queryClient.getQueryCache().getAll()).toHaveLength(0)

    const second = renderRoute("/workspace-preview", authenticatedState())
    expect(second.queryClient).not.toBe(first.queryClient)
    expect(second.queryClient.getQueryData(["route-test-isolation"])).toBeUndefined()
  })

  it("redirects unauthenticated private routes to login", async () => {
    renderRoute("/profile", {
      error: null,
      isPending: false,
      refetch: vi.fn(),
      session: null,
    })

    expect(await screen.findByRole("heading", { name: "Bem-vindo de volta" })).toBeInTheDocument()
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
    expect(screen.queryByRole("heading", { name: "Bem-vindo de volta" })).not.toBeInTheDocument()
  })

  it("redirects authenticated root and login visits to overview", async () => {
    const { router: rootRouter } = renderRoute("/", authenticatedState())

    await waitFor(() => expect(rootRouter.state.location.pathname).toBe("/overview"))
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument()

    cleanup()

    const { router: loginRouter } = renderRoute("/login", authenticatedState())
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

  it("renders barbershop setup as a private module inside the workspace shell", async () => {
    const user = userEvent.setup()
    renderRoute("/barbershop-setup?section=services", authenticatedState())

    expect(
      await screen.findByRole("heading", { name: "Configuração da barbearia" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("navigation", { name: "Navegação secundária" }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Abrir menu de Maria Souza" }))
    expect(
      await screen.findByRole("menuitem", { name: "Configuração da barbearia" }),
    ).toHaveAttribute("href", expect.stringContaining("/barbershop-setup"))
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent(
      "Configuração da barbearia",
    )
  })

  it("rejects a cash date that rolls over to another calendar day", async () => {
    const { router } = renderRoute("/cash?date=2026-02-31", authenticatedState())

    expect(await screen.findByRole("heading", { name: "Caixa" })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search.date).not.toBe("2026-02-31"))
  })

  it("keeps reports private and normalizes invalid bounded URL filters", async () => {
    const { router } = renderRoute(
      "/reports?from=2025-01-01&to=2026-12-31&professional=../private&paymentMethod=crypto",
      authenticatedState(),
    )

    expect(await screen.findByRole("heading", { name: "Relatórios" })).toBeInTheDocument()
    await waitFor(() => {
      expect(router.state.location.search.professional).toBeUndefined()
      expect(router.state.location.search.paymentMethod).toBeUndefined()
      expect(router.state.location.search.from).not.toBe("2025-01-01")
      expect(router.state.location.search.to).not.toBe("2026-12-31")
    })
  })

  it("omits default client search state and preserves shareable drawer intent", async () => {
    const { router } = renderRoute("/workspace-preview", authenticatedState())

    await router.navigate({ search: clientSearchDefaults, to: "/clients" })
    expect(router.state.location.href).toBe("/clients")

    await router.navigate({
      search: { ...clientSearchDefaults, client: "client_01" },
      to: "/clients",
    })
    expect(router.state.location.href).toBe("/clients?client=client_01")

    await router.navigate({
      search: { ...clientSearchDefaults, client: "client_01", mode: "edit" },
      to: "/clients",
    })
    expect(router.state.location.href).toBe("/clients?client=client_01&mode=edit")
  })
})
