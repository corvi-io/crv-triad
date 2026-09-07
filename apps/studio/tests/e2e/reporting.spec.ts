import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, type Route, test } from "@playwright/test"

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await routeAuthenticatedSession(page)
  await page.clock.setFixedTime(new Date("2026-07-24T11:30:00-03:00"))
})

test("presents reports as a catalog and submits the CSV email journey", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/reports?from=2026-07-01&to=2026-07-31")

  await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Escolha um relatório" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Configurar relatório" })).toHaveCount(6)
  await expect(page.getByRole("button", { name: "Hoje" })).toHaveCount(0)
  await expect(page.getByRole("table")).toHaveCount(0)

  await page.getByRole("button", { name: "Configurar relatório" }).first().click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Configurar relatório" })).toBeVisible()
  await expect(dialog.getByText("Todas as unidades", { exact: true })).toBeVisible()
  await expect(dialog.getByText("Todos os profissionais", { exact: true })).toBeVisible()
  await expect(dialog.getByText("Todos os serviços", { exact: true })).toBeVisible()
  await expect(dialog.getByText("Todas as formas de pagamento", { exact: true })).toBeVisible()

  await dialog.getByLabel("Unidade").click()
  await expect(page.getByRole("option", { name: "Todas as unidades" })).toBeVisible()
  await page.getByRole("option", { name: "Todas as unidades" }).click()

  await dialog.getByRole("button", { name: "Revisar relatório" }).click()
  await expect(dialog.getByRole("heading", { name: "Revisar relatório" })).toBeVisible()
  await expect(dialog.getByText("CSV", { exact: true })).toBeVisible()
  await expect(dialog.getByText("7 dias", { exact: true })).toBeVisible()
  await dialog.getByRole("button", { name: "Gerar relatório" }).click()
  await expect(
    page.getByText("Solicitação recebida. Você receberá o resultado por e-mail."),
  ).toBeVisible()
  await expect(dialog).toBeHidden()

  await hideDevtools(page)
  await page.screenshot({
    fullPage: true,
    path: "../../.artifacts/product-qa/reporting/catalog-desktop.png",
  })
})

test("keeps the dialog usable on mobile, by keyboard, and without accessibility violations", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 320 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/reports?from=2026-07-01&to=2026-07-31")
  await page.getByRole("button", { name: "Configurar relatório" }).first().click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await dialog.getByLabel("Profissional").focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("option", { name: "Todos os profissionais" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expectNoDocumentOverflow(page)

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])

  await hideDevtools(page)
  await page.screenshot({
    fullPage: true,
    path: "../../.artifacts/product-qa/reporting/configuration-mobile.png",
  })
})

async function expectNoDocumentOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))
  expect(Math.max(geometry.body, geometry.root)).toBeLessThanOrEqual(geometry.viewport)
}

async function hideDevtools(page: Page) {
  const trigger = page.getByRole("button", { name: "Open TanStack Router Devtools" })
  if (await trigger.count()) {
    await trigger.evaluate((element) => {
      ;(element as HTMLElement).style.display = "none"
    })
  }
}

async function routeAuthenticatedSession(page: Page) {
  await page.route("**/api/contexts", (route) =>
    fulfillJson(route, {
      activeOrganizationId: "tenant-reporting-fixture",
      platform: null,
      status: "available",
      tenants: [{ id: "tenant-reporting-fixture", name: "Barbearia de teste", role: "owner" }],
    }),
  )
  await page.route("**/api/access/summary", (route) =>
    fulfillJson(route, {
      capabilities: [{ capability: "reports.read", allowed: true, reason: null }],
      organizationId: "tenant-reporting-fixture",
      role: "owner",
      subscriptionState: "active",
    }),
  )
  await page.route("**/api/auth/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ headers: corsHeaders(), status: 204 })
      return
    }
    await route.fulfill({
      body: JSON.stringify({
        session: { expiresAt: "2099-01-01T00:00:00.000Z", id: "session-fixture" },
        user: {
          email: "reviewer@example.invalid",
          id: "reviewer-fixture",
          name: "Pessoa Revisora",
        },
      }),
      contentType: "application/json",
      headers: corsHeaders(),
      status: 200,
    })
  })
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: "application/json",
    headers: corsHeaders(),
    status: 200,
  })
}

function corsHeaders() {
  return {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": "http://127.0.0.1:3100",
  }
}
