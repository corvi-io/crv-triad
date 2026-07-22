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

test("animates drawer entry and exit while preserving focus until close completes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto(setupUrl("new-business", "units"))
  await page.evaluate(() => {
    Reflect.set(window, "__setupDrawerTransitionStarted", false)
    document.addEventListener(
      "transitionrun",
      (event) => {
        if ((event.target as HTMLElement).dataset.slot === "sheet-content")
          Reflect.set(window, "__setupDrawerTransitionStarted", true)
      },
      { capture: true },
    )
  })
  const trigger = page.getByRole("button", { name: "Nova unidade" }).first()
  await trigger.click()
  const drawer = page.locator('[data-slot="sheet-content"]')
  await expect(drawer).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__setupDrawerTransitionStarted")))
    .toBe(true)
  expect(await drawer.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
    "0.2s",
  )

  await page.getByRole("button", { name: "Cancelar" }).click()
  await expect(drawer).toHaveAttribute("data-ending-style", "")
  await expect(drawer).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.reload()
  await page.evaluate(() => Reflect.set(window, "__setupDrawerTransitionStarted", false))
  const reducedTrigger = page.getByRole("button", { name: "Nova unidade" }).first()
  await reducedTrigger.click()
  const reducedDrawer = page.locator('[data-slot="sheet-content"]')
  await expect(reducedDrawer).toBeVisible()
  const reducedDuration = await reducedDrawer.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).transitionDuration),
  )
  expect(reducedDuration).toBeLessThanOrEqual(0.001)
})

test("keeps a slow scenario result isolated after switching scenarios", async ({ page }) => {
  await page.goto(setupUrl("slow", "overview"))
  await page.getByLabel("Cenário de apresentação").click()
  await page.getByRole("option", { name: "Múltiplas unidades" }).click()
  await expect(page).toHaveURL(/scenario=multi-unit/)
  await expect(page.getByText("2 unidade(s) ativa(s).")).toBeVisible()
  await expect(page.getByText("1 unidade(s) ativa(s).")).toHaveCount(0)
})

test("exposes stable relationship errors and focuses each first invalid group", async ({
  page,
}) => {
  await page.goto(setupUrl("new-business", "units"))
  await page.getByRole("button", { name: "Nova unidade" }).first().click()
  await page.getByRole("textbox", { name: "Nome *" }).fill("Unidade válida")
  await page.getByRole("button", { name: "Salvar" }).click()
  const code = page.getByLabel("Código")
  await expect(page.getByText("Informe um código curto.")).toHaveAttribute(
    "id",
    "setup-unit-form-code-error",
  )
  await expect(code).toHaveAttribute("aria-invalid", "true")
  await expect(code).toHaveAttribute("aria-describedby", "setup-unit-form-code-error")
  await expect(code).toBeFocused()

  await page.goto(setupUrl("single-unit", "services"))
  await page.getByRole("button", { name: "Novo serviço" }).click()
  await page.getByRole("textbox", { name: "Nome *" }).fill("Serviço novo")
  await page.getByLabel("Categoria").fill("Cabelo")
  await page.getByLabel("Descrição").fill("Descrição sintética válida")
  await page.getByLabel("Duração (min)").fill("")
  await page.getByLabel("Preço (R$)").fill("")
  await page.getByRole("button", { name: "Salvar" }).click()

  const duration = page.getByLabel("Duração (min)")
  await expect(page.getByText("Informe a duração em minutos.")).toHaveAttribute(
    "id",
    "setup-service-form-duration-error",
  )
  await expect(duration).toHaveAttribute("aria-invalid", "true")
  await expect(duration).toHaveAttribute("aria-describedby", "setup-service-form-duration-error")
  await expect(duration).toBeFocused()
  await duration.fill("30")
  await page.getByRole("button", { name: "Salvar" }).click()
  const price = page.getByLabel("Preço (R$)")
  await expect(page.getByText("Informe o preço do serviço.")).toHaveAttribute(
    "id",
    "setup-service-form-price-error",
  )
  await expect(price).toHaveAttribute("aria-invalid", "true")
  await expect(price).toHaveAttribute("aria-describedby", "setup-service-form-price-error")
  await expect(price).toBeFocused()
  await price.fill("40")
  await page.getByRole("button", { name: "Salvar" }).click()

  const unit = page.getByLabel("Unidade Centro")
  await expect(page.getByText("Selecione pelo menos uma unidade.")).toHaveAttribute(
    "id",
    "setup-service-form-unitIds-error",
  )
  await expect(unit).toHaveAttribute("aria-invalid", "true")
  await expect(unit).toHaveAttribute("aria-describedby", "setup-service-form-unitIds-error")
  await expect(unit).toBeFocused()

  await unit.check()
  await page.getByRole("button", { name: "Salvar" }).click()
  const professional = page.getByLabel("Profissional Alfa")
  await expect(page.getByText("Selecione pelo menos um profissional.")).toHaveAttribute(
    "id",
    "setup-service-form-professionalIds-error",
  )
  await expect(professional).toHaveAttribute("aria-invalid", "true")
  await expect(professional).toHaveAttribute(
    "aria-describedby",
    "setup-service-form-professionalIds-description setup-service-form-professionalIds-error",
  )
  await expect(professional).toBeFocused()
})

