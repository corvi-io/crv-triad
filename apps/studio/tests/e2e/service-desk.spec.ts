import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, type Route, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await routeAuthenticatedSession(page)
  await page.clock.setFixedTime(new Date("2026-07-23T11:30:00-03:00"))
})

test("supports authenticated navigation and the scheduled coherence journey", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto("/agenda?date=2026-07-23&scenario=normal")
  const serviceDeskLink = page.getByRole("link", { name: "Atendimentos", exact: true })
  await expect(serviceDeskLink).toHaveAttribute("href", "/service-desk")
  const agendaCard = page.locator('[data-appointment-id="kanban-05"]')
  const customer = "Rafael Costa"
  await expect(agendaCard).toContainText(customer)
  await agendaCard.getByRole("button", { name: `Ações de ${customer}` }).click()
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await page.getByRole("radio", { name: "Check-in" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()
  await expect(agendaCard).toContainText("Check-in")
  await serviceDeskLink.click()
  await expect(page.getByRole("heading", { name: "Atendimentos", exact: true })).toBeVisible()
  await expect(serviceDeskLink).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Atendimentos")
  await expect(
    page.getByText(/protótipo|cenário|fixture|latência|falhar próxima|restaurar cenário/i),
  ).toHaveCount(0)

  const scheduled = page
    .locator('[data-slot="card"]')
    .filter({ hasText: customer })
    .filter({ has: page.getByRole("button", { name: "Chamar cliente" }) })
    .first()
  await expect(scheduled).toBeVisible()
  await expect(scheduled).toContainText(customer)
  await scheduled.getByRole("button", { name: "Chamar cliente" }).click()
  const called = page.locator('[data-slot="card"]').filter({ hasText: customer }).first()
  await expect(called).toContainText("Chamado")
  await called.getByRole("button", { name: "Iniciar atendimento" }).click()
  await expect(
    page.locator('[data-slot="card"]').filter({ hasText: customer }).first(),
  ).toContainText("Em atendimento")

  await page.getByRole("link", { name: "Agenda" }).click()
  await expect(page.getByText(customer).first()).toBeVisible()
  const inProgressAgendaCard = page.locator('[data-appointment-status="in-progress"]').filter({
    hasText: customer,
  })
  await expect(inProgressAgendaCard.first()).toBeVisible()

  await page.getByRole("link", { name: "Dashboard", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  const inServiceFlow = page.getByRole("button", { name: /Em atendimento/ })
  await expect(inServiceFlow).toBeVisible()
  await inServiceFlow.click()
  await expect(page).toHaveURL(/\/agenda/)
  await expect(page).toHaveURL(/status=in-progress/)

  await page.goto("/service-desk?scenario=typical")
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("service-desk-1600.png") })
})

test("adds a walk-in, validates focus, keeps PII out of URL, and requires assignment", async ({
  page,
}) => {
  await page.goto("/service-desk?scenario=empty")
  const trigger = page.getByRole("button", { name: "Adicionar à fila" }).first()
  await trigger.click()
  const drawer = page.getByRole("dialog", { name: /Atendimentos \/ Adicionar à fila/ })
  await expect(drawer).toBeVisible()
  await drawer.getByRole("button", { name: "Adicionar à fila" }).click()
  await expect(
    page.getByText("Informe o nome do cliente com pelo menos 2 caracteres."),
  ).toBeVisible()
  await expect(page.getByLabel("Nome do cliente")).toBeFocused()

  await page.getByLabel("Nome do cliente").fill("Pessoa Temporária E2E")
  await page.getByLabel("Telefone").fill("81999999999")
  await page.getByLabel("Serviço").click()
  await page.getByRole("option", { name: "Corte simples" }).click()
  await page.getByLabel("Observações").fill("Somente dado sintético temporário.")
  await drawer.getByRole("button", { name: "Adicionar à fila" }).click()
  await expect(page.getByText("Cliente adicionado à fila.")).toBeVisible()
  expect(page.url()).not.toMatch(/Pessoa|81999999999|temporário|search=/i)

  const card = page.locator('[data-slot="card"]').filter({ hasText: "Pessoa Temporária E2E" })
  await card.getByRole("button", { name: "Chamar cliente" }).click()
  await expect(card).toContainText("Chamado")
  const start = card.getByRole("button", { name: "Iniciar atendimento" })
  await expect(start).toBeDisabled()
  await card.getByRole("combobox", { name: "Profissional para Pessoa Temporária E2E" }).click()
  await page.getByRole("option", { name: "Ana Clara" }).click()
  await expect(start).toBeEnabled()
  await start.click()
  await expect(card).toContainText("Em atendimento")

  await page.getByRole("button", { name: "Adicionar à fila" }).first().click()
  await page.keyboard.press("Escape")
  await expect(trigger).toBeFocused()
})

test("keeps exact filtered counts and deterministic loading/error/empty states", async ({
  page,
}) => {
  await page.goto("/service-desk?scenario=slow")
  await expect(page.getByRole("status", { name: "Carregando atendimentos" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Atendimentos" })).toBeVisible()

  await page.goto("/service-desk?scenario=persistent-error")
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar os atendimentos")
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible()

  await page.goto("/service-desk?scenario=empty")
  await expect(page.getByText("Fila sem atendimentos")).toBeVisible()
  await page.goto("/service-desk?scenario=typical&stage=called")
  await expect(page.getByText("Nenhum atendimento encontrado")).toBeVisible()
  await expect(page.getByText(/0 aguardando, 0 chamado\(s\) e 0 em atendimento/)).toBeVisible()

  await page.goto("/service-desk?scenario=typical&stage=invalid&professional=Nome%20Privado")
  await expect(page).not.toHaveURL(/stage=invalid|Nome%20Privado/)
  await expect(page.getByRole("heading", { name: "Atendimentos" })).toBeVisible()
})

test("passes axe and preserves themes, forced colors, reduced motion, targets, and 320px reflow", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("triad-studio-theme", "system"))
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto("/service-desk?scenario=long-wait")
  await expect(page.getByRole("heading", { name: "Atendimentos", exact: true })).toBeVisible()
  await expect(page.locator("html")).toHaveClass(/dark/)
  const geometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    root: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))
  expect(Math.max(geometry.body, geometry.root)).toBeLessThanOrEqual(geometry.viewport)
  expect(geometry.reduced).toBe(true)

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
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("service-desk-320-dark.png") })

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  await page.reload()
  await expect(page.getByRole("heading", { name: "Atendimentos", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Aguardando", exact: true })).toBeVisible()
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
