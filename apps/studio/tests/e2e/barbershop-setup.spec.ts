import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, type Route, test } from "@playwright/test"

const setupUrl = (scenario = "single-unit", section = "overview") =>
  `/barbershop-setup?scenario=${scenario}&section=${section}`

test.beforeEach(async ({ page }) => routeAuthenticatedSession(page))

test("enters through normal desktop, collapsed, and mobile navigation without preview chrome", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/overview")

  const setupLink = page.getByRole("link", { name: "Barbearia" })
  await expect(setupLink).toHaveAttribute("href", "/barbershop-setup")
  await setupLink.click()
  await expect(page).toHaveURL(/\/barbershop-setup/)
  await expect(page.getByRole("heading", { name: "Configuração da barbearia" })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
    "Configuração da barbearia",
  )
  await expect(setupLink).toHaveAttribute("aria-current", "page")
  await expect(page.getByLabel("Cenário de apresentação")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Restaurar cenário" })).toHaveCount(0)
  await expect(page.getByText(/protótipo|pré-visualização|ferramenta exclusiva/i)).toHaveCount(0)

  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  const trigger = page.getByRole("button", { name: "Alternar menu de navegação" })
  await trigger.click()
  await expect(sidebar).toHaveAttribute("data-state", "collapsed")
  await expect(setupLink).toHaveAttribute("aria-current", "page")

  await page.setViewportSize({ width: 375, height: 812 })
  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "Navegação do TRIAD Studio" })
  await expect(dialog.getByRole("link", { name: "Barbearia" })).toHaveAttribute(
    "aria-current",
    "page",
  )
})

test("keeps the removed setup preview route inaccessible", async ({ page }) => {
  await page.goto("/workspace-preview/barbershop-setup?scenario=single-unit&section=overview")
  await expect(page.getByRole("heading", { name: "Configuração da barbearia" })).toHaveCount(0)
  await expect(page.getByLabel("Cenário de apresentação")).toHaveCount(0)
})

test("shares stable sections, renders the complete overview, and passes focused axe", async ({
  page,
}) => {
  await page.goto(setupUrl())
  await expect(page.getByRole("heading", { name: "Configuração da barbearia" })).toBeVisible()
  await expect(page.getByText("4 de 4 etapas completas.")).toBeVisible()
  await page.getByRole("button", { name: "Serviços" }).click()
  await expect(page).toHaveURL(/section=services/)
  await expect(page.getByRole("table", { name: "Serviços da configuração" })).toBeVisible()
  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("creates a unit in memory and starts clean after a reload", async ({ page }) => {
  await page.goto(setupUrl("new-business", "units"))
  await expect(page.getByText("Nenhuma unidade configurada")).toBeVisible()
  await page.getByRole("button", { name: "Nova unidade" }).first().click()
  await page.getByRole("textbox", { name: "Nome *" }).fill("Unidade Temporária")
  await page.getByLabel("Código").fill("TMP")
  await page.getByLabel("Endereço").fill("Rua Sintética, 10")
  await page.getByRole("button", { name: "Salvar" }).click()
  await expect(page.getByText("Registro criado.")).toBeVisible()
  await expect(page.getByText("Unidade Temporária")).toBeVisible()

  await page.reload()
  await expect(page.getByText("Nenhuma unidade configurada")).toBeVisible()
  await expect(page.getByText("Unidade Temporária")).toHaveCount(0)
})

test("animates drawer entry and exit while preserving focus until close completes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto(setupUrl("new-business", "units"))
  await installDrawerTrace(page)
  const trigger = page.getByRole("button", { name: "Nova unidade" }).first()
  await expect(page.locator('[data-slot="sheet-content"]')).toHaveCount(0)
  await trigger.click()
  const drawer = page.locator('[data-slot="sheet-content"]')
  await expect(drawer).toBeVisible()
  await expect.poll(() => hasDrawerTransition(page, "transitionrun", "translate")).toBe(true)
  const entryTrace = await drawerTrace(page)
  const mount = entryTrace.find(({ phase }) => phase === "mount")
  expect(mount).toMatchObject({ starting: true, opacity: "1", transitionDuration: "0.2s" })
  expect(mount?.translate).toBe("100%")
  await expect
    .poll(() => drawer.evaluate((element) => getComputedStyle(element).translate))
    .toBe("none")

  await installDrawerTrace(page)
  await page.getByRole("button", { name: "Cancelar" }).click()
  await expect(drawer).toHaveAttribute("data-ending-style", "")
  await expect.poll(() => hasDrawerTransition(page, "transitionrun", "translate")).toBe(true)
  await expect(drawer).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.reload()
  await installDrawerTrace(page)
  const reducedTrigger = page.getByRole("button", { name: "Nova unidade" }).first()
  await reducedTrigger.click()
  const reducedDrawer = page.locator('[data-slot="sheet-content"]')
  await expect(reducedDrawer).toBeVisible()
  const reducedMount = (await drawerTrace(page)).find(({ phase }) => phase === "mount")
  expect(reducedMount?.translate).toBe("100%")
  const reducedDuration = await reducedDrawer.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).transitionDuration),
  )
  expect(reducedDuration).toBeLessThanOrEqual(0.001)
  await page.waitForTimeout(50)
  expect(await hasDrawerTransition(page, "transitionrun", "translate")).toBe(false)
  await page.getByRole("button", { name: "Cancelar" }).click()
  await expect(reducedDrawer).toHaveCount(0)
  await expect(reducedTrigger).toBeFocused()
})

