import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

test("presents tenant contexts without leaking another workspace", async ({ page }) => {
  await routeAuthenticatedContext(page, { platform: true, tenants: 2 })
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/select-workspace")

  await expect(page.getByRole("heading", { name: "Onde você quer trabalhar?" })).toBeVisible()
  await expect(page.getByText("Barbearia Aurora")).toBeVisible()
  await expect(page.getByText("Operações CRV")).toBeVisible()
  expect((await new AxeBuilder({ page }).include("#root").analyze()).violations).toEqual([])
  await expect(page.getByText("Barbearia Horizonte com nome muito longo")).toBeVisible()
})

test("keeps platform operations separate and usable at 320px", async ({ page }) => {
  await routeAuthenticatedContext(page, { platform: true, tenants: 0 })
  await page.setViewportSize({ height: 780, width: 320 })
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" })
  await page.goto("/overview")

  await expect(page).toHaveURL(/\/platform$/)
  await expect(page.getByRole("heading", { name: "Operações CRV" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Contexto temporário de suporte" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  expect((await new AxeBuilder({ page }).include("#root").analyze()).violations).toEqual([])
})

test("enters and exits an attributed support context", async ({ page }) => {
  let revoked = false
  await routeAuthenticatedContext(page, { platform: true, tenants: 0 })
  await page.route("**/api/backstage/support-contexts", async (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        credential: "opaque-support-proof",
        expiresAt: "2099-01-01T00:30:00.000Z",
        id: "support-a",
        organizationId: "tenant-a",
      }),
    }),
  )
  await page.route("**/api/backstage/support-contexts/support-a/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith("/revoke")) {
      revoked = true
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ id: "support-a", status: "revoked" }),
      })
      return
    }
    if (revoked) {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ code: "support_context_invalid" }),
      })
      return
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        pathname.endsWith("/clients")
          ? {
              items: [{ id: "client-a", name: "Cliente autorizado", status: "active" }],
              totalCount: 1,
            }
          : {
              activeClientCount: 1,
              activeMemberCount: 2,
              tenant: { id: "tenant-a", name: "Barbearia Aurora", status: "active" },
            },
      ),
    })
  })
  await page.goto("/platform")
  await page.getByLabel("ID da barbearia").fill("tenant-a")
  await page.getByLabel("Motivo do suporte").fill("Investigação de incidente autorizada")
  await page.getByRole("button", { name: "Entrar em suporte por 30 minutos" }).click()
  await expect(page).toHaveURL(/\/platform\/support\/support-a$/)
  await expect(page.getByText("Suporte ativo — Barbearia Aurora")).toBeVisible()
  await expect(page.getByText("Cliente autorizado")).toBeVisible()
  await page.getByRole("button", { name: "Sair do suporte" }).click()
  await expect(page).toHaveURL(/\/platform$/)
  expect(revoked).toBe(true)
  const oldCredentialStatus = await page.evaluate(
    async () =>
      (
        await fetch(
          "http://localhost:8000/api/backstage/support-contexts/support-a/tenant-summary",
          { credentials: "include", headers: { authorization: "Support opaque-support-proof" } },
        )
      ).status,
  )
  expect(oldCredentialStatus).toBe(403)
})

async function routeAuthenticatedContext(
  page: Page,
  options: { platform: boolean; tenants: number },
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
  await page.route("**/api/contexts", async (route) =>
    route.fulfill({
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
    }),
  )
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
