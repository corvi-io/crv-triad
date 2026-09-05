import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

test("presents tenant contexts without leaking another workspace", async ({ page }) => {
  await routeAuthenticatedContext(page, { platform: true, tenants: 2 })
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/select-workspace")

  await expect(page.getByRole("heading", { name: "Onde você quer trabalhar?" })).toBeVisible()
  await expect(page.getByText("Barbearia Aurora")).toBeVisible()
  await expect(page.getByText("Operações CRV")).toHaveCount(0)
  expect((await new AxeBuilder({ page }).include("#root").analyze()).violations).toEqual([])
  await expect(page.getByText("Barbearia Horizonte com nome muito longo")).toBeVisible()
})

test("opens a selected barbershop with one activation", async ({ page }) => {
  let selectionCount = 0
  await routeAuthenticatedContext(page, { platform: false, tenants: 2 }, () => {
    selectionCount += 1
  })
  await page.goto("/select-workspace")

  await page.getByRole("button", { name: "Abrir Barbearia Aurora" }).click()

  await expect.poll(() => selectionCount).toBe(1)
  await expect(page).toHaveURL(/\/overview$/)
  expect(selectionCount).toBe(1)
})

async function routeAuthenticatedContext(
  page: Page,
  options: { platform: boolean; tenants: number },
  onSelect?: () => void,
) {
  let activeOrganizationId: string | null = null
  await page.route("**/api/auth/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith("/get-session")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          session: { expiresAt: "2099-01-01T00:00:00.000Z", id: "session-fixture" },
          user: { email: "operator@example.invalid", id: "user-fixture", name: "Operador" },
        }),
      })
      return
    }
    if (pathname.endsWith("/organization/set-active")) {
      activeOrganizationId = (route.request().postDataJSON() as { organizationId: string })
        .organizationId
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: true }) })
  })
  await page.route("**/api/contexts**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/active")) {
      const organizationId = (route.request().postDataJSON() as { organizationId: string })
        .organizationId
      activeOrganizationId = organizationId
      onSelect?.()
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ activeOrganizationId, status: "selected" }),
      })
      return
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        activeOrganizationId,
        platform: options.platform ? { id: "platform", label: "Operações CRV" } : null,
        status: "available",
        tenants: [
          { id: "tenant-a", name: "Barbearia Aurora", role: "owner" },
          { id: "tenant-b", name: "Barbearia Horizonte com nome muito longo", role: "admin" },
        ].slice(0, options.tenants),
      }),
    })
  })
  await page.route("**/api/access/summary", async (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        capabilities: [{ allowed: true, capability: "clients.read", reason: null }],
        organizationId: activeOrganizationId,
        role: "owner",
        subscriptionState: "active",
      }),
    }),
  )
  await page.route("**/api/backstage/inventory**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            clientCount: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            id: "tenant-a",
            memberCount: 2,
            name: "Barbearia Aurora",
            status: "active",
          },
        ],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      }),
    }),
  )
}
