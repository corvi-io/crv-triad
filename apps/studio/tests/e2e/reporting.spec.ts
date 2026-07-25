import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

const reportsUrl = (scenario = "typical") =>
  `/reports?from=2026-07-01&to=2026-07-31&scenario=${scenario}`

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await routeAuthenticatedSession(page)
  await page.clock.setFixedTime(new Date("2026-07-24T11:30:00-03:00"))
})

test("renders all seven reports and keeps canonical combined filters across reload", async ({
  page,
}) => {
  await page.goto(reportsUrl())
  await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Relatórios", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  )
  await expect(page.locator('[data-slot="workspace-primary-navigation-item"] a')).toHaveText([
    "Dashboard",
    "Agenda",
    "Atendimentos",
    "Caixa",
    "Relatórios",
    "Clientes",
  ])
  for (const title of [
    "Faturamento por período",
    "Atendimentos por profissional",
    "Serviços mais vendidos",
    "Ticket médio",
    "Comissões por profissional",
    "Cancelamentos e ausências",
    "Clientes novos e recorrentes",
  ]) {
    await expect(page.getByText(title, { exact: true })).toBeVisible()
  }
  await expect(page.getByText(/Denominador:/)).toBeVisible()
  await expect(page.getByText(/sem chave estável ficam fora das proporções/)).toBeVisible()
  await expect(page.getByRole("table")).toHaveCount(6)

  await page.getByRole("button", { name: "Hoje" }).click()
  await expect(page).toHaveURL(/from=2026-07-24/)
  await expect(page).toHaveURL(/to=2026-07-24/)
  await page.getByRole("button", { name: "Últimos 7 dias" }).click()
  await expect(page).toHaveURL(/from=2026-07-18/)
  await expect(page).toHaveURL(/to=2026-07-24/)
  await page.getByRole("button", { name: "Personalizado" }).click()
  await expect(page.getByLabel("Data inicial")).toBeVisible()
  await selectReportDate(page, "Data inicial", "quinta-feira, 9 de julho de 2026")
  await selectReportDate(page, "Data final", "sexta-feira, 17 de julho de 2026")
  await expect(page).toHaveURL(/from=2026-07-09/)
  await expect(page).toHaveURL(/to=2026-07-17/)
  await expect(page.getByRole("button", { name: "Personalizado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await page.getByRole("button", { name: "Este mês" }).click()

  await page.getByRole("button", { name: "Profissional" }).click()
  await page.getByRole("menuitemradio", { name: "Ana Clara" }).click()
  await page.getByRole("button", { name: "Serviço" }).click()
  await page.getByRole("menuitemradio", { name: "Corte simples" }).click()
  await page.getByRole("button", { name: "Pagamento" }).click()
  await page.getByRole("menuitemradio", { name: "Pix" }).click()

  await expect(page).toHaveURL(/professional=professional-ana/)
  await expect(page).toHaveURL(/service=service-simple-cut/)
  await expect(page).toHaveURL(/paymentMethod=pix/)
  await page.reload()
  await expect(page.getByRole("button", { name: "Profissional: Ana Clara" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Serviço: Corte simples" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Pagamento: Pix" })).toBeVisible()

  await page.getByRole("button", { name: "Limpar todos os filtros dos relatórios" }).click()
  await expect(page).not.toHaveURL(/professional=/)
  await expect(page).not.toHaveURL(/service=/)
  await expect(page).not.toHaveURL(/paymentMethod=/)
})

test("normalizes invalid URL state and distinguishes loading, empty, fail-next, and persistent errors", async ({
  page,
}) => {
  await page.goto(
    "/reports?from=2025-01-01&to=2026-12-31&professional=../private&paymentMethod=crypto&scenario=wrong",
  )
  await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible()
  await expect(page.getByText("Período inclusivo de 01/07/2026 a 31/07/2026.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Profissional" })).toBeVisible()

  await page.goto(reportsUrl("slow"))
  await expect(page.getByRole("status")).toContainText("Carregando relatórios")
  await expect(page.getByText("Faturamento por período", { exact: true })).toBeVisible()

  await page.goto(reportsUrl("empty"))
  await expect(page.getByRole("heading", { name: "Nenhum dado encontrado" })).toBeVisible()

  await page.goto(reportsUrl("unknown-customers"))
  await expect(page.getByText(/0 cliente\(s\) identificável\(is\)/)).toBeVisible()
  await expect(page.getByText(/4 cliente\(s\) sem chave estável/)).toBeVisible()

  await page.goto(reportsUrl("long-labels"))
  await expect(
    page.getByText("Corte simples com acabamento detalhado e consultoria de estilo").first(),
  ).toBeVisible()
  await expect(
    page.getByText("Ana Clara da Unidade Centro de Formação Profissional").first(),
  ).toBeVisible()
  await expectNoDocumentOverflow(page)

  await page.goto(reportsUrl("next-failure"))
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar os relatórios")
  await page.getByRole("button", { name: "Tentar novamente" }).click()
  await expect(page.getByText("Faturamento por período", { exact: true })).toBeVisible()

  await page.goto(reportsUrl("persistent-error"))
  await expect(page.getByRole("alert")).toContainText("não puderam ser carregados")
  await page.getByRole("button", { name: "Tentar novamente" }).click()
  await expect(page.getByRole("alert")).toContainText("não puderam ser carregados")
})

test("passes axe and captures light, dark, 320px, 200%-zoom, keyboard, and screen-reader semantics", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto(reportsUrl("edge"))
  await expect(page.getByText("Faturamento por período", { exact: true })).toBeVisible()
  await hideDevtools(page)
  await page.screenshot({
    fullPage: true,
    path: "../../docs/studio/evidence/eng-53/reports-light-1440.png",
  })

  const aria = await page.locator("#main-content").ariaSnapshot()
  expect(aria).toContain("Faturamento por período")
  expect(aria).toContain("table")
  expect(aria).toContain("Clientes novos e recorrentes")

  await focusWithTab(page, "Hoje")
  await page.keyboard.press("Tab")
  const focusedOutline = await page.evaluate(() => {
    const element = document.activeElement
    return element instanceof HTMLElement ? getComputedStyle(element).outlineStyle : "none"
  })
  expect(focusedOutline).not.toBe("none")

  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])

  await page.addInitScript(() => localStorage.setItem("triad-studio-theme", "dark"))
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.setViewportSize({ height: 720, width: 320 })
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await expect(page.getByText("Faturamento por período", { exact: true })).toBeVisible()
  await expectNoDocumentOverflow(page)
  await expectMinimumTargets(page)
  await hideDevtools(page)
  await page.screenshot({
    fullPage: true,
    path: "../../docs/studio/evidence/eng-53/reports-dark-320.png",
  })

  await page.setViewportSize({ height: 900, width: 640 })
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2"
  })
  await expectNoDocumentOverflow(page)
  await expectNoControlLabelOverflow(page, "Período dos relatórios")
  await hideDevtools(page)
  await page.screenshot({
    fullPage: true,
    path: "../../docs/studio/evidence/eng-53/reports-200-percent-zoom.png",
  })

  await page.evaluate(() => {
    document.documentElement.style.zoom = "1"
  })
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  await page.setViewportSize({ height: 720, width: 320 })
  await page.reload()
  await expect(page.getByText("Faturamento por período", { exact: true })).toBeVisible()
  await expectNoDocumentOverflow(page)
})

