import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, type Route, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await routeAuthenticatedSession(page)
  await page.clock.setFixedTime(new Date("2026-07-23T11:30:00-03:00"))
})

test("completes exact Pix and restores the selected scenario on reload", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/service-desk/session-walk-in-checkout-pix/checkout?scenario=checkout-pix")
  await expect(page.getByRole("heading", { name: "Serviços realizados" })).toBeVisible()
  await expect(page.getByText("Pix", { exact: true })).toBeVisible()
  await expect(summaryRow(page, "Restante")).toContainText("R$ 0,00")
  await expect(page.getByRole("link", { name: "Atendimentos", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  )
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Atendimentos")
  expect(page.url()).not.toMatch(/Pessoa|total|tender|reason|payment/i)

  await page.getByRole("button", { name: "Concluir pagamento" }).click()
  const dialog = page.getByRole("dialog", { name: "Concluir pagamento?" })
  await expect(dialog.locator(":focus")).toHaveCount(1)
  await dialog.getByRole("button", { name: "Concluir pagamento" }).click()
  await expect(page.getByText("Pagamento concluído.")).toBeVisible()
  await expect(page.getByText("Concluído · Pago")).toBeVisible()
  await expect(page.getByText(/não é um comprovante fiscal/i)).toBeVisible()
  await expect(page.getByRole("button", { name: "Atualizar ajustes" })).toHaveCount(0)
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("checkout-paid-light.png") })

  await page.reload()
  await expect(page.getByRole("heading", { name: "Serviços realizados" })).toBeVisible()
  await expect(page.getByText("Pronto para pagamento")).toBeVisible()
})

test("renders cash change and exact mixed tenders", async ({ page }) => {
  await page.goto("/service-desk/session-walk-in-checkout-cash/checkout?scenario=checkout-cash")
  await expect(page.getByText("Dinheiro", { exact: true })).toBeVisible()
  await expect(summaryRow(page, "Troco")).toContainText("R$ 10,00")

  await page.goto("/service-desk/session-walk-in-checkout-mixed/checkout?scenario=checkout-mixed")
  await expect(page.getByText("Pix", { exact: true })).toBeVisible()
  await expect(page.getByText("Débito", { exact: true })).toBeVisible()
  await expect(summaryRow(page, "Restante")).toContainText("R$ 0,00")
})

test("recovers from a bounded failure without partial payment", async ({ page }) => {
  await page.goto(
    "/service-desk/session-walk-in-checkout-next-failure/checkout?scenario=checkout-next-failure",
  )
  await page.getByRole("button", { name: "Concluir pagamento" }).click()
  await page
    .getByRole("dialog", { name: "Concluir pagamento?" })
    .getByRole("button", { name: "Concluir pagamento" })
    .click()
  await expect(page.getByText(/Nenhuma alteração foi aplicada/i)).toBeVisible()
  await expect(page.getByText("Pronto para pagamento")).toBeVisible()
  await expect(summaryRow(page, "Restante")).toContainText("R$ 0,00")

  await page
    .getByRole("dialog", { name: "Concluir pagamento?" })
    .getByRole("button", { name: "Concluir pagamento" })
    .click()
  await expect(page.getByText("Concluído · Pago")).toBeVisible()
})

test("passes axe and captures dark, 320px zoom-equivalent, keyboard, and forced-color evidence", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("triad-studio-theme", "dark"))
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto(
    "/service-desk/session-walk-in-checkout-long-content/checkout?scenario=checkout-long-content",
  )
  await expect(page.getByRole("heading", { name: "Serviços realizados" })).toBeVisible()
  await expect(page.locator("html")).toHaveClass(/dark/)
  const geometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    root: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))
  expect(Math.max(geometry.body, geometry.root)).toBeLessThanOrEqual(geometry.viewport)
  expect(geometry.reduced).toBe(true)

  await focusWithTab(page, "Voltar para o atendimento")
  const controls = page.locator("#main-content button:visible")
  for (let index = 0; index < (await controls.count()); index += 1) {
    const box = await controls.nth(index).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
  }
  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("checkout-320-dark.png") })

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  await page.reload()
  await expect(page.getByRole("heading", { name: "Serviços realizados" })).toBeVisible()
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("checkout-forced-colors.png") })
})

async function routeAuthenticatedSession(page: Page) {
  await page.route("**/api/auth/**", async (route) => {
    if (await fulfillPreflight(route)) return
    await fulfillJson(route, {
      session: { expiresAt: "2099-01-01T00:00:00.000Z", id: "session-fixture" },
      user: {
        email: "reviewer@example.invalid",
        id: "reviewer-fixture",
        name: "Pessoa Revisora",
      },
    })
  })
}

function summaryRow(page: Page, label: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Resumo exato" })
    .getByText(label, { exact: true })
    .locator("..")
}

async function focusWithTab(page: Page, accessibleName: string) {
  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press("Tab")
    const focusedName = await page.evaluate(() => document.activeElement?.textContent?.trim())
    if (focusedName?.includes(accessibleName)) return
  }
  throw new Error(`Keyboard focus did not reach ${accessibleName}.`)
}

async function fulfillPreflight(route: Route) {
  if (route.request().method() !== "OPTIONS") return false
  await route.fulfill({ headers: corsHeaders(), status: 204 })
  return true
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
