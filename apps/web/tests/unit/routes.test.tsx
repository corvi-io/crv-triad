import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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
  return {
    ...actual,
    signOut: () => signOut(),
  }
})

function renderRoute(path: string, authState: AuthState) {
  const queryClient = new QueryClient()
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthStateProvider value={authState}>
          <RouterProvider router={router} />
        </AuthStateProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )

  return router
}

const authenticatedState = (overrides: Partial<AuthState> = {}): AuthState => ({
  error: null,
  isPending: false,
  refetch: vi.fn(),
  session: {
    user: {
      email: "maria@example.com",
      name: "Maria Souza",
    },
  },
  ...overrides,
})

const directFormPreviews = [
  ["/workspace-preview/forms/companies", "Empresas"],
  ["/workspace-preview/forms/customers", "Clientes"],
  ["/workspace-preview/forms/products", "Produtos"],
  ["/workspace-preview/forms/warehouses", "Depósitos"],
  ["/workspace-preview/forms/trucks", "Caminhões"],
  ["/workspace-preview/forms/drivers", "Motoristas"],
  ["/workspace-preview/forms/collaborators", "Colaboradores"],
  ["/workspace-preview/forms/permission-profiles", "Perfis de permissão"],
] as const

describe("routes", () => {
  it("redirects unauthenticated private routes to login", async () => {
    renderRoute("/profile", {
      error: null,
      isPending: false,
      refetch: vi.fn(),
      session: null,
    })

    expect(await screen.findByRole("heading", { name: "Entrar no CRV Triad" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Meu perfil" })).not.toBeInTheDocument()
  })

  it("keeps the development workspace preview available without a session", async () => {
    renderRoute("/workspace-preview", {
      error: null,
      isPending: false,
      refetch: vi.fn(),
      session: null,
    })

    expect(await screen.findByText("Pré-visualização de desenvolvimento")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Tema claro" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Tema escuro" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Entrar no CRV Triad" })).not.toBeInTheDocument()
  })

  it("keeps the development form catalog available without a session", async () => {
    renderRoute("/workspace-preview/forms", {
      error: null,
      isPending: false,
      refetch: vi.fn(),
      session: null,
    })

    expect(
      await screen.findByRole("heading", { name: "Empresas" }, { timeout: 20_000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Formulário" })).toHaveTextContent("Empresas")
    expect(screen.queryByRole("heading", { name: "Entrar no CRV Triad" })).not.toBeInTheDocument()
  }, 25_000)

  it.each(
    directFormPreviews,
  )("keeps the direct development URL %s available without a session", async (path, heading) => {
    renderRoute(path, {
      error: null,
      isPending: false,
      refetch: vi.fn(),
      session: null,
    })

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Formulário" })).toHaveTextContent(heading)
    expect(screen.queryByRole("heading", { name: "Entrar no CRV Triad" })).not.toBeInTheDocument()
  })

  it("redirects authenticated root and login visits to overview", async () => {
    const rootRouter = renderRoute("/", authenticatedState())

    await waitFor(() => expect(rootRouter.state.location.pathname).toBe("/overview"))
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Usuários/ })).toHaveAttribute("href", "/users")

    cleanup()

    const loginRouter = renderRoute("/login", authenticatedState())

    await waitFor(() => expect(loginRouter.state.location.pathname).toBe("/overview"))
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
  })

  it("keeps profile private and reachable inside the authenticated shell", async () => {
    const user = userEvent.setup()
    renderRoute("/profile", authenticatedState())

    expect(await screen.findByText("Nome")).toBeInTheDocument()
    expect(screen.getAllByText("Maria Souza").length).toBeGreaterThan(0)
    expect(screen.getAllByText("maria@example.com").length).toBeGreaterThan(0)
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument()
    expect(
      within(screen.getByRole("navigation", { name: "Navegação principal" })).getByRole("link", {
        name: "Dashboard",
      }),
    ).toHaveAttribute("href", "/overview")
    expect(
      screen.getByRole("button", { name: "Central de Operações — disponível em breve" }),
    ).toHaveAttribute("aria-disabled", "true")
    expect(
      screen.getByRole("button", { name: "Central de Operações — disponível em breve" }),
    ).not.toHaveAttribute("href")

    await user.click(screen.getByRole("button", { name: "Abrir menu de Maria Souza" }))
    expect(await screen.findByRole("menuitem", { name: "Meu perfil" })).toHaveAttribute(
      "href",
      "/profile",
    )
  })

  it("exposes all eight authenticated reference routes without persistence actions", async () => {
    const routes = [
      ["/companies", "Empresas", "Nova empresa"],
      ["/customers", "Clientes", "Novo cliente"],
      ["/inventory/products", "Produtos", "Novo produto"],
      ["/inventory/warehouses", "Depósitos", "Novo depósito"],
      ["/fleet/trucks", "Caminhões", "Novo caminhão"],
      ["/drivers", "Motoristas", "Novo motorista"],
      ["/users/collaborators", "Colaboradores", "Novo colaborador"],
      ["/users/permission-profiles", "Perfis de permissão", "Novo perfil"],
    ] as const

    for (const [path, heading, trigger] of routes) {
      renderRoute(path, authenticatedState())
      expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: trigger })).toBeInTheDocument()
      expect(document.body).not.toHaveTextContent(
        /protótipo|validação local|nenhum dado (?:é|foi) (?:enviado|salvo)|sem persistência|integração indisponível/i,
      )
      cleanup()
    }
  })
})
