import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, type Route, test } from "@playwright/test"

const clientsUrl = (scenario = "typical") => `/clients?scenario=${scenario}`

test.beforeEach(async ({ page }) => routeAuthenticatedSession(page))

test("uses authenticated expanded, collapsed, and mobile navigation without harness chrome", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/overview")
  const link = page.getByRole("link", { name: "Clientes" })
  await expect(link).toHaveAttribute("href", "/clients")
  await link.click()
  await expect(page).toHaveURL(/\/clients/)
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible()
  await expect(link).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Clientes")
  await expect(
    page.getByText(/protótipo|cenário|fixture|latência|falhar próxima|restaurar cenário/i),
  ).toHaveCount(0)

  const trigger = page.getByRole("button", { name: "Alternar menu de navegação" })
  await trigger.click()
  await expect(page.locator('[data-slot="sidebar"][data-state]')).toHaveAttribute(
    "data-state",
    "collapsed",
  )
  await expect(link).toHaveAttribute("aria-current", "page")

  await page.setViewportSize({ width: 375, height: 812 })
  await trigger.click()
  const mobile = page.getByRole("dialog", { name: "Navegação do TRIAD Studio" })
  await expect(mobile.getByRole("link", { name: "Clientes" })).toHaveAttribute(
    "aria-current",
    "page",
  )
})

test("covers directory scenarios, safe URL state, keyboard row actions, and duplicate inspection", async ({
  page,
}) => {
  await page.goto(clientsUrl("empty"))
  await expect(page.getByText("Nenhum cliente cadastrado")).toBeVisible()
  await page.goto(clientsUrl("dense"))
  await expect(page.getByRole("table", { name: "Diretório de clientes" })).toBeVisible()
  await expect(page.getByText("Página 1 de 9")).toBeVisible()
  const search = page.getByPlaceholder("Buscar por nome, telefone ou e-mail")
  await search.fill("Cliente Sintético 86")
  await expect(page.getByRole("button", { name: "Cliente Sintético 86" })).toBeVisible()
  await expect(page).not.toHaveURL(/Cliente|search|email|phone/i)

  const row = page
    .getByRole("button", { name: "Cliente Sintético 86" })
    .locator("xpath=ancestor::tr")
  await row.press("Shift+F10")
  await expect(page.getByRole("menuitem", { name: "Visualizar" })).toBeVisible()
  const archiveItem = page.getByRole("menuitem", { name: "Arquivar" })
  await archiveItem.focus()
  await page.keyboard.press("Enter")
  const archiveDialog = page.getByRole("dialog", { name: "Arquivar cliente?" })
  await expect(archiveDialog).toBeVisible()
  await archiveDialog.getByRole("button", { name: "Cancelar" }).click()
  await expect(archiveDialog).toHaveCount(0)

  await page.getByRole("button", { name: "Cadastro" }).click()
  await expect(page).toHaveURL(/sortField=createdAt/)

  await page.goto(clientsUrl("duplicate-candidates"))
  await page.getByRole("button", { name: "Cliente Sintético Duplicado A" }).click()
  await expect(page.getByRole("heading", { name: "Possíveis duplicidades" })).toBeVisible()
  await expect(page.getByText("Nenhum registro será mesclado.")).toBeVisible()
  await page.getByRole("button", { name: /Mesmo telefone: Cliente Sintético Duplicado B/ }).click()
  await expect(page.getByText("Cliente Sintético Duplicado B").first()).toBeVisible()
  await expect(page.getByRole("button", { name: /mesclar/i })).toHaveCount(0)
})

