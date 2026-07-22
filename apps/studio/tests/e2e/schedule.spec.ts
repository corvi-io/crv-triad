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

test("keeps the board bounded on narrow screens and exposes development scenarios", async ({
  page,
}) => {
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

  await page.getByRole("button", { name: "Configurações do protótipo" }).click()
  await expect(page.getByText("Cenário de desenvolvimento")).toBeVisible()
  await expect(page.getByRole("menuitemradio", { name: /Denso/ })).toBeChecked()

  await page.goto(agendaUrl("empty"))
  await expect(page.getByRole("heading", { name: "Agenda livre no período" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Adicionar agendamento" })).toBeVisible()
})
