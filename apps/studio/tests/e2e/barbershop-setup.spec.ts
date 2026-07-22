import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const setupUrl = (scenario = "single-unit", section = "overview") =>
  `/workspace-preview/barbershop-setup?scenario=${scenario}&section=${section}`

test("shares stable sections, renders the complete overview, and passes focused axe", async ({
  page,
}) => {
  await page.goto(setupUrl())
  await expect(page.getByRole("heading", { name: "Configuração da barbearia" })).toBeVisible()
  await expect(page.getByText("4 de 4 etapas visuais completas.")).toBeVisible()
  await page.getByRole("button", { name: "Serviços" }).click()
  await expect(page).toHaveURL(/section=services/)
  await expect(page.getByRole("table", { name: "Serviços da configuração" })).toBeVisible()
  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("creates a unit in memory and restores the scenario atomically", async ({ page }) => {
  await page.goto(setupUrl("new-business", "units"))
  await expect(page.getByText("Nenhuma unidade configurada")).toBeVisible()
  await page.getByRole("button", { name: "Nova unidade" }).first().click()
  await page.getByRole("textbox", { name: "Nome *" }).fill("Unidade Temporária")
  await page.getByLabel("Código").fill("TMP")
  await page.getByLabel("Endereço").fill("Rua Sintética, 10")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Registro criado.")).toBeVisible()
  await expect(page.getByText("Unidade Temporária")).toBeVisible()

  await page.getByRole("button", { name: "Restaurar cenário" }).click()
  await page.getByRole("button", { name: "Restaurar cenário" }).click()
  await expect(page.getByText("Cenário restaurado por completo.")).toBeVisible()
  await expect(page.getByText("Nenhuma unidade configurada")).toBeVisible()
  await expect(page.getByText("Unidade Temporária")).toHaveCount(0)
})

test("recovers from the one-shot mutation failure without losing the form draft", async ({
  page,
}) => {
  await page.goto(setupUrl("next-failure", "units"))
  const row = page.getByRole("row", { name: /Unidade Centro/ })
  await row.focus()
  await page.keyboard.press("Shift+F10")
  await page.getByRole("menuitem", { name: "Editar" }).click()
  await page.getByRole("textbox", { name: "Nome *" }).fill("Unidade Centro revisada")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText(/Intentional development failure/)).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Nome *" })).toHaveValue("Unidade Centro revisada")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Registro atualizado.")).toBeVisible()
  await expect(page.getByText("Unidade Centro revisada")).toBeVisible()
})

test("shows persistent load recovery and explicit availability conflicts", async ({ page }) => {
  await page.goto(setupUrl("persistent-error", "professionals"))
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar profissionais")
  await page.getByRole("button", { name: "Tentar novamente" }).click()
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar profissionais")

  await page.getByLabel("Cenário de apresentação").click()
  await page.getByRole("option", { name: "Conflitos de disponibilidade" }).click()
  await page.getByRole("button", { name: "Disponibilidade" }).click()
  await expect(page.getByRole("alert")).toContainText("pausa fora do período de trabalho")
  await expect(page.getByRole("button", { name: "Copiar para dias úteis" }).first()).toBeVisible()
})

test("supports 320px reflow, keyboard focus, dark theme, and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.goto(setupUrl("dense-catalogs", "services"))
  await expect(page.getByRole("table", { name: "Serviços da configuração" })).toBeVisible()
  const sectionButton = page.getByRole("button", { name: "Disponibilidade" })
  await sectionButton.focus()
  await expect(sectionButton).toBeFocused()
  const metrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    dark: document.documentElement.classList.contains("dark"),
  }))
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth)
  expect(metrics.reduced).toBe(true)
  expect(metrics.dark).toBe(true)
})