test("creates, validates, edits, archives, restores, manages notes, and reloads cleanly", async ({
  page,
}) => {
  await page.goto(clientsUrl("empty"))
  const createTrigger = page.getByRole("button", { name: "Novo cliente" })
  await createTrigger.click()
  await page.getByRole("button", { name: "Salvar" }).last().click()
  await expect(page.getByText("Informe o nome do cliente.")).toBeVisible()
  await expect(page.getByLabel("Nome")).toBeFocused()
  await page.getByLabel("Nome").fill("Cliente Sintético Temporário")
  await page.getByLabel("E-mail").fill("temporario@example.invalid")
  await page.getByRole("button", { name: "Salvar" }).last().click()
  await expect(page.getByText("Cliente criado.")).toBeVisible()
  await expect(page.getByText("Cliente Sintético Temporário").first()).toBeVisible()

  await page.getByRole("button", { name: "Editar" }).click()
  await page.getByLabel("Nome").fill("Cliente Sintético Revisado")
  await page.getByRole("button", { name: "Salvar" }).last().click()
  await expect(page.getByText("Cliente atualizado.")).toBeVisible()
  await page.getByRole("tab", { name: "Notas" }).click()
  await page.getByLabel("Nova nota").fill("Nota sintética temporária.")
  await page.getByRole("button", { name: "Adicionar nota" }).click()
  await expect(page.getByText("Nota adicionada.")).toBeVisible()
  const note = page.getByText("Nota sintética temporária.").locator("xpath=ancestor::article")
  await expect(note).toBeVisible()
  await note.getByRole("button", { name: "Editar" }).click()
  await page.getByLabel("Editar nota").fill("Nota sintética revisada.")
  await page.getByRole("button", { name: "Salvar nota" }).click()
  await expect(page.getByText("Nota atualizada.")).toBeVisible()
  await page.getByRole("button", { name: "Remover" }).click()
  await page.getByRole("button", { name: "Remover" }).last().click()
  await expect(page.getByText("Nota removida.")).toBeVisible()
  await page.getByRole("tab", { name: "Resumo" }).click()
  await page.getByRole("button", { name: "Arquivar" }).click()
  await page.getByRole("button", { name: "Arquivar" }).last().click()
  await expect(page.getByText("Cliente arquivado.")).toBeVisible()
  await expect(page.getByRole("dialog", { name: "Arquivar cliente?" })).toHaveCount(0)
  await page
    .getByRole("dialog", { name: /Clientes \/ Cliente Sintético/ })
    .getByRole("button", { name: "Restaurar" })
    .click()
  await page.getByRole("button", { name: "Restaurar" }).last().click()
  await expect(page.getByText("Cliente restaurado.")).toBeVisible()

  await page.reload()
  await expect(page.getByText("Nenhum cliente cadastrado")).toBeVisible()
  await expect(page.getByText("Cliente Sintético Revisado")).toHaveCount(0)
})

test("passes axe and preserves dark, reduced-motion, 320px reflow, focus return, and bounded overflow", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto(clientsUrl("dense"))
  const trigger = page.getByRole("button", { name: "Cliente Sintético 01" })
  await trigger.click()
  await expect(page.getByRole("tab", { name: "Resumo" })).toBeVisible()
  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    dark: document.documentElement.classList.contains("dark"),
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    viewportWidth: window.innerWidth,
  }))
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth)
  expect(metrics.dark).toBe(true)
  expect(metrics.reduced).toBe(true)
  const drawer = page.locator('[data-slot="sheet-content"]')
  const drawerMetrics = await drawer.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    transitionDuration: Number.parseFloat(getComputedStyle(element).transitionDuration),
  }))
  expect(drawerMetrics.scrollWidth).toBeLessThanOrEqual(drawerMetrics.clientWidth + 1)
  expect(drawerMetrics.transitionDuration).toBeLessThanOrEqual(0.001)
  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
  await page.getByRole("button", { name: "Fechar" }).click()
  await expect(trigger).toBeFocused()
  const tableViewport = page.locator('[data-slot="data-table"] [data-slot="scroll-area-viewport"]')
  await expect
    .poll(() => tableViewport.evaluate((element) => element.scrollWidth > element.clientWidth))
    .toBe(true)
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
