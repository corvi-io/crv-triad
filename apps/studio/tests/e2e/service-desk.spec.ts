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

test("fulfills a service and hands it off as ready for payment", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/service-desk?scenario=empty")
  await page.getByRole("button", { name: "Adicionar à fila" }).first().click()
  const drawer = page.getByRole("dialog", { name: /Atendimentos \/ Adicionar à fila/ })
  await page.getByLabel("Nome do cliente").fill("Pessoa Fulfillment")
  await page.getByLabel("Serviço").click()
  await page.getByRole("option", { name: "Corte simples" }).click()
  await drawer.getByRole("button", { name: "Adicionar à fila" }).click()
  const card = page.locator('[data-slot="card"]').filter({ hasText: "Pessoa Fulfillment" })
  await card.getByRole("button", { name: "Chamar cliente" }).click()
  await card.getByRole("combobox", { name: "Profissional para Pessoa Fulfillment" }).click()
  await page.getByRole("option", { name: "Ana Clara" }).click()
  await card.getByRole("button", { name: "Iniciar atendimento" }).click()
  await card.getByRole("button", { name: "Abrir atendimento" }).click()
  await expect(page).toHaveURL(/\/service-desk\/session-/)
  await expect(page.getByRole("heading", { name: "Serviços realizados" })).toBeVisible()
  await page.getByLabel("Serviço", { exact: true }).click()
  await page.getByRole("option", { name: "Corte degradê" }).click()
  await page.getByLabel("Profissional responsável").last().click()
  await page.getByRole("option", { name: "Bruno Rocha" }).click()
  await page.getByRole("button", { name: "Adicionar serviço" }).click()
  await expect(page.getByText("Serviço adicionado.")).toBeVisible()
  const addedService = page.locator('[data-slot="card"]').filter({ hasText: "Corte degradê" })
  await addedService.getByRole("combobox", { name: "Profissional responsável" }).click()
  await page.getByRole("option", { name: "Ana Clara" }).click()
  await expect(page.getByText("Profissional atualizado.")).toBeVisible()
  await addedService.getByRole("button", { name: "Remover serviço" }).click()
  await expect(page.getByText("Serviço removido.")).toBeVisible()
  await expect(addedService).toHaveCount(0)
  await page.getByLabel("Serviço", { exact: true }).click()
  await page.getByRole("option", { name: "Corte degradê" }).click()
  await page.getByLabel("Profissional responsável").last().click()
  await page.getByRole("option", { name: "Bruno Rocha" }).click()
  await page.getByRole("button", { name: "Adicionar serviço" }).click()
  await page.getByRole("button", { name: "Voltar para atendimentos" }).click()
  await expect(page).toHaveURL(/scenario=empty/)
  await expect(page.getByText("Pessoa Fulfillment")).toBeVisible()
  await card.getByRole("button", { name: "Abrir atendimento" }).click()
  await page.getByLabel("Observações").fill("Registro operacional sem dados sensíveis.")
  await page.getByRole("button", { name: "Salvar observações" }).click()
  await expect(page.getByText("Observações atualizadas.")).toBeVisible()
  await page.getByRole("button", { name: "Finalizar atendimento" }).click()
  const confirmation = page.getByRole("dialog", { name: "Finalizar atendimento?" })
  await confirmation.getByRole("button", { name: "Finalizar atendimento" }).click()
  await expect(page.getByText("Pronto para pagamento").first()).toBeVisible()
  expect(page.url()).not.toContain("Registro")
  await page.screenshot({ fullPage: true, path: testInfo.outputPath("service-session-1440.png") })
})

test("reloads deterministic fulfillment scenarios with exact truth claims", async ({ page }) => {
  const scenarios = [
    ["fulfillment-single", "Serviço inicial"],
    ["fulfillment-multiple", "Serviço adicionado"],
    ["fulfillment-multi-professional", "Bruno Rocha"],
    ["fulfillment-long-running", "4 h 30 min"],
    ["fulfillment-long-labels", "Observação sintética extensa"],
    ["fulfillment-no-eligible", "Escolha um profissional"],
    ["fulfillment-ready", "Pronto para pagamento"],
  ] as const
  for (const [scenario, truth] of scenarios) {
    await page.goto(`/service-desk/session-walk-in-${scenario}?scenario=${scenario}`)
    await expect(page.getByText(truth).first()).toBeVisible()
  }
  await page.reload()
  await expect(page.getByText("Pronto para pagamento").first()).toBeVisible()
  await expect(
    page.getByText("O serviço foi finalizado. Revise a comanda para registrar o pagamento."),
  ).toBeVisible()
})

