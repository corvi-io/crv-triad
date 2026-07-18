import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
  const queryClient = new QueryClient()
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient },
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthStateProvider value={authenticatedState}>
          <RouterProvider router={router} />
        </AuthStateProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )

  return { ...result, router }
}

describe("authenticated workspace shell", () => {
  beforeEach(() => {
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

  it("exposes current, planned, and session-backed navigation semantics", async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await screen.findByRole("heading", { name: "Dashboard" })
    const primaryNavigation = screen.getByRole("navigation", { name: "Navegação principal" })

    expect(within(primaryNavigation).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(within(primaryNavigation).getByRole("link", { name: "Clientes" })).toHaveAttribute(
      "href",
      "/customers",
    )
    expect(
      screen.getByRole("button", { name: "Central de alertas — disponível em breve" }),
    ).toHaveAttribute("aria-disabled", "true")
    expect(screen.queryByRole("button", { name: "Abrir notificações" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute(
      "href",
      "/preferences",
    )
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
  })

  it("uses a full-label mobile dialog and restores focus when it closes", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 })
    const user = userEvent.setup()
    renderWorkspace()
    await screen.findByRole("heading", { name: "Dashboard" })
    const trigger = screen.getByRole("button", { name: "Alternar menu de navegação" })

    await waitFor(() => expect(screen.queryByLabelText("Navegação do workspace")).toBeNull())
    await user.click(trigger)

    const dialog = await screen.findByRole("dialog", { name: "Navegação do workspace" })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: "Dashboard" })).toBeVisible()
    expect(
      within(dialog).getByRole("button", {
        name: "Central de Operações — disponível em breve",
      }),
    ).toBeVisible()

    await user.keyboard("{Escape}")
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})
