import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const router = vi.hoisted(() => ({ pathname: "/dashboard" }))
const workspace = vi.hoisted(() => ({
  contexts: {
    activeOrganizationId: null as string | null,
    platform: null,
    status: "available" as const,
    tenants: [] as Array<{ id: string; name: string; role: "owner" }>,
  },
  selectTenant: vi.fn<(tenantId: string) => Promise<void>>(),
}))

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <p>Navegação: {to}</p>,
  useLocation: ({ select }: { select: (location: { pathname: string }) => string }) =>
    select({ pathname: router.pathname }),
}))

vi.mock("@/modules/workspace/context-provider", () => ({
  useWorkspaceContext: () => workspace,
}))

import { WorkspaceContextGate } from "@/modules/workspace/context-gate"

function renderGate(children: ReactNode = <p>Conteúdo protegido</p>) {
  return render(<WorkspaceContextGate>{children}</WorkspaceContextGate>)
}

describe("WorkspaceContextGate", () => {
  beforeEach(() => {
    router.pathname = "/dashboard"
    workspace.contexts = {
      activeOrganizationId: null,
      platform: null,
      status: "available",
      tenants: [],
    }
    workspace.selectTenant.mockReset().mockResolvedValue(undefined)
  })

  it("explains when the user has no available workspace", () => {
    renderGate()

    expect(screen.getByRole("heading", { name: "Nenhum espaço disponível" })).toBeVisible()
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument()
  })

  it("selects the only tenant automatically while showing safe feedback", async () => {
    workspace.contexts.tenants = [{ id: "tenant-a", name: "Barbearia A", role: "owner" }]

    renderGate()

    expect(screen.getByText("Abrindo sua barbearia")).toBeVisible()
    await waitFor(() => expect(workspace.selectTenant).toHaveBeenCalledWith("tenant-a"))
  })

  it("allows retrying an automatic selection that failed", async () => {
    workspace.contexts.tenants = [{ id: "tenant-a", name: "Barbearia A", role: "owner" }]
    workspace.selectTenant.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined)

    renderGate()

    expect(
      await screen.findByRole("heading", { name: "Não foi possível abrir sua barbearia" }),
    ).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }))

    await waitFor(() => expect(workspace.selectTenant).toHaveBeenCalledTimes(2))
    expect(screen.getByText("Abrindo sua barbearia")).toBeVisible()
  })

  it("redirects users with multiple tenants to workspace selection", () => {
    workspace.contexts.tenants = [
      { id: "tenant-a", name: "Barbearia A", role: "owner" },
      { id: "tenant-b", name: "Barbearia B", role: "owner" },
    ]

    renderGate()

    expect(screen.getByText("Navegação: /select-workspace")).toBeVisible()
  })

  it("renders the protected content for the active tenant", () => {
    workspace.contexts.activeOrganizationId = "tenant-a"
    workspace.contexts.tenants = [{ id: "tenant-a", name: "Barbearia A", role: "owner" }]

    renderGate()

    expect(screen.getByText("Conteúdo protegido")).toBeVisible()
    expect(workspace.selectTenant).not.toHaveBeenCalled()
  })

  it("keeps workspace selection accessible without an active tenant", () => {
    router.pathname = "/select-workspace"
    workspace.contexts.tenants = [
      { id: "tenant-a", name: "Barbearia A", role: "owner" },
      { id: "tenant-b", name: "Barbearia B", role: "owner" },
    ]

    renderGate()

    expect(screen.getByText("Conteúdo protegido")).toBeVisible()
  })

  it("repairs a stale active organization when only one tenant is available", async () => {
    workspace.contexts.activeOrganizationId = "removed-tenant"
    workspace.contexts.tenants = [{ id: "tenant-a", name: "Barbearia A", role: "owner" }]

    renderGate()

    expect(screen.getByText("Navegação: /overview")).toBeVisible()
    await waitFor(() => expect(workspace.selectTenant).toHaveBeenCalledWith("tenant-a"))
  })
})
