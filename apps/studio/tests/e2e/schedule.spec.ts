import AxeBuilder from "@axe-core/playwright"
import { expect, type Locator, test } from "@playwright/test"

test("completes the schedule view, reschedule, cancel, URL scenario, and axe journey", async ({
  page,
}) => {
  await page.goto("/workspace-preview/agenda?date=2026-07-19&scenario=normal")
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Agenda", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  )

  await page.locator("table button").filter({ hasText: "Marina Teste" }).click()
  await expect(page.getByRole("dialog", { name: "Agenda / Ver agendamento" })).toBeVisible()
  await page.getByRole("button", { name: "Remarcar" }).click()
  await page.getByLabel("Horário").fill("09:15")
  await page.getByRole("button", { name: "Confirmar remarcação" }).click()
  await expect(page.getByText("Agendamento atualizado.")).toBeVisible()

  await page.locator("table button").filter({ hasText: "Marina Teste" }).click()
  await page.getByRole("button", { name: "Cancelar agendamento" }).click()
  await expect(page.getByText(/Cancelar o horário/)).toBeVisible()
  await page.getByRole("button", { name: "Cancelar agendamento" }).click()
  await expect(page.getByText("Agendamento cancelado.")).toBeVisible()

  await page.getByLabel("Cenário").click()
  await page.getByRole("option", { name: "Muitos profissionais" }).click()
  await expect(page).toHaveURL(/scenario=many-professionals/)
  await expect(page.getByRole("columnheader", { name: "Profissional Sintético 7" })).toBeVisible()

  await page
    .getByRole("button", { name: "Disponível às 17:00 para Profissional Sintético 7" })
    .click()
  await page.getByRole("textbox", { name: /^Nome/ }).fill("Cliente Criado no Teste")
  await page.getByRole("textbox", { name: /^Telefone/ }).fill("81999990000")
  await page.getByRole("textbox", { name: /^Horário/ }).fill("17:00")
  await page.getByRole("button", { name: "Criar agendamento" }).click()
  await expect(page.getByText("Agendamento criado.")).toBeVisible()
  await expect(
    page.locator("table button").filter({ hasText: "Cliente Criado no Teste" }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("shows a recoverable conflict and preserves filter state in the URL", async ({ page }) => {
  await page.goto("/workspace-preview/agenda?date=2026-07-19&scenario=conflict")
  await page.getByRole("button", { name: "Novo agendamento" }).click()
  await page.getByRole("textbox", { name: /^Nome/ }).fill("Cliente de Conflito")
  await page.getByRole("textbox", { name: /^Telefone/ }).fill("81999990000")
  await page.getByRole("textbox", { name: /^Horário/ }).fill("10:15")
  const createButton = page.getByRole("button", { name: "Criar agendamento" })
  await createButton.click()
  await expect(page.locator("#appointment-time-error")).toContainText(/não tem espaço suficiente/i)
  await expect(page.getByRole("textbox", { name: /^Horário/ })).toBeFocused()
  const conflictToast = page
    .locator('[data-sonner-toast][data-type="error"]')
    .filter({ hasText: /não tem espaço suficiente/i })
  await expect(conflictToast).toBeVisible()
  await page.getByRole("textbox", { name: /^Horário/ }).fill("11:00")
  await expect(page.getByText(/não tem espaço suficiente neste horário/i)).toBeHidden()
  await expectLocatorsNotToOverlap(conflictToast, createButton)
  await createButton.click()
  await expect(page.getByText("Agendamento criado.")).toBeVisible()

  await page.goto(
    "/workspace-preview/agenda?date=2026-07-19&scenario=normal&professional=professional-ana",
  )
  await expect(page).toHaveURL(/professional=professional-ana/)
  await page.getByLabel("Status").click()
  await page.getByRole("option", { name: "Agendado" }).click()
  await expect(page).toHaveURL(/professional=professional-ana/)
  await expect(page).toHaveURL(/status=scheduled/)
})

test("keeps hidden-status appointment spans occupied and non-interactive", async ({ page }) => {
  await page.goto(
    "/workspace-preview/agenda?date=2026-07-19&scenario=normal&professional=professional-ana&status=scheduled",
  )

  const occupancy = page.getByText(/Agendamento fora do filtro · 09:00–09:45 · 45 min/).first()
  await expect(occupancy).toBeVisible()
  await expect(occupancy.locator("xpath=ancestor::td[1]")).toHaveAttribute("rowspan", "3")
  await expect(page.getByRole("button", { name: "Disponível às 09:00 para Ana Lima" })).toHaveCount(
    0,
  )
})

test("rejects blocked and off-grid starts with visible focused feedback", async ({ page }) => {
  await page.goto("/workspace-preview/agenda?date=2026-07-19&scenario=blocked")
  await expect(
    page.locator("table button").filter({ hasText: "Cliente sintético appointment-blocked" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Novo agendamento" }).click()
  await page.getByRole("textbox", { name: /^Nome/ }).fill("Cliente de Bloqueio")
  await page.getByRole("textbox", { name: /^Telefone/ }).fill("81999990000")

  const timeField = page.getByRole("textbox", { name: /^Horário/ })
  await timeField.fill("09:15")
  await page.getByRole("button", { name: "Criar agendamento" }).click()
  await expect(page.locator("#appointment-time-error")).toContainText(
    /coincide com uma pausa ou bloqueio/i,
  )
  await expect(page.getByText(/coincide com uma pausa ou bloqueio/i).last()).toBeVisible()
  await expect(timeField).toBeFocused()
  const blockedToast = page
    .locator('[data-sonner-toast][data-type="error"]')
    .filter({ hasText: /coincide com uma pausa ou bloqueio/i })
  await expect(blockedToast).toBeVisible()

  await timeField.fill("09:10")
  const createButton = page.getByRole("button", { name: "Criar agendamento" })
  await expectLocatorsNotToOverlap(blockedToast, createButton)
  await createButton.click()
  await expect(page.locator("#appointment-time-error")).toContainText(/15 em 15 minutos/i)
  await expect(timeField).toBeFocused()
})

test("keeps the grouped journey usable at 320 CSS pixels in dark reduced-motion mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await page.goto("/workspace-preview/agenda?date=2026-07-19&scenario=long-content")
  await expect(page.getByRole("heading", { name: "Ana Lima" })).toBeVisible()
  const appointment = page.getByRole("button", {
    name: /Cliente Sintético Com Nome Intencionalmente/,
  })
  await expect(appointment).toBeVisible()
  await appointment.click()
  await expect(page.getByRole("dialog", { name: "Agenda / Ver agendamento" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Agenda / Ver agendamento" })).toBeHidden()
  await expect(appointment).toBeFocused()
})

async function expectLocatorsNotToOverlap(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()])
  expect(firstBox, "first locator has a rendered box").not.toBeNull()
  expect(secondBox, "second locator has a rendered box").not.toBeNull()
  if (!firstBox || !secondBox) return

  const overlap =
    firstBox.x < secondBox.x + secondBox.width &&
    firstBox.x + firstBox.width > secondBox.x &&
    firstBox.y < secondBox.y + secondBox.height &&
    firstBox.y + firstBox.height > secondBox.y
  expect(overlap, "active feedback does not obscure the retry action").toBe(false)
}