test("preserves removed fixture items and edited notes across board round trips", async ({
  page,
}) => {
  await page.goto(
    "/service-desk/session-walk-in-fulfillment-multiple?scenario=fulfillment-multiple",
  )
  const addedService = page.locator('[data-slot="card"]').filter({ hasText: "Serviço adicionado" })
  await addedService.getByRole("button", { name: "Remover serviço" }).click()
  await expect(addedService).toHaveCount(0)
  await page.getByRole("button", { name: "Voltar para atendimentos" }).click()
  const multipleCard = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Pessoa Múltiplos Serviços" })
  await multipleCard.getByRole("button", { name: "Abrir atendimento" }).click()
  await expect(page.getByText("Serviço adicionado")).toHaveCount(0)

  await page.goto(
    "/service-desk/session-walk-in-fulfillment-long-labels?scenario=fulfillment-long-labels",
  )
  const notes = "Observação editada sem dados pessoais."
  await page.getByLabel("Observações").fill(notes)
  await page.getByRole("button", { name: "Salvar observações" }).click()
  await expect(page.getByText("Observações atualizadas.")).toBeVisible()
  await page.getByRole("button", { name: "Voltar para atendimentos" }).click()
  const longLabelsCard = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Pessoa Com Nome Sintético Deliberadamente Longo" })
  await longLabelsCard.getByRole("button", { name: "Abrir atendimento" }).click()
  await expect(page.getByLabel("Observações")).toHaveValue(notes)
  await expect(page.getByLabel("Observações")).not.toHaveValue(/Observação sintética extensa/)
})

test("canonicalizes raw child-route search to allowlisted technical filters", async ({ page }) => {
  await page.goto(
    "/service-desk/session-walk-in-fulfillment-single?scenario=fulfillment-single&stage=in-service&unit=artesao&professional=Maria&name=Nome%20Privado&notes=Texto%20privado",
  )
  await expect(page.getByRole("heading", { name: "Serviços realizados" })).toBeVisible()
  await expect
    .poll(() => {
      const url = new URL(page.url())
      return {
        keys: [...url.searchParams.keys()].sort(),
        professional: url.searchParams.get("professional"),
        scenario: url.searchParams.get("scenario"),
        stage: url.searchParams.get("stage"),
        unit: url.searchParams.get("unit"),
      }
    })
    .toEqual({
      keys: ["preference", "priority", "professional", "scenario", "stage", "unit"],
      professional: "all",
      scenario: "fulfillment-single",
      stage: "in-service",
      unit: "artesao",
    })
  expect(page.url()).not.toMatch(/Maria|Nome%20Privado|Texto%20privado|name=|notes=/i)
})

test("keeps the session accessible at a 320px zoom-equivalent viewport and restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.emulateMedia({ colorScheme: "dark", forcedColors: "active", reducedMotion: "reduce" })
  await page.goto("/service-desk/session-walk-in-fulfillment-single?scenario=fulfillment-single")
  const finish = page.locator("#main-content").getByRole("button", {
    name: "Finalizar atendimento",
  })
  await finish.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog", { name: "Finalizar atendimento?" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(finish).toBeFocused()
  const geometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    root: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))
  expect(Math.max(geometry.body, geometry.root)).toBeLessThanOrEqual(geometry.viewport)
  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
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
  await expect(
    page.getByText(/0 aguardando, 0 chamado\(s\), 0 em atendimento e 0 pronto\(s\)/),
  ).toBeVisible()

  await page.goto("/service-desk?scenario=typical&stage=invalid&professional=Nome%20Privado")
  await expect(page).not.toHaveURL(/stage=invalid|Nome%20Privado/)
  await expect(page.getByRole("heading", { name: "Atendimentos" })).toBeVisible()
})

