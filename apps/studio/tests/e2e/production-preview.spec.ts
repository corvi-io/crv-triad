import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/**", async (route) => {
    await route.fulfill({ body: "null", contentType: "application/json", status: 200 })
  })
})

test("redirects the development-only workspace preview in production", async ({ page }) => {
  await page.goto("/workspace-preview")

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Entrar no TRIAD Studio" })).toBeVisible()
  await expect(page.getByText("Pré-visualização de desenvolvimento")).toHaveCount(0)
})

test("keeps the sandbox route and controls unreachable in production", async ({ page }) => {
  await page.goto("/workspace-preview/sandbox")

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText("Sandbox de componentes")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Falhar próxima operação" })).toHaveCount(0)
})

test("redirects the schedule preview and excludes synthetic scheduling in production", async ({
  page,
}) => {
  await page.goto("/workspace-preview/agenda?date=2026-07-19&scenario=normal")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText("Unidade sintética Centro")).toHaveCount(0)
})

test("redirects the setup preview and excludes its scenario controls in production", async ({
  page,
}) => {
  await page.goto("/workspace-preview/barbershop-setup?scenario=single-unit&section=overview")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Configuração da barbearia" })).toHaveCount(0)
  await expect(page.getByLabel("Cenário de apresentação")).toHaveCount(0)
})
