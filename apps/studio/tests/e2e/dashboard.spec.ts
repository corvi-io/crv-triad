import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, type Route, test } from "@playwright/test"

test.beforeEach(async ({ page }) => routeAuthenticatedSession(page))

test("renders the accepted operational hierarchy from scheduling data and passes axe", async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-07-23T15:35:00-03:00"))
  await page.addInitScript(() => localStorage.setItem("triad-studio-theme", "dark"))
  await page.setViewportSize({ height: 900, width: 1600 })
  await page.goto("/overview?scenario=normal")
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  await expect(page.locator("html")).toHaveClass(/dark/)

  const expectedHeadings = [
    "Dashboard",
    "Próximos atendimentos",
    "Atenção necessária",
    "Fluxo dos atendimentos",
    "Ocupação dos barbeiros",
    "Capacidade do período",
    "Financeiro operacional",
    "Serviços do período",
    "Cancelamentos e no-show",
    "Clientes do período",
  ]
  const headings = await page.getByRole("heading").allTextContents()
  for (const heading of expectedHeadings) expect(headings).toContain(heading)
  expect(expectedHeadings.map((heading) => headings.indexOf(heading))).toEqual(
    expectedHeadings.map((heading) => headings.indexOf(heading)).toSorted((a, b) => a - b),
  )
  await expect(page.getByText("Indisponível").first()).toBeVisible()
  await expect(page.getByText(/não comprova primeira visita nem retenção/)).toBeVisible()
  await expect(page.getByRole("table", { name: "Próximos atendimentos" })).toBeVisible()
  await expect(
    page.getByRole("table", { name: "Próximos atendimentos" }).locator("tbody tr"),
  ).toHaveCount(5)
  await expect(page.locator("[data-dashboard-metric]")).toHaveCount(5)
  await expect(page.getByText(/vs\. dia anterior/)).toHaveCount(5)
  await expect(
    page
      .locator('[data-dashboard-row="flow-professionals"] > [data-slot="card"]')
      .first()
      .locator("button"),
  ).toHaveCount(7)
  await expect(page.locator('[data-slot="workspace-primary-navigation-item"] a')).toHaveText([
    "Dashboard",
    "Agenda",
    "Clientes",
  ])
  await expect(page.getByRole("table", { name: "Ocupação dos barbeiros" })).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("dashboard-1600.png"),
  })
  await page.getByRole("heading", { name: "Fluxo dos atendimentos" }).scrollIntoViewIfNeeded()
  await page.screenshot({
    path: testInfo.outputPath("dashboard-1600-middle.png"),
  })
  await page.getByRole("heading", { name: "Clientes do período" }).scrollIntoViewIfNeeded()
  await page.screenshot({
    path: testInfo.outputPath("dashboard-1600-bottom.png"),
  })

  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("keeps bounded URL filters coherent and drills into existing destinations", async ({
  page,
}) => {
  await page.goto("/overview?scenario=normal")

  await page.locator("#dashboard-period").click()
  const customPeriod = page.getByRole("menuitemradio", { name: "Personalizado" })
  await customPeriod.click()
  await expect(page).toHaveURL(/period=custom/)
  await expect(page.getByText("O intervalo personalizado é limitado a 31 dias.")).toBeVisible()
  await expect(customPeriod).toBeHidden()

  await page.locator("#dashboard-professional").click()
  const carlos = page.getByRole("menuitemradio", { name: "Carlos Lima" })
  await carlos.click()
  await expect(page).toHaveURL(/professionalId=professional-carlos/)
  await expect(carlos).toBeHidden()
  await page.getByRole("button", { name: "Abrir Concluídos na Agenda" }).click()
  await expect(page).toHaveURL(/\/agenda\?/)
  await expect(page).toHaveURL(/professional=professional-carlos/)
  await expect(page).toHaveURL(/status=completed/)

  await page.goto("/overview?scenario=normal&professionalId=professional-unknown")
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  await expect(page).not.toHaveURL(/professionalId=/)
  await expect(page.locator("#dashboard-professional")).toContainText("Todos os barbeiros")
  await page.getByRole("button", { name: "Abrir Concluídos na Agenda" }).click()
  await expect(page).toHaveURL(/\/agenda\?/)
  await expect(page).not.toHaveURL(/professional=/)

  await page.goto("/overview?scenario=normal")
  await page.getByRole("button", { name: "Ver serviços" }).click()
  await expect(page).toHaveURL(/\/barbershop-setup\?/)
  await expect(page).toHaveURL(/section=services/)

  await page.goto("/overview?scenario=normal")
  await page.getByRole("button", { name: "Ver clientes" }).click()
  await expect(page).toHaveURL(/\/clients\?/)
})

