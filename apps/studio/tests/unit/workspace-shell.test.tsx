import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type ReactNode, useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { signOut } from "@/modules/auth/services/auth-client"
import { type AuthState, AuthStateProvider } from "@/modules/auth/services/auth-provider"
import { ThemeProvider } from "@/modules/shared/theme/theme-provider"
import { routeTree } from "@/routeTree.gen"

vi.mock("@/modules/auth/services/auth-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/services/auth-client")>()
  return {
    ...actual,
    signOut: vi.fn(),
  }
})

const authenticatedState: AuthState = {
  error: null,
  isPending: false,
  refetch: vi.fn(),
  session: {
    user: {
      email: "maria@example.com",
      name: "Maria Souza",
    },
  },
}

function renderWorkspace(path = "/overview") {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { gcTime: Number.POSITIVE_INFINITY, retry: false },
    },
  })
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  const result = render(
    <IsolatedQueryClientProvider queryClient={queryClient}>
      <ThemeProvider>
        <AuthStateProvider value={authenticatedState}>
          <RouterProvider router={router} />
        </AuthStateProvider>
      </ThemeProvider>
    </IsolatedQueryClientProvider>,
  )

  return { ...result, router }
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

describe("authenticated workspace shell", () => {
  beforeEach(() => {
    vi.mocked(signOut).mockClear()
    window.localStorage.clear()
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 })
  })

  afterEach(() => {
    cleanup()
  })

  it("persists the expanded and collapsed desktop preference", async () => {
    const user = userEvent.setup()
    const firstRender = renderWorkspace()
    await screen.findByRole("heading", { name: "Dashboard" })
    const desktopSidebar = firstRender.container.querySelector('[data-slot="sidebar"][data-state]')

    expect(desktopSidebar).toHaveAttribute("data-state", "expanded")
    await user.click(screen.getByRole("button", { name: "Alternar menu de navegação" }))
    expect(desktopSidebar).toHaveAttribute("data-state", "collapsed")
    expect(window.localStorage.getItem("sidebar_state")).toBe("false")

    firstRender.unmount()
    const secondRender = renderWorkspace()
    await screen.findByRole("heading", { name: "Dashboard" })
    expect(
      secondRender.container.querySelector('[data-slot="sidebar"][data-state]'),
    ).toHaveAttribute("data-state", "collapsed")
  }, 10_000) // This persistence assertion intentionally mounts the complete routed shell twice.

  it("exposes neutral identity and session-backed navigation semantics", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await screen.findByRole("heading", { name: "Dashboard" })
    const primaryNavigation = screen.getByRole("navigation", { name: "Navegação principal" })

    expect(within(primaryNavigation).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(
      within(primaryNavigation).queryByRole("link", { name: "Usuários" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Abrir notificações" })).not.toBeInTheDocument()
    expect(within(primaryNavigation).queryByRole("link", { name: "Configurações" })).toBeNull()
    expect(within(primaryNavigation).queryByRole("link", { name: "Barbearia" })).toBeNull()
    expect(screen.getByText("MS")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Abrir menu de Maria Souza" }))
    expect(await screen.findByRole("menuitem", { name: "Meu perfil" })).toHaveAttribute(
      "href",
      "/profile",
    )
    expect(screen.getByRole("menuitem", { name: "Preferências" })).toHaveAttribute(
      "href",
      "/preferences",
    )

    await user.click(screen.getByRole("menuitem", { name: "Trocar de barbearia" }))
    const dialog = await screen.findByRole("dialog", { name: "Onde você quer trabalhar?" })
    expect(within(dialog).getByRole("button", { name: /Barbearia de teste/ })).toBeDisabled()
    expect(within(dialog).getByRole("button", { name: "Abrir Barbearia dois" })).toBeEnabled()
    expect(dialog).toHaveTextContent("Escolha a barbearia em que deseja continuar trabalhando.")
    expect(within(dialog).queryByRole("button", { name: "Continuar" })).toBeNull()

    await user.click(within(dialog).getByRole("button", { name: "Abrir Barbearia dois" }))
    await waitFor(() =>
      expect(dialog).toHaveAccessibleName("Você realmente deseja trocar de barbearia?"),
    )
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(dialog).toHaveTextContent("Você passará a trabalhar em Barbearia dois.")
    expect(within(dialog).getByRole("button", { name: "Trocar de barbearia" })).toBeVisible()
    await user.click(within(dialog).getByRole("button", { name: "Voltar" }))
    expect(dialog).toHaveAccessibleName("Onde você quer trabalhar?")
  })

  it("uses a full-label mobile dialog and restores focus when it closes", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 })
    const user = userEvent.setup()
    renderWorkspace()
    await screen.findByRole("heading", { name: "Dashboard" })
    const trigger = screen.getByRole("button", { name: "Alternar menu de navegação" })

    await waitFor(() => expect(screen.queryByLabelText("Navegação do TRIAD Studio")).toBeNull())
    await user.click(trigger)

    const dialog = await screen.findByRole("dialog", { name: "Navegação do TRIAD Studio" })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: "Dashboard" })).toBeVisible()
    expect(within(dialog).getByRole("link", { name: "Agenda" })).toBeVisible()

    await user.keyboard("{Escape}")
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it("requires confirmation before ending the session", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await screen.findByRole("heading", { name: "Dashboard" })

    await user.click(screen.getByRole("button", { name: "Abrir menu de Maria Souza" }))
    await user.click(await screen.findByRole("menuitem", { name: "Sair" }))

    const dialog = await screen.findByRole("dialog", { name: "Deseja realmente sair?" })
    expect(signOut).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole("button", { name: "Continuar no Studio" }))
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(signOut).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Abrir menu de Maria Souza" }))
    await user.click(await screen.findByRole("menuitem", { name: "Sair" }))
    await user.click(
      within(await screen.findByRole("dialog", { name: "Deseja realmente sair?" })).getByRole(
        "button",
        { name: "Sair da conta" },
      ),
    )
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce())
  })

  it("identifies the active module in the mobile header on a nested route", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 })
    const { container } = renderWorkspace(
      "/service-desk/session-walk-in-checkout-pix/checkout?scenario=checkout-pix",
    )

    const header = await waitFor(() => {
      const element = container.querySelector('[data-slot="workspace-header"]')
      expect(element).not.toBeNull()
      return element
    })
    expect(header).not.toBeNull()
    expect(
      within(header as HTMLElement).getByRole("link", { name: "Atendimentos" }),
    ).toHaveAttribute("href", "/service-desk")
  })

  it("identifies the notification center in the mobile title and desktop breadcrumb", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 })
    const { container } = renderWorkspace("/notifications?notificationScenario=normal")
    const header = await waitFor(() => {
      const element = container.querySelector('[data-slot="workspace-header"]')
      expect(element).not.toBeNull()
      return element
    })
    expect(
      within(header as HTMLElement).getByRole("link", { name: "Notificações" }),
    ).toHaveAttribute("href", "/notifications")
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Notificações")
  })
})
