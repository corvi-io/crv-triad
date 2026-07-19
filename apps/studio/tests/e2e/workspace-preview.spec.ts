import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/**", async (route) => {
    await route.fulfill({ body: "null", contentType: "application/json", status: 200 })
  })
})

test("previews the neutral authenticated shell without product-domain navigation", async ({
  page,
}) => {
  await page.goto("/workspace-preview")

  await expect(page.getByText("Pré-visualização de desenvolvimento")).toBeVisible()
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  )
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Configurações", exact: true })).toHaveAttribute(
    "href",
    "/preferences",
  )
})

test("keeps desktop persistence, mobile navigation, themes, and focus behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/workspace-preview")

  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  const trigger = page.getByRole("button", { name: "Alternar menu de navegação" })

  await expect(sidebar).toHaveAttribute("data-state", "expanded")
  await trigger.click()
  await expect(sidebar).toHaveAttribute("data-state", "collapsed")
  await expect.poll(() => page.evaluate(() => localStorage.getItem("sidebar_state"))).toBe("false")

  await page.reload()
  await expect(sidebar).toHaveAttribute("data-state", "collapsed")
  await page.getByRole("button", { name: "Tema escuro" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.setViewportSize({ width: 375, height: 812 })
  await trigger.click()
  const dialog = await page.getByRole("dialog", { name: "Navegação do TRIAD Studio" })
  await expect(dialog.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