test("reuses the appointment drawer and shares a mutation with Agenda", async ({ page }) => {
  await page.goto("/overview?scenario=empty")
  await expect(page.getByRole("heading", { name: "Período sem agendamentos" })).toBeVisible()

  await page.getByRole("button", { name: "Novo agendamento" }).first().click()
  await expect(page.getByRole("dialog", { name: /Agenda \/ Novo agendamento/ })).toBeVisible()
  await page.getByLabel("Nome").fill("Cliente Dashboard Sintético")
  await page.getByLabel("Telefone").fill("81900000000")
  await page.locator("#appointment-time").fill("17:00")
  await page.getByRole("button", { name: "Criar agendamento" }).click()
  await expect(page.getByText("Agendamento criado.")).toBeVisible()
  await expect(page.getByText("Cliente Dashboard Sintético").first()).toBeVisible()

  await page.getByRole("button", { name: "Ver agenda" }).click()
  await expect(page).toHaveURL(/\/agenda/)
  await expect(page.getByText("Cliente Dashboard Sintético").first()).toBeVisible()

  await page.reload()
  await expect(page.getByText("Agenda livre no período")).toBeVisible()
  await expect(page.getByText("Cliente Dashboard Sintético")).toHaveCount(0)
})

test("distinguishes delayed, empty, error/retry, and filtered-empty states", async ({ page }) => {
  await page.goto("/overview?scenario=slow")
  await expect(page.getByRole("status", { name: "Carregando Dashboard" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Próximos atendimentos" })).toBeVisible()

  await page.goto("/overview?scenario=persistent-error")
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar o Dashboard")
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible()

  await page.goto("/overview?scenario=empty&unitId=artesao")
  await expect(
    page.getByRole("heading", { name: "Nenhum resultado para os filtros" }),
  ).toBeVisible()
  await expect(
    page.getByText(/protótipo|fixture|latência|falhar próxima|restaurar cenário/i),
  ).toHaveCount(0)
})

test("reflows medium and tablet layouts while following the system theme", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("triad-studio-theme", "system"))
  await page.emulateMedia({ colorScheme: "light" })
  await page.setViewportSize({ height: 800, width: 1180 })
  await page.goto("/overview?scenario=normal")
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await expectNoPageOverflow(page)
  await expectProgressContrast(page)
  await page.screenshot({ path: testInfo.outputPath("dashboard-medium-light.png") })

  await page.emulateMedia({ colorScheme: "dark" })
  await page.setViewportSize({ height: 900, width: 768 })
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await expectNoPageOverflow(page)
  await expectProgressContrast(page)
  await expect(page.getByRole("heading", { name: "Clientes do período" })).toBeAttached()
  await page.screenshot({ path: testInfo.outputPath("dashboard-tablet-system-dark.png") })
})

test("preserves 320px reflow, themes, reduced motion, forced colors, focus, and target size", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("triad-studio-theme", "system"))
  await page.setViewportSize({ height: 720, width: 320 })
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.goto("/overview?scenario=normal")
  await page.getByRole("button", { name: "Alternar menu de navegação" }).click()
  const mobileNavigation = page.getByRole("dialog", { name: "Navegação do TRIAD Studio" })
  await expect(
    mobileNavigation.locator('[data-slot="workspace-primary-navigation-item"] a'),
  ).toHaveText(["Dashboard", "Agenda", "Clientes"])
  await page.keyboard.press("Escape")
  await expect(mobileNavigation).toBeHidden()

  const geometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    dark: document.documentElement.classList.contains("dark"),
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    viewport: innerWidth,
  }))
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewport)
  expect(geometry.dark).toBe(true)
  expect(geometry.reduced).toBe(true)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("triad-studio-theme")))
    .toBe("system")

  const controls = page.locator("#main-content button:visible")
  for (let index = 0; index < (await controls.count()); index += 1) {
    const box = await controls.nth(index).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
  }
  const create = page.getByRole("button", { name: "Novo agendamento" }).first()
  await create.focus()
  await expect(create).toBeFocused()
  expect(await create.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
    "none",
  )

  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  await page.reload()
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  const progress = page.getByRole("progressbar").first()
  await expect(progress).toBeVisible()
  await expect(progress.locator('[data-slot="progress-track"]')).toBeVisible()
  await expect(progress.locator('[data-slot="progress-indicator"]')).toBeVisible()
  expect(await progress.evaluate((element) => getComputedStyle(element).forcedColorAdjust)).toBe(
    "auto",
  )
})

async function expectNoPageOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))
  expect(Math.max(geometry.body, geometry.root)).toBeLessThanOrEqual(geometry.viewport)
}

async function expectProgressContrast(page: Page) {
  const progress = page.getByRole("progressbar").first()
  const track = progress.locator('[data-slot="progress-track"]')
  const indicator = progress.locator('[data-slot="progress-indicator"]')
  await expect(track).toBeVisible()
  await expect(indicator).toBeVisible()
  const colors = await track.evaluate((element) => {
    const renderedIndicator = element.querySelector<HTMLElement>('[data-slot="progress-indicator"]')
    return {
      indicator: getComputedStyle(renderedIndicator ?? element).backgroundColor,
      track: getComputedStyle(element).backgroundColor,
    }
  })
  expect(colors.indicator).not.toBe("rgba(0, 0, 0, 0)")
  expect(colors.track).not.toBe("rgba(0, 0, 0, 0)")
  expect(contrastRatio(colors.indicator, colors.track)).toBeGreaterThanOrEqual(3)
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (value: string) => {
    const channels = value
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number) ?? [0, 0, 0]
    const linear = channels.map((channel) => {
      const normalized = channel / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

async function routeAuthenticatedSession(page: Page) {
  await page.route("**/api/auth/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ headers: corsHeaders(), status: 204 })
      return
    }
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
