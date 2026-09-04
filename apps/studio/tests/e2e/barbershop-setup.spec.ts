import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, type Route, test } from "@playwright/test"

const setupUrl = (scenario = "single-unit", section = "overview") =>
  `/barbershop-setup?scenario=${scenario}&section=${section}&availabilityDate=2026-07-20&availabilityView=week`

test.beforeEach(async ({ page }) => routeAuthenticatedSession(page))

test("enters through normal desktop, collapsed, and mobile navigation without preview chrome", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/overview")

  await page.getByRole("button", { name: /Abrir menu de/ }).click()
  const setupLink = page.getByRole("menuitem", { name: "Configuração da barbearia" })
  await expect(setupLink).toHaveAttribute("href", /^\/barbershop-setup\?/)
  await setupLink.click()
  await expect(page).toHaveURL(/\/barbershop-setup/)
  await expect(page.getByRole("heading", { name: "Configuração da barbearia" })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
    "Configuração da barbearia",
  )
  await expect(page.getByLabel("Cenário de apresentação")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Restaurar cenário" })).toHaveCount(0)

  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  const trigger = page.getByRole("button", { name: "Alternar menu de navegação" })
  await trigger.click()
  await expect(sidebar).toHaveAttribute("data-state", "collapsed")

  await page.setViewportSize({ width: 375, height: 812 })
  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "Navegação do TRIAD Studio" })
  await dialog.getByRole("button", { name: /Abrir menu de/ }).click()
  await expect(page.getByRole("menuitem", { name: "Configuração da barbearia" })).toBeVisible()
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
  await expect(
    page.getByRole("progressbar", { name: "100% da configuração concluída" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Serviços" }).click()
  await expect(page).toHaveURL(/section=services/)
  await expect(page.getByRole("table", { name: "Serviços da configuração" })).toBeVisible()
  const tableLayout = await page.locator('[data-slot="data-table"]').evaluate((element) => {
    const header = element.querySelector("thead")
    const footer = element.querySelector('[data-slot="data-table-footer"]')
    const moduleBody = element
      .closest('[data-slot="module-layout"]')
      ?.querySelector('[data-slot="module-layout-body"]')
    const tableBounds = element.getBoundingClientRect()
    const bodyBounds = moduleBody?.getBoundingClientRect()
    return {
      height: tableBounds.height,
      headerPosition: header ? getComputedStyle(header).position : null,
      footerVisible: Boolean(footer && footer.getBoundingClientRect().height > 0),
      remainingBodySpace: bodyBounds ? Math.round(bodyBounds.bottom - tableBounds.bottom) : null,
    }
  })
  expect(tableLayout.height).toBeGreaterThan(350)
  expect(tableLayout.headerPosition).toBe("sticky")
  expect(tableLayout.footerVisible).toBe(true)
  expect(tableLayout.remainingBodySpace).not.toBeNull()
  expect(tableLayout.remainingBodySpace ?? Number.POSITIVE_INFINITY).toBeLessThan(8)
  await expect(
    page.locator(
      '[data-slot="data-table"] [data-slot="scroll-area-scrollbar"][data-orientation="vertical"]',
    ),
  ).toHaveCount(0)
  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("exposes the six-step setup facts and payment policy without claiming authorization", async ({
  page,
}) => {
  await page.goto(setupUrl())
  for (const step of [
    "Dados da barbearia",
    "Horários",
    "Profissionais",
    "Serviços",
    "Pagamentos e comissões",
    "Revisão",
  ]) {
    await expect(page.getByText(step).first()).toBeVisible()
  }

  await page.getByRole("button", { name: "Dados" }).click()
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Barbearia TRIAD")
  await page.getByRole("button", { name: "Pagamentos" }).click()
  await expect(page.getByRole("heading", { name: "Formas de pagamento" })).toBeVisible()
  await expect(page.getByRole("switch", { name: "Aceitar Pagamento misto" })).toBeChecked()
  await expect(page.getByText(/não processa pagamentos/i)).toBeVisible()
  await expect(page.getByRole("heading", { name: "Exceção por profissional" })).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: "../../docs/studio/evidence/eng-55/setup-payments-light-1440.png",
  })

  await page.getByRole("button", { name: "Profissionais" }).click()
  await page.getByRole("button", { name: "Novo profissional" }).click()
  const specialties = page.getByLabel("Especialidades")
  await expect(specialties).toBeEditable()
  await specialties.fill("Corte, Barba e acabamento")
  await expect(specialties).toHaveValue("Corte, Barba e acabamento")
  await page.getByRole("dialog", { name: "Novo profissional" }).screenshot({
    path: "../../docs/studio/evidence/eng-55/setup-professional-specialties-light-1440.png",
  })
})

test("shows and operates catalog scrollbars only for real body overflow", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 620 })
  await page.goto(setupUrl("dense-catalogs", "services"))
  const table = page.locator('[data-slot="data-table"]')
  const viewport = table.locator('[data-slot="scroll-area-viewport"]')
  await expect(page.getByRole("table", { name: "Serviços da configuração" })).toBeVisible()

  await expect
    .poll(() =>
      viewport.evaluate((element) => ({
        horizontal: element.scrollWidth > element.clientWidth + 1,
        vertical: element.scrollHeight > element.clientHeight + 1,
      })),
    )
    .toEqual({ horizontal: true, vertical: true })
  await expect(
    table.locator('[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]'),
  ).toHaveCount(1)
  await expect(
    table.locator('[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]'),
  ).toHaveCount(1)

  const before = await table.evaluate((element) => ({
    footerTop: element.querySelector('[data-slot="data-table-footer"]')?.getBoundingClientRect()
      .top,
    headerTop: element.querySelector("thead")?.getBoundingClientRect().top,
  }))
  await viewport.evaluate((element) => {
    element.scrollTop = 80
    element.scrollLeft = 80
    element.dispatchEvent(new Event("scroll"))
  })
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  const after = await table.evaluate((element) => ({
    footerTop: element.querySelector('[data-slot="data-table-footer"]')?.getBoundingClientRect()
      .top,
    headerTop: element.querySelector("thead")?.getBoundingClientRect().top,
  }))
  expect(after.headerTop).toBeCloseTo(before.headerTop ?? 0, 0)
  expect(after.footerTop).toBeCloseTo(before.footerTop ?? 0, 0)
})