test("filters incompatible service professionals and focuses the cleared relationship", async ({
  page,
}) => {
  await page.goto(setupUrl("multi-unit", "services"))
  await page.getByRole("button", { name: "Novo serviço" }).click()
  await page.getByRole("textbox", { name: "Nome *" }).fill("Serviço por unidade")
  await page.getByLabel("Categoria").fill("Cabelo")
  await page.getByLabel("Descrição").fill("Descrição sintética válida")
  const center = page.getByLabel("Unidade Centro")
  const riverside = page.getByLabel("Unidade Beira-Rio")
  await riverside.check()
  const bravo = page.getByLabel("Profissional Bravo")
  await bravo.check()
  await center.check()
  await riverside.uncheck()
  await expect(bravo).toHaveCount(0)
  await page.getByRole("button", { name: "Salvar" }).click()
  const alpha = page.getByLabel("Profissional Alfa")
  await expect(page.getByText("Selecione pelo menos um profissional.")).toHaveAttribute(
    "id",
    "setup-service-form-professionalIds-error",
  )
  await expect(alpha).toHaveAttribute("aria-invalid", "true")
  await expect(alpha).toHaveAttribute(
    "aria-describedby",
    "setup-service-form-professionalIds-description setup-service-form-professionalIds-error",
  )
  await expect(alpha).toBeFocused()
})

test("copies weekday drafts atomically and blocks archiving a linked service", async ({ page }) => {
  await page.goto(setupUrl("next-failure", "availability"))
  const monday = page.getByRole("group", { name: "Segunda-feira" })
  const tuesday = page.getByRole("group", { name: "Terça-feira" })
  const wednesday = page.getByRole("group", { name: "Quarta-feira" })
  await monday.getByLabel("Início").first().fill("10:00")
  await wednesday.getByLabel("Início").first().fill("11:00")
  await monday.getByRole("button", { name: "Copiar para dias úteis" }).click()
  await expect(tuesday.getByLabel("Início").first()).toHaveValue("09:00")
  await expect(page.getByText(/Intentional development failure/)).toBeVisible()
  await monday.getByRole("button", { name: "Copiar para dias úteis" }).click()
  await expect(tuesday.getByLabel("Início").first()).toHaveValue("10:00")
  await expect(wednesday.getByLabel("Início").first()).toHaveValue("11:00")

  await page.goto(setupUrl("single-unit", "services"))
  const serviceRow = page.getByRole("row", { name: /Corte clássico/ })
  await serviceRow.focus()
  await page.keyboard.press("Shift+F10")
  await page.getByRole("menuitem", { name: "Arquivar" }).click()
  await page.getByRole("button", { name: "Arquivar" }).click()
  await expect(page.getByText(/ainda possui vínculos ativos/)).toBeVisible()
  await expect(serviceRow).toContainText("Ativo")
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
  await page.getByLabel("Profissional").click()
  await page.getByRole("option", { name: "Profissional Bravo" }).click()
  await expect(page.getByRole("group", { name: "Segunda-feira" })).toBeVisible()
  await expect(page.getByRole("alert")).toHaveCount(0)
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
