import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

const cashUrl = (scenario = "cash-typical") =>
  `/cash?date=2026-07-24&scenario=${scenario}&unitId=centro`

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await routeAuthenticatedSession(page)
  await page.clock.setFixedTime(new Date("2026-07-24T11:30:00-03:00"))
})

test("closes an exactly counted day once and keeps the snapshot read-only after reload", async ({
  page,
}) => {
  await page.goto(cashUrl())
  await expect(page.getByRole("heading", { name: "Caixa" })).toHaveCount(1)
  await expect(page.getByRole("heading", { name: "Contexto operacional" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Centro" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Data operacional: 24/07/2026" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Resumo do dia" })).toBeVisible()
  await expect(page.getByText("Dia aberto")).toBeVisible()
  await expect(page.getByRole("link", { name: "Caixa", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  )
  await expect(page.getByText("R$ 0,00", { exact: true }).first()).toBeVisible()
  expect(page.url()).not.toMatch(/reason|counted|responsible|Pessoa/)

  const filters = page.locator('[data-slot="cash-filters"]')
  const filtersTop = (await filters.boundingBox())?.y
  const viewport = page.locator(
    '[data-slot="module-layout-body"] [data-slot="scroll-area-viewport"]',
  )
  const viewportBox = await viewport.boundingBox()
  const firstCardBox = await page
    .locator('[data-slot="module-layout-body"] [data-slot="card"]')
    .first()
    .boundingBox()
  expect(viewportBox).not.toBeNull()
  expect(firstCardBox).not.toBeNull()
  expect(firstCardBox?.x).toBeGreaterThan(viewportBox?.x ?? 0)
  expect((firstCardBox?.x ?? 0) + (firstCardBox?.width ?? 0)).toBeLessThan(
    (viewportBox?.x ?? 0) + (viewportBox?.width ?? 0),
  )
  await page
    .locator('[data-slot="module-layout-body"] [data-slot="scroll-area-viewport"]')
    .evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
  expect((await filters.boundingBox())?.y).toBeCloseTo(filtersTop ?? 0, 1)
  await page
    .locator('[data-slot="module-layout-body"] [data-slot="scroll-area-viewport"]')
    .evaluate((element) => {
      element.scrollTop = 0
    })

  await page.getByRole("button", { name: "Centro" }).click()
  await expect(page.getByRole("menuitemradio", { name: "Centro" })).toBeVisible()
  await expect(page.getByRole("menuitemradio", { name: "Artesão" })).toBeVisible()
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Fechar dia" }).click()
  const dialog = page.getByRole("dialog", { name: "Confirmar fechamento do dia?" })
  await expect(dialog.locator(":focus")).toHaveCount(1)
  await dialog.getByRole("button", { name: "Confirmar fechamento" }).click()
  await expect(page.getByText("Dia fechado")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Fechamento registrado" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Fechar dia" })).toHaveCount(0)

  await page.reload()
  await expect(page.getByText("Dia aberto")).toBeVisible()
})

test("associates a bounded reason error with a non-zero cash difference", async ({ page }) => {
  await page.goto(cashUrl("cash-positive-difference"))
  await expect(page.getByText("+R$ 5,00", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Fechar dia" }).click()
  const reason = page.getByLabel("Motivo da diferença")
  await expect(reason).toBeFocused()
  await expect(reason).toHaveAttribute("aria-invalid", "true")
  await expect(page.getByText(/Explique a diferença com pelo menos 3 caracteres/)).toBeVisible()
  await reason.fill("Conferência física")
  await page.getByRole("button", { name: "Fechar dia" }).click()
  await page
    .getByRole("dialog", { name: "Confirmar fechamento do dia?" })
    .getByRole("button", { name: "Confirmar fechamento" })
    .click()
  await expect(page.getByText("Dia fechado")).toBeVisible()
  await expect(page.getByText("Conferência física")).toBeVisible()
})

test("recovers from a failed close without a partial snapshot", async ({ page }) => {
  await page.goto(cashUrl("cash-next-failure"))
  await page.getByRole("button", { name: "Fechar dia" }).click()
  await page
    .getByRole("dialog", { name: "Confirmar fechamento do dia?" })
    .getByRole("button", { name: "Confirmar fechamento" })
    .click()
  await expect(page.getByText(/Nenhuma alteração foi aplicada/)).toBeVisible()
  await expect(page.getByText("Dia aberto")).toBeVisible()
  await page.getByRole("button", { name: "Fechar dia" }).click()
  await page
    .getByRole("dialog", { name: "Confirmar fechamento do dia?" })
    .getByRole("button", { name: "Confirmar fechamento" })
    .click()
  await expect(page.getByText("Dia fechado")).toBeVisible()
})

test("shows already-closed and bounded dense history as read-only detail", async ({ page }) => {
  await page.goto(cashUrl("cash-already-closed"))
  await expect(page.getByText("Dia fechado")).toBeVisible()
  await expect(page.getByRole("button", { name: "Fechar dia" })).toHaveCount(0)

  await page.goto(cashUrl("cash-dense-history"))
  await expect(page.getByRole("button", { name: "Visualizar" })).toHaveCount(24)
  await page.getByRole("button", { name: "Visualizar" }).first().click()
  await expect(page.getByRole("heading", { name: /Fechamento de/ })).toBeVisible()
  await expect(page.getByText(/Somente leitura/).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /Reabrir|Editar/ })).toHaveCount(0)
  expect(page.url()).not.toMatch(/Pessoa|reason|counted|total/)
})

test("passes axe and captures light, dark, 320px, reduced-motion, keyboard, and forced-color evidence", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(cashUrl("cash-professionals"))
  await expect(page.getByRole("heading", { name: "Resumo do dia" })).toBeVisible()
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("cash-light-1440.png") })

  await page.addInitScript(() => localStorage.setItem("triad-studio-theme", "dark"))
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.setViewportSize({ width: 320, height: 720 })
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
  const geometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    root: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))
  expect(Math.max(geometry.body, geometry.root)).toBeLessThanOrEqual(geometry.viewport)
  expect(geometry.reduced).toBe(true)
  await focusWithTab(page, "Dinheiro contado")
  const targets = page.locator("#main-content button:visible")
  for (let index = 0; index < (await targets.count()); index += 1) {
    const box = await targets.nth(index).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
  }
  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
  await page
    .locator('[data-slot="module-layout-body"] [data-slot="scroll-area-viewport"]')
    .evaluate((element) => {
      element.scrollTop = 0
    })
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("cash-dark-320.png") })

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  await page.reload()
  await expect(page.getByRole("heading", { name: "Resumo do dia" })).toBeVisible()
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("cash-forced-colors-320.png") })
})

async function focusWithTab(page: Page, accessibleName: string) {
  for (let index = 0; index < 100; index += 1) {
    await page.keyboard.press("Tab")
    const name = await page.evaluate(() => {
      const element = document.activeElement
      if (!(element instanceof HTMLElement)) return ""
      return element.getAttribute("aria-label") || element.textContent || element.id
    })
    if (name.includes(accessibleName) || name.includes("counted-cash")) return
  }
  throw new Error(`Keyboard focus did not reach ${accessibleName}.`)
}

async function routeAuthenticatedSession(page: Page) {
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

function corsHeaders() {
  return {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": "http://127.0.0.1:3100",
  }
}