test("keeps projected appointment card borders inside the queue scroller at 618px", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.setViewportSize({ height: 1088, width: 618 })
  await page.goto("/service-desk?scenario=typical")

  const card = page.locator('[data-slot="card"]').filter({ hasText: "Juliana Costa" }).first()
  await expect(card).toBeVisible()
  const geometry = await card.evaluate((element) => {
    const scroller = element.parentElement
    if (!scroller) throw new Error("Queue card scroller was not rendered.")

    const cardBounds = element.getBoundingClientRect()
    const scrollerBounds = scroller.getBoundingClientRect()
    return {
      bottom: scrollerBounds.bottom - cardBounds.bottom,
      boxShadow: getComputedStyle(element).boxShadow,
      left: cardBounds.left - scrollerBounds.left,
      right: scrollerBounds.right - cardBounds.right,
      top: cardBounds.top - scrollerBounds.top,
    }
  })

  expect(geometry.boxShadow).toContain("inset")
  expect(geometry.left).toBeGreaterThanOrEqual(0)
  expect(geometry.right).toBeGreaterThanOrEqual(0)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeGreaterThanOrEqual(0)
  await page.screenshot({
    path: testInfo.outputPath("service-desk-projected-appointment-borders-618-dark.png"),
  })
})

test("groups development scenarios in the service-desk filter toolbar", async ({ page }) => {
  await page.goto("/service-desk?scenario=typical")
  const productControls = page.getByRole("group", { name: "Busca e filtros de atendimentos" })
  const trigger = productControls.getByRole("button", { name: "Cenários de desenvolvimento" })
  await expect(trigger).toBeVisible()
  await trigger.click()
  const launcher = page.getByRole("menu", { name: "Cenários de desenvolvimento" })
  await expect(launcher.getByRole("group", { name: /Fila/ })).toBeVisible()
  await expect(launcher.getByRole("group", { name: "Confiabilidade" })).toBeVisible()
  await expect(launcher.getByRole("group", { name: "Execução" })).toBeVisible()
  await expect(launcher.getByRole("group", { name: "Checkout" })).toBeVisible()
  await launcher.getByRole("menuitemradio", { name: /Vazio/ }).click()
  await expect(page).toHaveURL(/scenario=empty/)
  await expect(page.getByText("Fila sem atendimentos")).toBeVisible()
})

test("keeps dense queue cards at their full height in the desktop scroller", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.setViewportSize({ height: 1200, width: 2048 })
  await page.goto("/service-desk?scenario=dense")

  const column = page.getByRole("region", { name: "Aguardando" })
  const cards = column.locator('[data-slot="card"]')
  await expect(cards).toHaveCount(21)
  const geometry = await cards.evaluateAll((elements) =>
    elements.map((element) => ({
      border: getComputedStyle(element).boxShadow,
      height: element.getBoundingClientRect().height,
      overflow: getComputedStyle(element).overflow,
    })),
  )

  for (const card of geometry) {
    expect(card.height).toBeGreaterThanOrEqual(180)
    expect(card.border).toContain("inset")
    expect(card.overflow).toBe("hidden")
  }
  await page.screenshot({
    path: testInfo.outputPath("service-desk-dense-card-heights-2048-dark.png"),
  })
})

test("opens checkout directly from a ready-for-payment card and keeps columns independently scrollable", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/service-desk?scenario=fulfillment-ready")
  await page
    .getByRole("region", { name: "Pronto para pagamento" })
    .getByRole("button", { name: "Receber pagamento" })
    .first()
    .click()
  await expect(page).toHaveURL(/\/service-desk\/session-.*\/checkout/)
  await expect(page.getByRole("heading", { name: "Pagamento" })).toBeVisible()

  await page.goto("/service-desk?scenario=dense")
  await expect(page.getByText(/Maior espera visível/)).toHaveCount(0)
  const columns = page.locator(
    '[aria-label="Etapas da fila de atendimento"] [data-slot="scroll-area"]',
  )
  await expect(columns).toHaveCount(3)
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
