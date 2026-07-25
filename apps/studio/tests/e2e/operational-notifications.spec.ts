import path from "node:path"
import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, type Route, test } from "@playwright/test"

const evidenceDirectory = path.resolve(process.cwd(), "../../docs/studio/evidence/eng-54")

test.beforeEach(async ({ page }) => routeAuthenticatedSession(page))

test("keeps header, Dashboard, and center consistent with keyboard-safe popover focus", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-24T15:35:00-03:00"))
  await page.goto("/overview?scenario=normal")
  const bell = page.getByRole("button", {
    name: "Abrir notificações. 7 notificações ativas não lidas.",
  })
  await expect(bell).toBeVisible()
  await bell.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("heading", { name: "Notificações operacionais" })).toBeVisible()
  await expect(page.locator("[data-notification-id]")).toHaveCount(4)
  await page.keyboard.press("Escape")
  await expect(bell).toBeFocused()

  await page.getByRole("heading", { name: "Atenção necessária" }).scrollIntoViewIfNeeded()
  const attentionCard = page
    .getByRole("heading", { name: "Atenção necessária" })
    .locator('xpath=ancestor::*[@data-slot="card"]')
  await expect(attentionCard.getByText("Conflito identificado na Agenda")).toBeVisible()
  await expect(attentionCard.getByText("Espera acima de 15 minutos")).toBeVisible()
  await expect(attentionCard.getByRole("button")).toHaveCount(5)
  await attentionCard.getByRole("button", { name: "Ver todos" }).click()
  await expect(page).toHaveURL(/\/notifications/)
  await expect(page.getByText("7 ativas · 7 não lidas")).toBeVisible()
  await expect(page.locator("[data-notification-id]")).toHaveCount(8)
  await expect(
    page.locator('[data-slot="workspace-primary-navigation-item"] a', { hasText: "Notificações" }),
  ).toHaveCount(0)
})

test("renders all official categories, safe recovery, read state, and axe-clean desktop evidence", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("triad-studio-theme", "light"))
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/notifications?scenario=normal")
  const categories = [
    "Cliente aguardando há muito tempo",
    "Próximo atendimento em 10 minutos",
    "Conflito de agenda",
    "Atendimento aberto sem finalização",
    "Pagamento pendente",
    "Horário bloqueado",
    "Agendamento alterado ou cancelado",
  ]
  const active = page.getByRole("region", { name: "Ativas", exact: true })
  for (const category of categories)
    await expect(active.getByRole("heading", { name: category })).toBeVisible()
  await page.getByRole("button", { name: "Marcar como lida" }).first().click()
  await expect(page.getByText("7 ativas · 6 não lidas")).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: path.join(evidenceDirectory, "notifications-light-1440.png"),
  })

  const axe = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze()
  expect(axe.violations).toEqual([])

  await page.goto("/notifications?scenario=missing-target")
  await expect(
    page.getByRole("link", { name: "Destino indisponível · Abrir Agenda" }),
  ).toHaveAttribute("href", "/agenda")
})

test("caps 105 unread visually and preserves narrow dark forced-color/reduced-motion reflow", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("triad-studio-theme", "dark"))
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ height: 720, width: 320 })
  await page.goto("/notifications?scenario=overflow")
  const bell = page.getByRole("button", {
    name: "Abrir notificações. 105 notificações ativas não lidas.",
  })
  await expect(bell).toBeVisible()
  await expect(bell.getByText("99+")).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
  const targets = page.locator(
    '#main-content [data-notification-id] a:visible, #main-content [data-notification-id] button:visible, #main-content [data-slot="page-header-actions"] button:visible',
  )
  for (let index = 0; index < (await targets.count()); index += 1) {
    const box = await targets.nth(index).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
  }
  await page.screenshot({
    fullPage: false,
    path: path.join(evidenceDirectory, "notifications-dark-320.png"),
  })
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  await page.screenshot({
    fullPage: false,
    path: path.join(evidenceDirectory, "notifications-dark-forced-colors-320.png"),
  })

  await page.emulateMedia({ forcedColors: "none", reducedMotion: "reduce" })
  await page.setViewportSize({ height: 720, width: 640 })
  await page.evaluate(() => document.documentElement.style.setProperty("zoom", "2"))
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1)
  await page.screenshot({
    fullPage: false,
    path: path.join(evidenceDirectory, "notifications-200-percent-zoom.png"),
  })
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
    "access-control-allow-origin": "http://127.0.0.1:3100",
  }
}