test("opens the useful single-unit source by default", async ({ page }) => {
  await page.goto("/barbershop-setup?section=overview")
  await expect(page).toHaveURL(/section=overview/)
  await expect(page.getByText("1 unidade(s) ativa(s).")).toBeVisible()
  await expect(page.getByText("4 de 4 etapas completas.")).toBeVisible()
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
  await expect(page.getByText("Não foi possível concluir a ação. Tente novamente.")).toBeVisible()
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
  await expect(page.getByText("Não foi possível concluir a ação. Tente novamente.")).toBeVisible()
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

  await page.goto(setupUrl("availability-conflicts", "availability"))
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

type DrawerTrace = {
  opacity: string
  phase: string
  propertyName: string | null
  starting: boolean
  transitionDuration: string
  translate: string
  width: number
}

async function installDrawerTrace(page: Page) {
  await page.evaluate(() => {
    const trace: DrawerTrace[] = []
    Reflect.set(window, "__setupDrawerTrace", trace)
    const capture = (phase: string, element: HTMLElement, propertyName: string | null = null) => {
      const style = getComputedStyle(element)
      trace.push({
        opacity: style.opacity,
        phase,
        propertyName,
        starting: element.hasAttribute("data-starting-style"),
        transitionDuration: style.transitionDuration,
        translate: style.translate,
        width: element.getBoundingClientRect().width,
      })
    }
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          const element = node.matches('[data-slot="sheet-content"]')
            ? node
            : node.querySelector<HTMLElement>('[data-slot="sheet-content"]')
          if (element) capture("mount", element)
        }
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    for (const eventName of ["transitionrun", "transitionstart", "transitionend"]) {
      document.addEventListener(
        eventName,
        (event) => {
          if (
            event instanceof TransitionEvent &&
            event.target instanceof HTMLElement &&
            event.target.matches('[data-slot="sheet-content"]')
          )
            capture(eventName, event.target, event.propertyName)
        },
        { capture: true },
      )
    }
  })
}

async function drawerTrace(page: Page) {
  return page.evaluate(() => Reflect.get(window, "__setupDrawerTrace") as DrawerTrace[])
}

async function hasDrawerTransition(page: Page, phase: string, propertyName: string) {
  return page.evaluate(
    ({ phase, propertyName }) =>
      (Reflect.get(window, "__setupDrawerTrace") as DrawerTrace[]).some(
        (entry) => entry.phase === phase && entry.propertyName === propertyName,
      ),
    { phase, propertyName },
  )
}
