import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

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

  await page.getByRole("button", { name: "Novo agendamento" }).click()
  await page.getByRole("textbox", { name: /^Nome/ }).fill("Cliente Criado no Teste")
  await page.getByRole("textbox", { name: /^Telefone/ }).fill("81999990000")
  await page.getByRole("textbox", { name: /^Horário/ }).fill("17:00")
  await page.getByRole("button", { name: "Criar agendamento" }).click()
  await expect(page.getByText("Agendamento criado.")).toBeVisible()

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
  await page.getByRole("button", { name: "Criar agendamento" }).click()
  await expect(page.locator("#appointment-time-error")).toContainText(/não tem espaço suficiente/i)
  await expect(page.getByRole("textbox", { name: /^Horário/ })).toBeFocused()
  await page.getByRole("textbox", { name: /^Horário/ }).fill("11:00")
  await expect(page.getByText(/não tem espaço suficiente neste horário/i)).toBeHidden()
  await page.getByRole("button", { name: "Criar agendamento" }).click()
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
