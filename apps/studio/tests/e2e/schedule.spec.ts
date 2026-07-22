import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const agendaUrl = (scenario = "normal") =>
  `/workspace-preview/agenda?date=2026-07-19&scenario=${scenario}`

test("renders the reference-aligned temporal board and passes axe", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto(agendaUrl())

  await expect(page.getByRole("heading", { exact: true, name: "Agenda" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Visualizar como quadro" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  const board = page.getByTestId("agenda-board")
  await expect(board).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Carlos Lima/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Bruno Rocha/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Ana Clara/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /João Vitor/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Diego Rodrigues/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Marcos Paulo/ })).toBeVisible()
  await expect(board.getByRole("rowheader", { name: "08:00" })).toBeVisible()
  await expect(board.getByRole("rowheader", { name: "08:15" })).toBeVisible()
  await expect(board.locator("[data-appointment-id]")).toHaveCount(42)
  expect(await board.locator("[data-slot=avatar]").count()).toBeGreaterThan(42)
  await expect(page.getByText("Resumo da agenda")).toHaveCount(0)

  const filterGroup = page.getByRole("group", {
    name: "Pesquisa, filtros e visualização da agenda",
  })
  for (const label of ["Barbeiro", "Cliente", "Serviço", "Status", "Unidade"]) {
    await expect(filterGroup.getByRole("button", { name: label })).toBeVisible()
  }
  await expect(filterGroup.getByRole("button", { name: "Período: 19/07" })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("filters from button menus, selects a period, and switches to Lista", async ({ page }) => {
  await page.goto(agendaUrl())

  const barber = page.getByRole("button", { name: "Barbeiro" })
  await expect(barber).toContainText("6")
  await barber.click()
  await page.getByLabel("Pesquisar barbeiro").fill("Carlos")
  await page.getByRole("menuitemcheckbox", { name: "Carlos Lima" }).click()
  await expect(page).toHaveURL(/professional=professional-carlos/)
  await expect(barber).toContainText("1")
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Status" }).click()
  await page.getByRole("menuitemcheckbox", { name: "Confirmado" }).click()
  await expect(page).toHaveURL(/status=confirmed/)
  await expect(page.locator("[data-appointment-id]")).toHaveCount(1)
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Período: 19/07" }).click()
  await expect(page.getByRole("dialog", { name: "Período da agenda" })).toBeVisible()
  await page.getByRole("button", { name: "7 dias" }).click()
  await expect(page).toHaveURL(/period=next-seven-days/)

  await page.getByRole("button", { name: "Visualizar como lista" }).click()
  await expect(page).toHaveURL(/view=list/)
  await expect(page.getByRole("table", { name: /Agendamentos filtrados/ })).toBeVisible()
})

test("opens a portrait card and completes the non-drag status path", async ({ page }) => {
  await page.goto(agendaUrl())

  const card = page.locator('[data-appointment-id="kanban-02"]')
  await expect(card).toContainText("Carlos Eduardo")
  await expect(card).toContainText("Em atendimento")
  await expect(card.locator("[data-slot=avatar]")).toBeVisible()

  await card.getByRole("button", { name: "Ações de Carlos Eduardo" }).click()
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await page.getByRole("radio", { name: "Em espera" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()
  await expect(page.getByText("Status atualizado para “Em espera”.")).toBeVisible()
  await expect(card).toContainText("Em espera")

  await card.getByRole("button", { name: /^Carlos Eduardo/ }).click()
  await expect(page.getByRole("dialog", { name: "Agenda / Ver agendamento" })).toBeVisible()
})

test("reschedules vertically, horizontally, and diagonally without changing status", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1100, width: 1440 })
  await page.goto(agendaUrl())

  const card = page.locator('[data-appointment-id="kanban-05"]')
  await expect(card).toContainText("Confirmado")

  await dragAppointment(page, "kanban-05", "professional-carlos", "13:15")
  await expect(page.getByText("Agendamento remarcado para 13:15 com Carlos Lima.")).toBeVisible()
  await expect(card).toContainText("13:15")
  await expect(card).toContainText("Confirmado")

  await dragAppointment(page, "kanban-05", "professional-bruno", "13:15")
  await expect(page.getByText("Agendamento remarcado para 13:15 com Bruno Rocha.")).toBeVisible()
  await expect(card).toContainText("13:15")
  await expect(card).toContainText("Confirmado")

  await dragAppointment(page, "kanban-05", "professional-ana", "14:00")
  await expect(page.getByText("Agendamento remarcado para 14:00 com Ana Clara.")).toBeVisible()
  await expect(card).toContainText("14:00")
  await expect(card).toContainText("Confirmado")
})

test("supports keyboard rescheduling with Portuguese live announcements", async ({ page }) => {
  await page.setViewportSize({ height: 1100, width: 1440 })
  await page.goto(agendaUrl())

  const card = page.locator('[data-appointment-id="kanban-05"]')
  const handle = card.getByRole("button", { name: "Remarcar Rafael Costa" })
  await handle.focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("Space")
  await expect(
    page.locator("#main-content").getByText("O agendamento já está nesse horário e barbeiro."),
  ).toBeAttached()
  await expect(card).toContainText("11:00")

  await handle.focus()
  await page.keyboard.press("Space")
  await expect(page.getByText(/Remarcando Rafael Costa\. Use as setas/)).toBeAttached()
  for (let step = 0; step < 10; step += 1) {
    await page.keyboard.press("ArrowDown")
  }
  await page.keyboard.press("ArrowRight")
  await expect(page.getByText(/Destino 13:30 com Bruno Rocha/)).toBeAttached()
  await page.keyboard.press("Space")

  await expect(page.getByText("Agendamento remarcado para 13:30 com Bruno Rocha.")).toBeVisible()
  await expect(card).toContainText("13:30")
  await expect(card).toContainText("Confirmado")
  await expect(handle).toBeFocused()
})

test("rolls back appointment and hidden occupancy atomically after a conflict", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto(`${agendaUrl()}&professional=professional-carlos&client=client-kanban-02`)

  const card = page.locator('[data-appointment-id="kanban-02"]')
  await expect(card).toContainText("08:45")
  await expect(page.getByText("Ocupado · 08:00–08:45")).toBeVisible()
  await dragAppointment(page, "kanban-02", "professional-carlos", "08:00")

  await expect(
    page.getByLabel("Notifications alt+T").getByText(/não tem espaço suficiente.*restaurado/i),
  ).toBeVisible()
  await expect(card).toContainText("08:45")
  await expect(card).toContainText("Em atendimento")
  await expect(page.getByText("Ocupado · 08:00–08:45")).toBeVisible()
})

