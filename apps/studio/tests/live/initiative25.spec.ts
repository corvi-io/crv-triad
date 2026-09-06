import { readFile } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

const api = "http://localhost:8105"
async function login(page: Page, persona: "admin" | "member" | "owner", tenant = "a") {
  const { password } = JSON.parse(
    await readFile("../api/.artifacts/initiative22/credentials.json", "utf8"),
  ) as { password: string }
  await page.goto("/login")
  await page.getByLabel("E-mail", { exact: true }).fill(`qa22-${tenant}-${persona}@example.invalid`)
  await page.getByLabel("Senha", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes("login"))
}

test("owner persists profile/logo and a future commission policy", async ({ page }, info) => {
  await login(page, "owner")
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/business-profile")),
    page.goto("/barbershop-setup/business"),
  ])
  await expect(
    page.getByRole("heading", { level: 1, name: "Dados da barbearia", exact: true }),
  ).toBeVisible()
  await page.getByLabel("Nome de exibição").fill("Barbearia QA Gestão")
  await page.getByLabel("Telefone", { exact: true }).fill("81999998888")
  await page.getByLabel("E-mail", { exact: true }).fill("gestao@example.invalid")
  await page.getByLabel("Unidade principal").click()
  await page.getByRole("option", { name: "Unidade QA A" }).click()
  await page.getByLabel("WhatsApp").fill("81999997777")
  await page.getByLabel("Site").fill("https://example.invalid")
  await page.getByLabel("Instagram").fill("@barbeariaqagestao")
  await page
    .getByLabel("Descrição")
    .fill("Barbearia sintética usada exclusivamente na validação local.")
  await page.getByRole("button", { name: "Salvar dados" }).click()
  await expect(page.getByText("Dados da barbearia atualizados.")).toBeVisible()
  const logo = await page.screenshot()
  await page
    .getByLabel("Logotipo")
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: logo })
  await expect(page.getByText("Logotipo atualizado.")).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Barbearia QA Gestão")
  await expect(page.getByLabel("Unidade principal")).toContainText("Unidade QA A")
  await page.screenshot({ path: info.outputPath("owner-profile-desktop.png"), fullPage: true })

  await page.goto("/barbershop-setup/payments")
  await page.getByRole("combobox", { name: "Profissional da comissão" }).click()
  await page.getByRole("option", { name: "Pessoa QA owner" }).click()
  await page.getByRole("button", { name: "Salvar regra" }).click()
  await expect(page.getByText("Regra de comissão salva para vendas futuras.")).toBeVisible()
  await page.reload()
  await expect(page.getByRole("combobox", { name: "Profissional da comissão" })).toContainText(
    "Pessoa QA owner",
  )
  await expect(page.getByRole("combobox", { name: "Serviço da comissão" })).toContainText(
    "Regra padrão",
  )
  await expect(page.getByRole("combobox", { name: "Tipo de comissão" })).toContainText("Percentual")
  await expect(page.getByText(/No mês:/)).toBeVisible()
  await page.screenshot({ path: info.outputPath("owner-commission-desktop.png"), fullPage: true })
})

test("admin generates, observes and downloads a fake local artifact", async ({ page }, info) => {
  await login(page, "admin")
  await page.goto("/reports")
  await expect(page.getByRole("heading", { name: "Relatórios", exact: true })).toBeVisible()
  const aggregate = await page.evaluate(
    async ({ api }) => {
      const response = await fetch(`${api}/api/reports/summary?from=2026-09-01&to=2026-09-30`, {
        credentials: "include",
      })
      return { status: response.status, body: await response.text() }
    },
    { api },
  )
  expect(aggregate, aggregate.body).toMatchObject({ status: 200 })
  await page.getByRole("button", { name: "Gerar relatório" }).click()
  await expect(page.getByText("Pronto · tentativa 1").first()).toBeVisible({ timeout: 10_000 })
  await page.screenshot({
    path: info.outputPath("admin-reports-ready-desktop.png"),
    fullPage: true,
  })
  const [download] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/local-artifacts/")),
    page.getByRole("button", { name: "Baixar" }).first().click(),
  ])
  expect(download.status()).toBe(200)
  expect(download.headers()["content-type"]).toContain("application/pdf")
  const reportId = await page.evaluate(
    async ({ api }) => {
      const reports = (await (
        await fetch(`${api}/api/reports/generated`, { credentials: "include" })
      ).json()) as { id: string }[]
      return reports[0]?.id
    },
    { api },
  )
  expect(reportId).toBeTruthy()
  await page.context().clearCookies()
  await login(page, "owner", "b")
  const crossTenantStatus = await page.evaluate(
    async ({ api, reportId }) =>
      (await fetch(`${api}/api/reports/generated/${reportId}`, { credentials: "include" })).status,
    { api, reportId },
  )
  expect([403, 404]).toContain(crossTenantStatus)
})

test("member reads profile but cannot mutate management exports", async ({ page }, info) => {
  await login(page, "member")
  await page.goto("/barbershop-setup/business")
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Barbearia QA Gestão")
  const statuses = await page.evaluate(
    async ({ api }) => {
      const ownWrite = await fetch(`${api}/api/business-profile`, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
      const exportWrite = await fetch(`${api}/api/reports/generated`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
      return [ownWrite.status, exportWrite.status]
    },
    { api },
  )
  expect(statuses).toEqual([403, 403])
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: info.outputPath("member-profile-mobile.png"), fullPage: true })
})

test("dark mode reports reflow at 200 percent without accessibility violations", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" })
  await login(page, "owner")
  await page.setViewportSize({ width: 640, height: 900 })
  await page.goto("/reports")
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2"
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: info.outputPath("owner-reports-dark-zoom.png"), fullPage: true })
})