async function expectNoDocumentOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))
  expect(Math.max(geometry.body, geometry.root)).toBeLessThanOrEqual(geometry.viewport)
}

async function selectReportDate(page: Page, fieldLabel: string, dateName: string) {
  const trigger = page.getByLabel(fieldLabel)
  await trigger.click()
  const calendar = page.getByRole("dialog", { name: "Selecionar data" }).last()
  await expect(calendar).toBeVisible()
  await calendar.getByRole("button", { name: dateName }).click()
  await expect(calendar).toBeHidden()
}

async function expectMinimumTargets(page: Page) {
  const targets = page.locator("#main-content button:visible")
  for (let index = 0; index < (await targets.count()); index += 1) {
    const box = await targets.nth(index).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
  }
}

async function expectNoControlLabelOverflow(page: Page, groupName: string) {
  const controls = page.getByRole("group", { name: groupName }).getByRole("button")
  for (let index = 0; index < (await controls.count()); index += 1) {
    const geometry = await controls.nth(index).evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }))
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.client)
  }
}

async function focusWithTab(page: Page, accessibleName: string) {
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press("Tab")
    const name = await page.evaluate(() => {
      const element = document.activeElement
      return element instanceof HTMLElement
        ? element.getAttribute("aria-label") || element.textContent || ""
        : ""
    })
    if (name.includes(accessibleName)) return
  }
  throw new Error(`Keyboard focus did not reach ${accessibleName}.`)
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
