import AxeBuilder from "@axe-core/playwright"
import { expect, type Locator, test } from "@playwright/test"

const agendaUrl = (scenario = "normal") =>
  `/workspace-preview/agenda?date=2026-07-19&scenario=${scenario}`

test("renders the canonical Kanban, composes filters, retains the grid, and passes axe", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto(agendaUrl())
  await expect(page.getByRole("heading", { exact: true, name: "Agenda" })).toBeVisible()
  await expect(page.getByRole("radio", { name: "Kanban" })).toBeChecked()
  await expect(page.getByRole("radio", { name: "Grade diária" })).not.toBeChecked()
  await expect(page.getByRole("heading", { name: "Confirmados" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Check-in" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Em espera" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Em atendimento" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Finalizados" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Cancelados / No-show" })).toBeVisible()
  await expect(page.getByText("18 atendimentos visíveis")).toBeVisible()
  const desktopBoard = page.getByTestId("agenda-kanban-scroll")
  const desktopDimensions = await desktopBoard.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(desktopDimensions.scrollWidth).toBeLessThanOrEqual(desktopDimensions.clientWidth + 1)

  await page.getByRole("searchbox", { name: "Pesquisa global" }).fill("Joao")
  await expect(page.getByText("1 atendimentos visíveis")).toBeVisible()
  await expect(page.getByText("João Vitor")).toBeVisible()
  await expect(page.getByText("Pedro Henrique")).toHaveCount(0)

  await page.getByLabel("Unidade").click()
  await page.getByRole("option", { name: "Artesão" }).click()
  await expect(page).toHaveURL(/unit=artesao/)
  await expect(page.getByRole("heading", { name: "Nenhum agendamento encontrado" })).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Unidade" })).toHaveAttribute(
    "class",
    /border-primary/,
  )
  await page.getByRole("button", { name: "Limpar filtro unidade" }).click()
  await expect(page).toHaveURL(/unit=centro/)
  await expect(page.getByRole("searchbox", { name: "Pesquisa global" })).toHaveValue("Joao")
  await expect(page.getByText("1 atendimentos visíveis")).toBeVisible()
  await page.getByLabel("Período").click()
  await page.getByRole("option", { name: "Amanhã" }).click()
  await expect(page.getByRole("combobox", { name: "Período" })).toHaveAttribute(
    "class",
    /border-primary/,
  )
  await page.getByRole("button", { name: "Limpar filtros" }).first().click()
  await expect(page.getByText("18 atendimentos visíveis")).toBeVisible()
  await expect(page.getByLabel("Unidade")).toHaveText("Centro")
  await expect(page.getByLabel("Período")).toHaveText("Hoje")

  await page.locator("label").filter({ hasText: "Grade diária" }).click()
  await expect(page).toHaveURL(/view=daily-grid/)
  await expect(page.getByRole("table", { name: /Profissionais em colunas/ })).toBeVisible()
  await page.locator("label").filter({ hasText: "Kanban" }).click()
  await expect(page).toHaveURL(/view=kanban/)

  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("completes cancellation and unpaid completion decisions with focus restoration", async ({
  page,
}) => {
  await page.goto(agendaUrl())
  const joaoCard = appointmentCard(page, "kanban-01")
  await joaoCard.getByRole("button", { name: "Ações de João Vitor" }).click()
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await page.getByRole("radio", { name: "Cancelados / No-show" }).click()
  await expect(page.getByText("Qual o motivo?")).toBeVisible()
  await page.getByRole("radio", { name: "Cliente cancelou" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()
  await expect(page.getByText("Status atualizado para “Cancelado”.")).toBeVisible()
  await expect(appointmentCard(page, "kanban-01")).toContainText("Cliente cancelou")
  await expect(
    appointmentCard(page, "kanban-01").getByRole("button", {
      name: "Mover agendamento de João Vitor",
    }),
  ).toBeFocused()

  const andreCard = appointmentCard(page, "kanban-10")
  await andreCard.getByRole("button", { name: "Finalizar" }).click()
  await expect(page.getByText("Decisão de pagamento")).toBeVisible()
  await page.getByRole("radio", { name: "Manter pagamento pendente" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()
  await expect(page.getByText("Status atualizado para “Concluído”.")).toBeVisible()
  await expect(appointmentCard(page, "kanban-10")).toContainText("Pagamento pendente")

  await appointmentCard(page, "kanban-10")
    .getByRole("button", { name: "Ações de André Silva" })
    .click()
  await expect(page.getByRole("menuitem", { name: "Ver detalhes" })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: "Alterar status" })).toHaveCount(0)
})

test("rolls back card, counts, and summary together after a simulated transition failure", async ({
  page,
}) => {
  await page.goto(agendaUrl("transition-rollback"))
  const confirmed = page.locator('[aria-labelledby="kanban-column-confirmed"]')
  const waiting = page.locator('[aria-labelledby="kanban-column-waiting"]')
  await expect(confirmed.locator("[data-column-count] [aria-hidden=true]")).toHaveText("3")
  await expect(waiting.locator("[data-column-count] [aria-hidden=true]")).toHaveText("3")

  const card = appointmentCard(page, "kanban-01")
  await card.getByRole("button", { name: "Ações de João Vitor" }).click()
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await page.getByRole("radio", { name: "Em espera" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()

  await expect(
    page.getByText("Não foi possível alterar o status. O agendamento foi restaurado."),
  ).toBeVisible()
  await expect(confirmed.getByText("João Vitor")).toBeVisible()
  await expect(confirmed.locator("[data-column-count] [aria-hidden=true]")).toHaveText("3")
  await expect(waiting.locator("[data-column-count] [aria-hidden=true]")).toHaveText("3")
  await expect(page.getByText("18 atendimentos visíveis")).toBeVisible()

  await card.getByRole("button", { name: "Ações de João Vitor" }).click()
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await page.getByRole("radio", { name: "Em espera" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()
  await expect(page.getByText("Status atualizado para “Aguardando”.")).toBeVisible()
  await expect(waiting.getByText("João Vitor")).toBeVisible()
})

test("supports pointer drag and keyboard drag announcements", async ({ page }) => {
  await page.goto(agendaUrl())
  const joaoHandle = appointmentCard(page, "kanban-01").getByRole("button", {
    name: "Mover agendamento de João Vitor",
  })
  const waitingColumn = page.locator('[aria-labelledby="kanban-column-waiting"]')
  await dragBetween(joaoHandle, waitingColumn, page)
  await expect(page.getByText("Status atualizado para “Aguardando”.")).toBeVisible()
  await expect(waitingColumn.getByText("João Vitor")).toBeVisible()

  await appointmentCard(page, "kanban-01").getByRole("button", { name: "Ver detalhes" }).click()
  await expect(page.getByRole("dialog", { name: "Agenda / Ver agendamento" })).toBeVisible()
  await page.getByRole("button", { name: "Fechar" }).click()
  await appointmentCard(page, "kanban-01")
    .getByRole("button", { name: "Ações de João Vitor" })
    .click()
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await page.getByRole("radio", { name: "Check-in" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()
  await expect(page.getByText("Status atualizado para “Chegou”.").last()).toBeVisible()

  const pedroHandle = appointmentCard(page, "kanban-02").getByRole("button", {
    name: "Mover agendamento de Pedro Henrique",
  })
  await pedroHandle.focus()
  await page.keyboard.press("Space")
  await expect(pedroHandle).toHaveAttribute("aria-pressed", "true")
  await expect(
    page.getByRole("status").filter({ hasText: /Pedro Henrique.*coluna/ }),
  ).toBeAttached()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Space")
  await expect(page.getByText("Status atualizado para “Chegou”.").last()).toBeVisible()
})

test("keeps dense and long content usable at a narrow zoom-equivalent viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 720 })
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.goto(agendaUrl("dense"))
  const board = page.getByTestId("agenda-kanban-scroll")
  await expect(board).toBeVisible()
  const dimensions = await board.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth)
  await board.evaluate((element) => {
    element.scrollLeft = element.scrollWidth
  })
  await expect(page.getByRole("heading", { name: "Cancelados / No-show" })).toBeVisible()

  const handle = page.locator("[data-kanban-drag-handle]").first()
  const box = await handle.boundingBox()
  expect(box?.width).toBeGreaterThanOrEqual(24)
  expect(box?.height).toBeGreaterThanOrEqual(24)

  await page.goto(agendaUrl("long-content"))
  await expect(page.getByText(/Cliente Sintético Com Nome Intencionalmente/)).toBeVisible()
  const longContentActions = page.getByRole("button", {
    name: /Ações de Cliente Sintético Com Nome Intencionalmente/,
  })
  await longContentActions.focus()
  await page.keyboard.press("Enter")
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await expect(page.getByRole("dialog", { name: "Alterar status" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Alterar status" })).toBeHidden()
})

test("creates an appointment in the selected unit with a visible initial status", async ({
  page,
}) => {
  await page.goto(agendaUrl("conflict"))
  await page.getByRole("button", { name: "Novo agendamento" }).click()
  await page.getByRole("textbox", { name: /^Nome/ }).fill("Cliente Criado no Teste")
  await page.getByRole("textbox", { name: /^Telefone/ }).fill("81999990000")
  await page.getByRole("textbox", { name: /^Horário/ }).fill("17:00")
  await expect(page.getByLabel("Unidade").last()).toHaveText("Centro")
  await expect(page.getByLabel("Status inicial")).toHaveText("Confirmado")
  await page.getByRole("button", { name: "Criar agendamento" }).click()
  await expect(page.getByText("Agendamento criado.")).toBeVisible()
  await expect(page.getByText("Cliente Criado no Teste")).toBeVisible()
})

test("keeps edits status-neutral and terminal appointments read-only", async ({ page }) => {
  await page.goto(agendaUrl())
  const joaoCard = appointmentCard(page, "kanban-01")
  await joaoCard.getByRole("button", { name: "Ações de João Vitor" }).click()
  await page.getByRole("menuitem", { name: "Editar agendamento" }).click()
  const editDrawer = page.getByRole("dialog", { name: "Agenda / Editar agendamento" })
  await expect(editDrawer).toBeVisible()
  await expect(editDrawer.getByLabel("Status inicial")).toHaveCount(0)
  await expect(editDrawer.getByLabel("Pagamento")).toHaveCount(0)
  await editDrawer.getByLabel("Observações").fill("Edição neutra a status no navegador.")
  await page.getByRole("button", { name: "Salvar alterações" }).click()
  await expect(page.getByText("Agendamento atualizado.")).toBeVisible()
  await expect(joaoCard).toContainText("Confirmado")

  const completedCard = appointmentCard(page, "kanban-13")
  await completedCard.getByRole("button", { name: "Ações de Marcos Paulo" }).click()
  await expect(page.getByRole("menuitem", { name: "Ver detalhes" })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: "Editar agendamento" })).toHaveCount(0)
  await expect(page.getByRole("menuitem", { name: "Alterar status" })).toHaveCount(0)
  await page.getByRole("menuitem", { name: "Ver detalhes" }).click()
  await expect(page.getByRole("button", { name: "Editar agendamento" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Remarcar" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Cancelar agendamento" })).toHaveCount(0)
})

test("distinguishes empty periods and searches long professional catalogs", async ({ page }) => {
  await page.goto(agendaUrl("empty"))
  await expect(page.getByRole("heading", { name: "Agenda livre no período" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Adicionar agendamento" })).toBeVisible()

  await page.goto(agendaUrl("many-professionals"))
  await page.getByLabel("Barbeiro").click()
  await page.getByRole("textbox", { name: "Pesquisar barbeiro" }).fill("Sintético 7")
  await expect(
    page.getByRole("menuitemcheckbox", { name: "Profissional Sintético 7" }),
  ).toBeVisible()
  await expect(
    page.getByRole("menuitemcheckbox", { name: "Profissional Sintético 1" }),
  ).toHaveCount(0)
})

function appointmentCard(page: import("@playwright/test").Page, id: string) {
  return page.locator(`[data-appointment-id="${id}"]`)
}

async function dragBetween(
  source: Locator,
  target: Locator,
  page: import("@playwright/test").Page,
) {
  const [sourceBox, targetBox] = await Promise.all([source.boundingBox(), target.boundingBox()])
  expect(sourceBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  if (!sourceBox || !targetBox) return
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 120, { steps: 12 })
  await page.mouse.up()
}