test("disables drag for terminal appointments while preserving details", async ({ page }) => {
  await page.goto(agendaUrl())

  const terminal = page.locator('[data-appointment-id="kanban-01"]')
  await expect(
    terminal.getByRole("button", { name: "Remarcação indisponível para João Vitor" }),
  ).toBeDisabled()
  await terminal.getByRole("button", { name: /^João Vitor/ }).click()
  await expect(page.getByRole("dialog", { name: "Agenda / Ver agendamento" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Remarcar" })).toHaveCount(0)
})

test("keeps the board bounded and applies and resets development scenarios", async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 640 })
  await page.goto(agendaUrl("dense"))

  const board = page.getByTestId("agenda-board")
  const dimensions = await board.evaluate((element) => {
    const scroll = element.firstElementChild
    if (!(scroll instanceof HTMLElement)) return { clientWidth: 0, scrollWidth: 0 }
    return { clientWidth: scroll.clientWidth, scrollWidth: scroll.scrollWidth }
  })
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640)

  await page.setViewportSize({ height: 900, width: 1440 })
  await page.getByRole("button", { name: "Configurações do protótipo" }).click()
  await expect(page.getByText("Cenário de desenvolvimento")).toBeVisible()
  await expect(page.getByRole("menuitemradio", { name: /Denso/ })).toBeChecked()

  await page.getByRole("menuitemradio", { name: /Vazio/ }).click()
  await expect(page).toHaveURL(/scenario=empty/)
  await expect(page.getByRole("heading", { name: "Agenda livre no período" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Adicionar agendamento" })).toBeVisible()

  await page.getByRole("button", { name: "Configurações do protótipo" }).click()
  await page.getByRole("menuitemradio", { name: /Todos os status/ }).click()
  await expect(page).toHaveURL(/scenario=all-statuses/)
  await expect(page.locator("[data-appointment-id]")).toHaveCount(8)

  const confirmed = page.locator('[data-appointment-id="status-confirmed"]')
  await expect(confirmed).toContainText("Confirmado")
  await confirmed.getByRole("button", { name: "Ações de Cliente confirmado" }).click()
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await page.getByRole("radio", { name: "Em espera" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()
  await expect(confirmed).toContainText("Em espera")

  await page.getByRole("button", { name: "Configurações do protótipo" }).click()
  await page.getByRole("menuitem", { name: "Restaurar cenário" }).click()
  await expect(confirmed).toContainText("Confirmado")
})

async function dragAppointment(
  page: import("@playwright/test").Page,
  appointmentId: string,
  professionalId: string,
  start: string,
) {
  const handle = page
    .locator(`[data-appointment-id="${appointmentId}"]`)
    .getByRole("button", { name: /^Remarcar / })
  const target = page.locator(
    `[data-drop-professional-id="${professionalId}"][data-drop-start="${start}"]`,
  )
  await target.scrollIntoViewIfNeeded()
  const sourceBox = await handle.boundingBox()
  const targetBox = await target.boundingBox()
  expect(sourceBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  if (!sourceBox || !targetBox) return

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 8, sourceBox.y + sourceBox.height / 2, {
    steps: 2,
  })
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 12,
  })
  await page.mouse.up()
}
