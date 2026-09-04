import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const tenants = [
  {
    activeClientLimit: 100,
    clientCount: 34,
    createdAt: "2026-09-01T12:00:00.000Z",
    id: "tenant-aurora",
    memberCount: 6,
    name: "Barbearia Aurora",
    planKey: "pro",
    status: "active",
    subscriptionState: "active",
  },
  {
    activeClientLimit: 50,
    clientCount: 12,
    createdAt: "2026-08-20T12:00:00.000Z",
    id: "tenant-centro",
    memberCount: 3,
    name: "Barbearia Centro",
    planKey: "essencial",
    status: "disabled",
    subscriptionState: "suspended",
  },
]

test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:8000/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith("/get-session")) {
      return route.fulfill({
        json: {
          session: { id: "session-a" },
          user: { email: "gabriel@corvi.io", id: "user-a", name: "Gabriel" },
        },
      })
    }
    if (path === "/api/backstage/me") {
      return route.fulfill({ json: { id: "operator-a", role: "system_owner", status: "active" } })
    }
    if (path === "/api/backstage/inventory") {
      return route.fulfill({ json: { items: tenants, page: 1, pageSize: 20, totalCount: 2 } })
    }
    if (path === "/api/backstage/tenants" && route.request().method() === "POST") {
      return route.fulfill({
        json: {
          emailDelivery: "sent",
          id: "tenant-new",
          name: "Barbearia do Gabriel",
          ownerAccess: "invited",
          slug: "barbearia-do-gabriel-a1b2c",
        },
        status: 201,
      })
    }
    return route.fulfill({ json: { code: "not_found" }, status: 404 })
  })
})

test("presents the Backstage authentication identity without redundant product copy", async ({
  page,
}) => {
  await page.route("**/api/auth/**", async (route) => route.fulfill({ json: null }))
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/login")

  await expect(page.getByRole("img", { name: "TRIAD Backstage" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible()
  await expect(page.getByText("Use sua conta Corvi para acessar a operação interna.")).toBeVisible()
  await expect(page.getByText("Menos pontos cegos. Mais controle operacional.")).toBeVisible()
  await expect(page.getByText("TRIAD Backstage", { exact: true })).toHaveCount(0)
  expect((await new AxeBuilder({ page }).include("#main-content").analyze()).violations).toEqual([])

  await page.setViewportSize({ height: 720, width: 320 })
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test("renders the system barbershop inventory accessibly at desktop and mobile widths", async ({
  page,
}) => {
  await page.goto("/barbershops")
  await expect(page.getByRole("heading", { name: "Barbearias", level: 1 })).toBeVisible()
  await expect(page.getByRole("link", { name: "Barbearia Aurora" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Nova barbearia" })).toBeVisible()
  await page.getByRole("button", { name: "Nova barbearia" }).click()
  await page.getByLabel("Nome").fill("Barbearia do Gabriel")
  await expect(page.getByLabel("Identificador")).toHaveValue("barbearia-do-gabriel-*****")

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
  await page.keyboard.press("Escape")
  await expect(page.getByRole("heading", { name: "Nova barbearia" })).not.toBeVisible()

  await page.setViewportSize({ height: 1000, width: 1440 })
  await page.screenshot({ fullPage: true, path: ".impeccable/review/desktop.png" })
  await page.setViewportSize({ height: 844, width: 390 })
  await expect(page.getByRole("button", { name: "Sair" })).toBeInViewport()
  expect((await page.getByRole("button", { name: "Sair" }).boundingBox())?.y).toBeLessThan(65)
  await page.screenshot({ fullPage: true, path: ".impeccable/review/mobile.png" })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
