import { expect, type Locator, type Page, test } from "@playwright/test"

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

test("renders a contrasting focus indicator on representative controls", async ({
  page,
}, testInfo) => {
  await page.goto("/workspace-preview/agenda?date=2026-07-19&scenario=normal")

  for (const theme of ["light", "dark"] as const) {
    await selectTheme(page, theme)

    const controls = [
      { label: "sidebar link", locator: page.getByRole("link", { name: "Agenda", exact: true }) },
      {
        label: "primary button",
        locator: page.getByRole("button", { name: "Novo agendamento" }),
      },
    ]

    for (const control of controls) {
      const evidence = await expectRenderedFocusContrast(
        control.locator,
        `${theme} ${control.label}`,
      )
      testInfo.annotations.push({ type: "focus-contrast", description: evidence })
    }

    await page.getByRole("button", { name: "Novo agendamento" }).click()
    const evidence = await expectRenderedFocusContrast(
      page.getByRole("textbox", { name: /^Nome/ }),
      `${theme} drawer input`,
    )
    testInfo.annotations.push({ type: "focus-contrast", description: evidence })
    await page.keyboard.press("Escape")
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

async function expectRenderedFocusContrast(locator: Locator, label: string) {
  await locator.focus()
  await expect(locator, `${label} receives focus`).toBeFocused()
  await locator.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map(async (animation) => {
        try {
          await animation.finished
        } catch {
          // A canceled transition has also reached a terminal state.
        }
      }),
    )
  })

  const indicator = await locator.evaluate((element) => {
    const computed = getComputedStyle(element)
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) throw new Error("Canvas 2D context unavailable")

    const paintPixel = (colors: string[]) => {
      context.clearRect(0, 0, 1, 1)
      for (const color of colors) {
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
      }
      return Array.from(context.getImageData(0, 0, 1, 1).data)
    }

    let surface = element.parentElement
    const surfaceLayers: string[] = []

    while (surface) {
      const color = getComputedStyle(surface).backgroundColor
      const pixel = paintPixel([color])
      if (pixel[3] > 0) surfaceLayers.push(color)
      if (pixel[3] === 255) break
      surface = surface.parentElement
    }

    const surfaceStack = [...surfaceLayers].reverse()

    return {
      background: paintPixel(surfaceStack),
      boxShadow: computed.boxShadow,
      isFocusVisible: element.matches(":focus-visible"),
      outline: paintPixel([computed.outlineColor]),
      outlineColor: computed.outlineColor,
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      renderedOutline: paintPixel([...surfaceStack, computed.outlineColor]),
      surfaceLayers,
    }
  })

  expect(indicator.isFocusVisible, `${label} matches :focus-visible`).toBe(true)
  expect(indicator.outlineStyle, `${label} outline style`).toBe("solid")
  expect(
    Number.parseFloat(indicator.outlineWidth),
    `${label} outline width`,
  ).toBeGreaterThanOrEqual(3)
  expect(indicator.boxShadow, `${label} computed component ring`).not.toBe("none")
  expect(indicator.background[3], `${label} resolved surface is opaque`).toBe(255)
  expect(indicator.outline[3], `${label} settled outline is opaque`).toBe(255)

  const background = pixelToCss(indicator.background)
  const renderedOutline = pixelToCss(indicator.renderedOutline)
  const ratio = contrastRatio(renderedOutline, background)
  expect(
    ratio,
    `${label} rendered outline ${renderedOutline} (${indicator.outlineColor}) over ${background}; component ring ${indicator.boxShadow}`,
  ).toBeGreaterThanOrEqual(3)

  return `${label}: ${ratio.toFixed(2)}:1; outline ${renderedOutline}; surface ${background}; layers ${indicator.surfaceLayers.join(" over ")}`
}

function colorChannels(color: string) {
  const channels = color.match(/[\d.]+/g)?.map(Number)
  if (!channels || channels.length < 3) throw new Error(`Unsupported computed color: ${color}`)
  return [channels[0], channels[1], channels[2], channels[3] ?? 1]
}

function pixelToCss(pixel: number[]) {
  return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3] / 255})`
}

function contrastRatio(foreground: string, background: string) {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (left, right) => right - left,
  )
  return (luminances[0] + 0.05) / (luminances[1] + 0.05)
}

function relativeLuminance(color: string) {
  const channels = colorChannels(color).slice(0, 3)
  const linear = channels.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}
