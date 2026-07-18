import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/**", async (route) => {
    await route.fulfill({ body: "null", contentType: "application/json", status: 200 })
  })
})

test("redirects the development-only workspace preview in production", async ({ page }) => {
  await page.goto("/workspace-preview")

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Entrar no CRV Triad" })).toBeVisible()
  await expect(page.getByText("Pré-visualização de desenvolvimento")).toHaveCount(0)
})
