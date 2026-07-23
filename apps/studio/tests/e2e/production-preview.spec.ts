import { expect, type Page, type Route, test } from "@playwright/test"

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

test("keeps the removed setup preview route inaccessible in production", async ({ page }) => {
  await page.goto("/workspace-preview/barbershop-setup?scenario=single-unit&section=overview")
  await expect(page.getByRole("heading", { name: "Configuração da barbearia" })).toHaveCount(0)
  await expect(page.getByLabel("Cenário de apresentação")).toHaveCount(0)
})

test("keeps the authenticated setup route but disables its memory source in production", async ({
  page,
}) => {
  await page.unroute("**/api/auth/**")
  await routeAuthenticatedSession(page)
  await page.goto("/barbershop-setup?scenario=single-unit&section=overview")

  await expect(page.getByRole("heading", { name: "Configuração da barbearia" })).toBeVisible()
  await expect(
    page.getByText("A configuração da barbearia está indisponível neste ambiente."),
  ).toBeVisible()
  await expect(page.getByLabel("Cenário de apresentação")).toHaveCount(0)
  await expect(page.getByText("Unidade Centro")).toHaveCount(0)
})

test("keeps the authenticated clients route but excludes its memory source in production", async ({
  page,
}) => {
  await page.unroute("**/api/auth/**")
  await routeAuthenticatedSession(page)
  await page.goto("/clients?scenario=dense")

  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible()
  await expect(
    page.getByText("O gerenciamento de clientes está indisponível neste ambiente."),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Novo cliente" })).toHaveCount(0)
  await expect(page.getByText("Cliente Sintético 01")).toHaveCount(0)
})

test("keeps the Dashboard route but fails closed without scheduling memory in production", async ({
  page,
}) => {
  await page.unroute("**/api/auth/**")
  await routeAuthenticatedSession(page)
  await page.goto("/overview?scenario=normal")

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  await expect(
    page.getByText(
      "O Dashboard operacional está desativado neste ambiente porque a fonte de agendamentos não está disponível.",
    ),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Novo agendamento" })).toHaveCount(0)
  await expect(page.getByText("Carlos Lima")).toHaveCount(0)
})

test("keeps Atendimentos fail-closed and excludes queue fixtures in production", async ({
  page,
}) => {
  await page.unroute("**/api/auth/**")
  await routeAuthenticatedSession(page)
  await page.goto("/service-desk?scenario=dense")

  await expect(page.getByRole("heading", { name: "Atendimentos" })).toBeVisible()
  await expect(page.getByText("Atendimentos indisponíveis")).toBeVisible()
  await expect(page.getByRole("button", { name: "Adicionar à fila" })).toHaveCount(0)
  await expect(page.getByText("Pessoa Sintética 1")).toHaveCount(0)
})

async function routeAuthenticatedSession(page: Page) {
  await page.route("**/api/auth/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ headers: corsHeaders(), status: 204 })
      return
    }
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
    "access-control-allow-origin": "http://127.0.0.1:4173",
  }
}
