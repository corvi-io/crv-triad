import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, type Route, test } from "@playwright/test"

const studioOrigin = "http://127.0.0.1:3100"

test("keeps public auth journeys focused, responsive, and accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ height: 720, width: 320 })
  await routeUnauthenticatedSession(page)

  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Entrar no TRIAD Studio" })).toBeFocused()
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeFocused()
  await expect(page.getByRole("link", { name: "Esqueceu a senha?" })).toHaveAttribute(
    "href",
    "/forgot-password",
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

  const accessibility = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])

  await page.getByRole("link", { name: "Esqueceu a senha?" }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
  await expect(page.getByRole("heading", { name: "Redefinir senha" })).toBeFocused()
})

test("submits forgot and reset password through the native Better Auth contract", async ({
  page,
}) => {
  let resetRedirect = ""
  let resetRequests = 0

  await page.route("**/api/auth/**", async (route) => {
    if (await fulfillPreflight(route)) return

    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith("/get-session")) {
      await fulfillJson(route, null)
      return
    }
    if (pathname.endsWith("/request-password-reset")) {
      const body = route.request().postDataJSON() as { redirectTo?: string }
      resetRedirect = body.redirectTo ?? ""
      await fulfillJson(route, { message: "accepted", status: true })
      return
    }
    if (pathname.endsWith("/reset-password")) {
      resetRequests += 1
      await fulfillJson(route, { status: true })
      return
    }
    await fulfillJson(route, null)
  })

  await page.goto("/forgot-password")
  await page.getByLabel("E-mail").fill("test-user@example.invalid")
  await page.getByRole("button", { name: "Enviar instruções" }).click()
  await expect(page.getByRole("status")).toContainText("Se houver uma conta elegível")
  expect(resetRedirect).toBe(`${studioOrigin}/reset-password`)

  await page.goto("/reset-password?token=opaque-test-token")
  const newPassword = page.getByLabel("Nova senha", { exact: true })
  await expect(newPassword).toHaveAttribute("type", "password")
  await page.getByRole("button", { name: "Mostrar senha" }).first().click()
  await expect(newPassword).toHaveAttribute("type", "text")
  await newPassword.fill("new-password-123")
  await page.getByLabel("Confirmar nova senha").fill("new-password-123")
  await page.getByRole("button", { name: "Redefinir senha" }).dblclick()

  await expect(page.getByRole("status")).toContainText("Sua senha foi redefinida")
  expect(resetRequests).toBe(1)
  await expect(page.getByRole("link", { name: "Voltar para entrar" })).toBeVisible()
})

test("maps verification failures without contradictory success and consumes the success marker", async ({
  page,
}) => {
  await routeUnauthenticatedSession(page)

  await page.goto("/login?verified=true&error=invalid_token")
  await expect(page.getByRole("alert")).toContainText("O link de verificação é inválido")
  await expect(page.getByText("E-mail confirmado. Você já pode entrar.")).toHaveCount(0)
  await expect(page.getByText(/acesso com o Google não foi concluído/)).toHaveCount(0)
  await expect(page).not.toHaveURL(/verified=/)

  await page.goto("/login?verified=true&error=TOKEN_EXPIRED")
  await expect(page.getByRole("alert")).toContainText("O link de verificação expirou")
  await expect(page.getByText("E-mail confirmado. Você já pode entrar.")).toHaveCount(0)
  await expect(page).not.toHaveURL(/verified=/)
})

test("keeps a Google-only user from removing the last access method", async ({ page }) => {
  await page.route("**/api/auth/**", async (route) => {
    if (await fulfillPreflight(route)) return

    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith("/get-session")) {
      await fulfillJson(route, {
        session: { expiresAt: "2099-01-01T00:00:00.000Z", id: "session-fixture" },
        user: {
          email: "test-user@example.invalid",
          id: "user-fixture",
          name: "Test User",
        },
      })
      return
    }
    if (pathname.endsWith("/list-accounts")) {
      await fulfillJson(route, [{ id: "google-fixture", providerId: "google" }])
      return
    }
    await fulfillJson(route, { status: true })
  })

  await page.goto("/preferences")

  await expect(page.getByRole("heading", { name: "Segurança e acesso" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Desconectar Google" })).toBeDisabled()
  await expect(page.getByText(/Crie uma senha antes de desconectar/)).toBeVisible()

  const accessibility = await new AxeBuilder({ page })
    .include('[aria-labelledby="security-access-heading"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(accessibility.violations).toEqual([])
})

test("does not trust a Google callback marker when the account list disagrees", async ({
  page,
}) => {
  await page.route("**/api/auth/**", async (route) => {
    if (await fulfillPreflight(route)) return

    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith("/get-session")) {
      await fulfillJson(route, {
        session: { expiresAt: "2099-01-01T00:00:00.000Z", id: "session-fixture" },
        user: {
          email: "test-user@example.invalid",
          id: "user-fixture",
          name: "Test User",
        },
      })
      return
    }
    if (pathname.endsWith("/list-accounts")) {
      await fulfillJson(route, [{ id: "credential-fixture", providerId: "credential" }])
      return
    }
    await fulfillJson(route, { status: true })
  })

  await page.goto("/preferences?google=connected")

  await expect(page.getByRole("alert")).toContainText("Não foi possível confirmar a conexão")
  await expect(page.getByText("Google conectado com sucesso.")).toHaveCount(0)
  await expect(page).not.toHaveURL(/google=/)
})

async function routeUnauthenticatedSession(page: Page) {
  await page.route("**/api/auth/**", async (route) => {
    if (await fulfillPreflight(route)) return
    await fulfillJson(route, null)
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
    "access-control-allow-origin": studioOrigin,
  }
}
