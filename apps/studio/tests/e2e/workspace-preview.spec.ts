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
  await page.getByRole("button", { name: /Abrir menu de/ }).click()
  await expect(page.getByRole("menuitem", { name: "Preferências", exact: true })).toHaveAttribute(
    "href",
    "/preferences",
  )
  await page.keyboard.press("Escape")

  for (const path of ["/workspace-preview", "/workspace-preview/agenda?date=2026-07-22"]) {
    await page.goto(path)
    const activeItem = page.locator(
      '[data-slot="workspace-primary-navigation-item"][data-active="true"]',
    )
    const indicator = activeItem.locator('[data-slot="workspace-active-indicator"]')
    await expect(activeItem).toHaveCount(1)
    await expect(indicator).toBeVisible()
    const geometry = await indicator.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        backgroundColor: style.backgroundColor,
        borderWidth: style.borderWidth,
        height: bounds.height,
        width: bounds.width,
      }
    })
    expect(geometry.width).toBe(2)
    expect(geometry.height).toBeGreaterThan(geometry.width)
    expect(geometry.borderWidth).toBe("0px")
    expect(geometry.backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  }
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
