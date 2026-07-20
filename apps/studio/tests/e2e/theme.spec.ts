import { expect, type Page, test } from "@playwright/test"

const appUrl = "http://127.0.0.1:3100"
const feedbackRoles = ["success", "warning", "info", "destructive"] as const
const semanticTextPairs = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
] as const
const scheduleStates = [
  ["scheduled", "Agendado"],
  ["confirmed", "Confirmado"],
  ["arrived", "Chegou"],
  ["waiting", "Aguardando"],
  ["in-progress", "Em atendimento"],
  ["completed", "Concluído"],
  ["canceled", "Cancelado"],
  ["no-show", "Não compareceu"],
] as const

test("resolves saved and system preferences before the first animation frame", async ({
  browser,
}) => {
  const cases = [
    { preference: "dark", system: "light", expectedDark: true },
    { preference: "light", system: "dark", expectedDark: false },
    { preference: "system", system: "dark", expectedDark: true },
  ] as const

  for (const testCase of cases) {
    const context = await browser.newContext({ colorScheme: testCase.system })
    await context.addInitScript((preference) => {
      window.localStorage.setItem("triad-studio-theme", preference)
      window.requestAnimationFrame(() => {
        Object.assign(window, {
          __triadThemeAtFirstFrame: document.documentElement.classList.contains("dark"),
        })
      })
    }, testCase.preference)
    const page = await context.newPage()
    await page.goto(`${appUrl}/workspace-preview`)

    await expect(page.locator("html")).toHaveClass(testCase.expectedDark ? /dark/ : /^$/)
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, "__triadThemeAtFirstFrame")))
      .toBe(testCase.expectedDark)
    await context.close()
  }
})

test("follows system changes while preserving the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.addInitScript(() => window.localStorage.setItem("triad-studio-theme", "system"))
  await page.goto("/workspace-preview")
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.emulateMedia({ colorScheme: "light" })
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("triad-studio-theme")))
    .toBe("system")
})

test("meets computed contrast for global feedback, focus, inputs, and every schedule state", async ({
  page,
}) => {
  await page.goto("/workspace-preview/agenda?date=2026-07-19&scenario=all-statuses")

  for (const theme of ["light", "dark"] as const) {
    await selectTheme(page, theme)

    for (const [foreground, background] of semanticTextPairs) {
      const colors = await computedTokenColors(page, `--${foreground}`, `--${background}`, "--ring")
      expect(
        contrastRatio(colors.foreground, colors.background),
        `${theme} ${foreground} on ${background}`,
      ).toBeGreaterThanOrEqual(4.5)
    }

    for (const role of feedbackRoles) {
      const colors = await computedTokenColors(
        page,
        `--feedback-${role}-foreground`,
        `--feedback-${role}`,
        `--feedback-${role}-border`,
      )
      expect(
        contrastRatio(colors.foreground, colors.background),
        `${theme} ${role} text`,
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(colors.border, colors.background),
        `${theme} ${role} border`,
      ).toBeGreaterThanOrEqual(3)
    }

    const focusColors = await computedTokenColors(page, "--foreground", "--background", "--ring")
    expect(
      contrastRatio(focusColors.foreground, focusColors.background),
      `${theme} body text`,
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrastRatio(focusColors.border, focusColors.background),
      `${theme} focus ring`,
    ).toBeGreaterThanOrEqual(3)

    const inputColors = await computedTokenColors(page, "--foreground", "--background", "--input")
    expect(
      contrastRatio(inputColors.border, inputColors.background),
      `${theme} input boundary`,
    ).toBeGreaterThanOrEqual(3)

    for (const [status, label] of scheduleStates) {
      const card = page.locator(`[data-appointment-status="${status}"]`).first()
      await expect(card).toBeVisible()
      await expect(card).toContainText(label)
      const colors = await card.evaluate((element) => {
        const computed = getComputedStyle(element)
        return {
          background: computed.backgroundColor,
          border: computed.borderTopColor,
          foreground: computed.color,
        }
      })
      expect(
        contrastRatio(colors.foreground, colors.background),
        `${theme} ${status} text`,
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(colors.border, colors.background),
        `${theme} ${status} border`,
      ).toBeGreaterThanOrEqual(3)
    }
  }
})

test("retains status text and boundaries in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" })
  await page.goto("/workspace-preview/agenda?date=2026-07-19&scenario=all-statuses")

  for (const [status, label] of scheduleStates) {
    const card = page.locator(`[data-appointment-status="${status}"]`).first()
    await expect(card).toBeVisible()
    await expect(card).toContainText(label)
    await expect(card).toHaveCSS("border-top-style", "solid")
  }
})

test("keeps both themes usable at 320 CSS pixels and a 200%-zoom equivalent", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto("/workspace-preview/agenda?date=2026-07-19&scenario=all-statuses")

  for (const theme of ["light", "dark"] as const) {
    await selectTheme(page, theme)
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Novo agendamento" })).toBeVisible()
    await expect(page.locator('[data-appointment-status="scheduled"]').first()).toContainText(
      "Agendado",
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  }

  await page.setViewportSize({ width: 640, height: 900 })
  await page.evaluate(() => {
    document.body.style.zoom = "200%"
  })
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Novo agendamento" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640)
})

async function selectTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((nextTheme) => {
    localStorage.setItem("triad-studio-theme", nextTheme)
  }, theme)
  await page.reload()
  await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^$/)
}

async function computedTokenColors(
  page: Page,
  foregroundToken: string,
  backgroundToken: string,
  borderToken: string,
) {
  return page.evaluate(
    ([foreground, background, border]) => {
      const sample = document.createElement("span")
      sample.style.color = `var(${foreground})`
      sample.style.backgroundColor = `var(${background})`
      sample.style.border = `1px solid var(${border})`
      document.body.append(sample)
      const computed = getComputedStyle(sample)
      const colors = {
        background: computed.backgroundColor,
        border: computed.borderTopColor,
        foreground: computed.color,
      }
      sample.remove()
      return colors
    },
    [foregroundToken, backgroundToken, borderToken],
  )
}

function contrastRatio(foreground: string, background: string) {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (left, right) => right - left,
  )
  return (luminances[0] + 0.05) / (luminances[1] + 0.05)
}

function relativeLuminance(color: string) {
  const channels = color
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number)
  if (channels?.length !== 3) throw new Error(`Unsupported computed color: ${color}`)
  const linear = channels.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}
