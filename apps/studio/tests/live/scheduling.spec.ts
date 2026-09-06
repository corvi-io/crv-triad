import { readFile } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

const date = "2026-09-21"
async function login(page: Page, persona = "qa22-a-owner") {
  const { password } = JSON.parse(
    await readFile("../api/.artifacts/initiative22/credentials.json", "utf8"),
  ) as { password: string }
  await page.goto("/login")
  await page.getByLabel("E-mail", { exact: true }).fill(`${persona}@example.invalid`)
  await page.getByLabel("Senha", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes("login"))
}
async function select(page: Page, label: string, value: string) {
  await page.getByRole("dialog").getByLabel(label, { exact: true }).click()
  const option = page.getByRole("option", { name: value, exact: true })
  await option.scrollIntoViewIfNeeded()
  await option.click()
}
test("persists real availability and the appointment lifecycle through HTTP", async ({
  page,
}, info) => {
  await login(page)
  await page.goto(
    `/barbershop-setup/availability?unitId=qa22-a-unit&professionalId=qa22-a-professional&availabilityDate=${date}`,
  )
  await expect(page.getByRole("heading", { name: "Disponibilidade", exact: true })).toBeVisible()
  // The seed intentionally leaves timezone and availability unconfigured.
  if (await page.getByRole("combobox", { name: "Cidade ou região da unidade" }).isVisible()) {
    await page.getByRole("combobox", { name: "Cidade ou região da unidade" }).click()
    await page.getByRole("option", { name: "Recife", exact: true }).click()
    await page.getByRole("button", { name: "Confirmar e continuar", exact: true }).click()
  }
  await expect(page.getByRole("region", { name: "Grade de horários" })).toBeVisible()
  await expect(
    page.locator('[role="status"][aria-label="Carregando disponibilidade"]'),
  ).toHaveCount(0)
  if (!(await page.getByRole("button", { name: /Disponível · 09:00–18:00/ }).count())) {
    await page.getByRole("button", { name: "Adicionar bloco", exact: true }).click()
    await select(page, "Início", "09:00")
    await select(page, "Término", "18:00")
    await select(page, "Repetição", "Semanal")
    await page.getByRole("button", { name: "Salvar bloco", exact: true }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  }
  await page.goto(`/agenda?unit=qa22-a-unit&date=${date}&view=list`)
  await page.getByRole("button", { name: "Novo agendamento", exact: true }).click()
  for (const [label, value] of [
    ["Cliente", "Cliente QA A"],
    ["Serviço", "Corte QA"],
    ["Profissional", "Pessoa QA owner"],
    ["Horário", "14:00"],
  ])
    await select(page, label, value)
  await page.getByRole("button", { name: "Criar agendamento", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page.reload()
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: "Agendado", exact: true }) })
    .getByRole("button", { name: "Cliente QA A", exact: true })
    .click()
  await page.getByRole("button", { name: "Confirmar agendamento", exact: true }).click()
  await page.getByRole("button", { name: "Confirmar", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: "Confirmado", exact: true }) })
    .getByRole("button", { name: "Cliente QA A", exact: true })
    .click()
  await page.getByRole("button", { name: "Cancelar agendamento", exact: true }).click()
  await page.getByLabel("Cliente cancelou", { exact: true }).check()
  await page.getByRole("button", { name: "Cancelar agendamento", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole("cell", { name: "Agendado", exact: true })).toHaveCount(0)
  await expect(page.getByRole("cell", { name: "Confirmado", exact: true })).toHaveCount(0)
  await page.screenshot({ path: info.outputPath("persisted-cancellation.png") })
})
test("denies rule changes to a member and hides foreign tenant IDs", async ({ page }, info) => {
  await login(page, "qa22-a-member")
  await page.goto(
    `/barbershop-setup/availability?unitId=qa22-a-unit&professionalId=qa22-a-professional&availabilityDate=${date}`,
  )
  await expect(page.getByText(/Você pode consultar a disponibilidade/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Adicionar bloco", exact: true })).toHaveCount(0)
  const statuses = await page.evaluate(async () => {
    const read = await fetch(
      "http://localhost:8102/api/scheduling/range?unitId=qa22-b-unit&startDate=2026-09-21&endDate=2026-09-21",
      { credentials: "include" },
    )
    const write = await fetch("http://localhost:8102/api/availability/series", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: "{}",
    })
    return [read.status, write.status]
  })
  expect(statuses).toEqual([404, 403])
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: info.outputPath("member-mobile.png") })
})