test("creates a unit in memory and starts clean after a reload", async ({ page }) => {
  await page.goto(setupUrl("new-business", "units"))
  await expect(page.getByText("Nenhuma unidade configurada")).toBeVisible()
  await page.getByRole("button", { name: "Nova unidade" }).first().click()
  await page.getByRole("textbox", { name: "Nome *" }).fill("Unidade Temporária")
  await page.getByLabel("Código").fill("TMP")
  await page.getByLabel("Endereço").fill("Rua Sintética, 10")
  const operatingHours = page.getByRole("group", { name: "Período de funcionamento" })
  await expect(operatingHours.getByLabel("Início")).toHaveValue("09:00")
  await expect(operatingHours.getByLabel("Fim")).toHaveValue("18:00")
  await operatingHours.getByLabel("Início").fill("08:00")
  await operatingHours.getByLabel("Fim").fill("20:00")
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
  await expect(
    page.getByRole("progressbar", { name: "100% da configuração concluída" }),
  ).toBeVisible()
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

test("creates a recurring block atomically and blocks archiving a linked service", async ({
  page,
}) => {
  await page.goto(setupUrl("next-failure", "availability"))
  await page.getByRole("button", { name: "Adicionar bloco" }).click()
  const drawer = page.getByRole("dialog", { name: "Disponibilidade / Novo bloco" })
  await drawer.getByLabel("Tipo de bloco").click()
  await page.getByRole("option", { name: "Pausa ou bloqueio" }).click()
  await drawer.getByLabel("Início").fill("14:00")
  await drawer.getByLabel("Fim").fill("15:00")
  await drawer.getByLabel("Repetir semanalmente").click()
  for (const day of ["Ter", "Qua", "Qui", "Sex"])
    await drawer.getByText(day, { exact: true }).click()
  await drawer.getByRole("button", { name: "Salvar bloco" }).click()
  await expect(page.getByText("Não foi possível concluir a ação. Tente novamente.")).toBeVisible()
  await expect(
    page.getByRole("button", { name: /Pausa ou bloqueio, .*das 14:00 às 15:00/ }),
  ).toHaveCount(0)
  await drawer.getByRole("button", { name: "Salvar bloco" }).click()
  await expect(page.getByText("Bloco adicionado.")).toBeVisible()
  await expect(
    page.getByRole("button", { name: /Pausa ou bloqueio, .*das 14:00 às 15:00/ }),
  ).toHaveCount(5)
  await page
    .getByRole("button", {
      name: /Pausa ou bloqueio, Terça-feira, 21 de julho de 2026, das 14:00 às 15:00/,
    })
    .click()
  const editDrawer = page.getByRole("dialog", { name: "Disponibilidade / Editar bloco" })
  await expect(editDrawer.getByText("Aplicar alteração em")).toBeVisible()
  await editDrawer.getByText("Toda a recorrência", { exact: true }).click()
  await editDrawer.getByRole("button", { name: "Excluir" }).click()
  const deleteDialog = page.getByRole("dialog", { name: "Excluir toda a recorrência?" })
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole("button", { name: "Excluir" }).click()
  await expect(
    page.getByRole("button", { name: /Pausa ou bloqueio, .*das 14:00 às 15:00/ }),
  ).toHaveCount(0)

  await page.goto(setupUrl("single-unit", "services"))
  const serviceRow = page.getByRole("row", { name: /Corte clássico/ })
  await serviceRow.focus()
  await page.keyboard.press("Shift+F10")
  await page.getByRole("menuitem", { name: "Arquivar" }).click()
  await page.getByRole("button", { name: "Arquivar" }).click()
  await expect(page.getByText(/ainda possui vínculos ativos/)).toBeVisible()
  await expect(serviceRow).toContainText("Ativo")
})

test("navigates dated views and edits only one recurring occurrence", async ({ page }) => {
  await page.goto(setupUrl("single-unit", "availability"))
  await page.getByRole("button", { name: "Mês" }).click()
  await expect(page).toHaveURL(/availabilityView=month/)
  await expect(page.getByRole("button", { name: "Abrir dia 20 de julho de 2026" })).toBeVisible()

  await page.getByRole("button", { name: "Abrir dia 20 de julho de 2026" }).click()
  await expect(page).toHaveURL(/availabilityView=day/)
  await page.getByRole("button", { name: "Semana" }).click()
  const selectedOccurrence = page.getByRole("button", {
    name: /Disponível, Segunda-feira, 20 de julho de 2026, das 09:00 às 18:00/,
  })
  await selectedOccurrence.click()
  const drawer = page.getByRole("dialog", { name: "Disponibilidade / Editar bloco" })
  await expect(drawer.getByText("Somente 20 de julho de 2026")).toBeVisible()
  await drawer.getByLabel("Início").fill("10:00")
  await drawer.getByLabel("Fim").fill("17:00")
  await drawer.getByRole("button", { name: "Salvar bloco" }).click()
  await expect(selectedOccurrence).toHaveCount(0)
  const editedOccurrence = page.getByRole("button", {
    name: /Disponível, Segunda-feira, 20 de julho de 2026, das 10:00 às 17:00/,
  })
  await expect(editedOccurrence).toBeVisible()
  await expect(
    page.getByRole("button", {
      name: /Pausa ou bloqueio, Segunda-feira, 20 de julho de 2026, das 12:00 às 13:00/,
    }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Próximo período" }).click()
  await expect(page).toHaveURL(/availabilityDate=2026-07-27/)
  await expect(
    page.getByRole("button", {
      name: /Disponível, Segunda-feira, 27 de julho de 2026, das 09:00 às 18:00/,
    }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Período anterior" }).click()
  await expect(page).toHaveURL(/availabilityDate=2026-07-20/)
  await expect(selectedOccurrence).toHaveCount(0)
  await expect(editedOccurrence).toBeVisible()
})

test("selects a calendar range by dragging and preserves the keyboard alternative", async ({
  page,
}) => {
  await page.goto(setupUrl("single-unit", "availability"))
  await expect(page.getByRole("heading", { name: "Calendário de disponibilidade" })).toBeVisible()
  const accessibility = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  const sunday = page.getByRole("button", {
    name: /Adicionar período em Domingo, 26 de julho de 2026/,
  })
  await sunday.scrollIntoViewIfNeeded()
  const bounds = await sunday.boundingBox()
  expect(bounds).not.toBeNull()
  if (!bounds) return

  const x = bounds.x + bounds.width / 2
  await page.mouse.move(x, bounds.y + 56)
  await page.mouse.down()
  await page.mouse.move(x, bounds.y + 112, { steps: 4 })
  await page.mouse.up()

  const drawer = page.getByRole("dialog", { name: "Disponibilidade / Novo bloco" })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByLabel("Início")).toHaveValue("07:00")
  await expect(drawer.getByLabel("Fim")).toHaveValue("08:00")
  await drawer.getByRole("button", { name: "Cancelar" }).click()
  await expect(drawer).toHaveCount(0)

  await sunday.focus()
  await page.keyboard.press("Enter")
  const keyboardDrawer = page.getByRole("dialog", { name: "Disponibilidade / Novo bloco" })
  await expect(keyboardDrawer.getByLabel("Início")).toHaveValue("09:00")
  await expect(keyboardDrawer.getByLabel("Fim")).toHaveValue("10:00")
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
  await expect(page.getByRole("button", { name: "Adicionar bloco" })).toBeVisible()
  await page.getByLabel("Profissional").click()
  await page.getByRole("option", { name: "Profissional Bravo" }).click()
  await expect(
    page.getByRole("button", {
      name: /Disponível, Segunda-feira, 20 de julho de 2026, das 09:00 às 18:00/,
    }),
  ).toBeVisible()
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

  await sectionButton.click()
  await expect(page.getByRole("heading", { name: "Calendário de disponibilidade" })).toBeVisible()
  const calendarMetrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }))
  expect(calendarMetrics.bodyWidth).toBeLessThanOrEqual(calendarMetrics.viewportWidth)
  await page.getByRole("button", { name: "Adicionar bloco" }).focus()
  await expect(page.getByRole("button", { name: "Adicionar bloco" })).toBeFocused()
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
  await page.route("**/api/contexts", async (route) => {
    await fulfillJson(route, {
      activeOrganizationId: "tenant-setup-fixture",
      platform: null,
      status: "available",
      tenants: [
        {
          id: "tenant-setup-fixture",
          name: "Barbearia de teste",
          role: "owner",
        },
      ],
    })
  })
  await page.route("**/api/access/summary", async (route) => {
    await fulfillJson(route, {
      capabilities: [],
      organizationId: "tenant-setup-fixture",
      role: "owner",
      subscriptionState: "active",
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
