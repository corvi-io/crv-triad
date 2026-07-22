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
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  const result = render(
    <ThemeProvider>
      <AuthStateProvider value={authenticatedState}>
        <RouterProvider router={router} />
      </AuthStateProvider>
    </ThemeProvider>,
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
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute(
      "href",
      "/preferences",
    )
    expect(screen.getByRole("link", { name: "Barbearia" })).toHaveAttribute(
      "href",
      "/barbershop-setup",
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

    await waitFor(() => expect(screen.queryByLabelText("Navegação do TRIAD Studio")).toBeNull())
    await user.click(trigger)

    const dialog = await screen.findByRole("dialog", { name: "Navegação do TRIAD Studio" })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByRole("link", { name: "Dashboard" })).toBeVisible()
    expect(within(dialog).getByRole("link", { name: "Barbearia" })).toBeVisible()

    await user.keyboard("{Escape}")
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})
