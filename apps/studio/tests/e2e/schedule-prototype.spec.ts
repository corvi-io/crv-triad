import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

const agendaUrl = (scenario = "normal") =>
  `/workspace-preview/agenda?date=2026-07-22&scenario=${scenario}`
const scheduleStates = [
  ["scheduled", "Agendado"],
  ["confirmed", "Confirmado"],
  ["arrived", "Check-in"],
  ["waiting", "Em espera"],
  ["in-progress", "Em atendimento"],
  ["completed", "Finalizado"],
  ["canceled", "Cancelado"],
  ["no-show", "No-show"],
] as const

test("renders the reference-aligned temporal board and passes axe", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto(agendaUrl())

  await expect(page.getByRole("heading", { exact: true, name: "Agenda" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Visualizar como quadro" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  const board = page.getByTestId("agenda-board")
  await expect(board).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Carlos Lima/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Bruno Rocha/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Ana Clara/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /João Vitor/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Diego Rodrigues/ })).toBeVisible()
  await expect(board.getByRole("columnheader", { name: /Marcos Paulo/ })).toBeVisible()
  await expect(board.getByRole("rowheader", { name: "08:00" })).toBeVisible()
  await expect(board.getByRole("rowheader", { name: "08:15" })).toBeVisible()
  await expect(board.locator("[data-appointment-id]")).toHaveCount(42)
  expect(await board.locator("[data-slot=avatar]").count()).toBeGreaterThan(42)
  await expect(page.getByText("Resumo da agenda")).toHaveCount(0)

  const filterGroup = page.getByRole("group", {
    name: "Pesquisa, filtros e visualização da agenda",
  })
  for (const label of ["Barbeiro", "Cliente", "Serviço", "Status", "Unidade"]) {
    await expect(filterGroup.getByRole("button", { name: label })).toBeVisible()
  }
  await expect(filterGroup.getByRole("button", { name: "Período: 22/07" })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("renders the exact weekly interval with a complete accessible list alternative", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto(
    "/workspace-preview/agenda?date=2026-07-22&scenario=typical-week&scope=week&view=board",
  )

  await expect(page.getByText("Semana visível: 20/07 a 26/07")).toBeVisible()
  const week = page.getByRole("region", {
    name: "Agenda semanal de 20/07/2026 a 26/07/2026",
  })
  await expect(week).toBeVisible()
  await expect(week.getByRole("heading", { level: 2 })).toHaveCount(7)
  await expect(page.getByRole("button", { name: "Semana anterior" })).toBeEnabled()
  await expect(page.getByRole("button", { name: "Próxima semana" })).toBeEnabled()
  await page.screenshot({
    fullPage: true,
    path: "../../docs/studio/evidence/eng-55/agenda-week-light-1440.png",
  })

  await page.getByRole("button", { name: "Visualizar como lista" }).click()
  await expect(page.getByRole("table", { name: /Agendamentos filtrados/ })).toBeVisible()
  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])

  await page.setViewportSize({ height: 760, width: 320 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await expect(page.getByRole("table", { name: /Agendamentos filtrados/ })).toBeVisible()
  await page.screenshot({
    fullPage: true,
    path: "../../docs/studio/evidence/eng-55/agenda-week-list-320.png",
  })
})

test("keeps empty-week free slots creatable at 320px and passes axe", async ({ page }) => {
  await page.setViewportSize({ height: 760, width: 320 })
  await page.goto("/workspace-preview/agenda?date=2026-07-22&scenario=empty&scope=week&view=board")

  const week = page.getByRole("region", {
    name: "Agenda semanal de 20/07/2026 a 26/07/2026",
  })
  await expect(week).toBeVisible()
  const firstSlot = week.getByRole("button", { name: /Criar agendamento/ }).first()
  await expect(firstSlot).toBeVisible()
  await firstSlot.click()
  await expect(page.getByRole("dialog", { name: "Novo agendamento" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  const results = await new AxeBuilder({ page })
    .include("#main-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
  await page.screenshot({
    fullPage: true,
    path: "../../docs/studio/evidence/eng-55/agenda-empty-week-create-320.png",
  })
})

test.describe("current-time marker", () => {
  test.use({ timezoneId: "America/Recife" })

  test("shows the labeled local time within the working range and keeps horizontal bounds", async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date("2026-07-22T14:37:00-03:00"))
    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(agendaUrl())

    const board = page.getByTestId("agenda-board")
    const marker = board.getByTestId("agenda-current-time-marker")
    const label = marker.getByText("Agora 14:37")
    await expect(label).toBeVisible()
    await expect(board.locator("caption")).toContainText("Horário atual: 14:37.")

    const bounds = await marker.evaluate((element) => {
      const board = element.closest<HTMLElement>('[data-testid="agenda-board"]')
      const timeCell = element.parentElement
      if (!board || !timeCell) throw new Error("Current-time marker bounds are unavailable")

      const boardBounds = board.getBoundingClientRect()
      const markerBounds = element.getBoundingClientRect()
      const timeBounds = timeCell.getBoundingClientRect()
      return {
        boardLeft: boardBounds.left,
        boardOverflow: getComputedStyle(board).overflow,
        boardRight: boardBounds.right,
        markerLeft: markerBounds.left,
        markerPointerEvents: getComputedStyle(element).pointerEvents,
        markerRight: markerBounds.right,
        markerTop: markerBounds.top,
        timeBottom: timeBounds.bottom,
        timeHeight: timeBounds.height,
        timeRight: timeBounds.right,
        timeTop: timeBounds.top,
        timeWidth: timeBounds.width,
      }
    })
    expect(bounds.timeWidth).toBe(80)
    expect(Math.abs(bounds.markerLeft - bounds.timeRight)).toBeLessThanOrEqual(1)
    expect(bounds.markerLeft).toBeGreaterThan(bounds.boardLeft)
    expect(bounds.markerRight).toBeLessThanOrEqual(bounds.boardRight)
    expect(bounds.boardOverflow).toBe("hidden")
    expect(bounds.markerPointerEvents).toBe("none")
    expect(
      Math.abs(
        bounds.markerTop - (bounds.timeTop + (7 / 15) * (bounds.timeBottom - bounds.timeTop)),
      ),
    ).toBeLessThanOrEqual(1)

    for (const theme of ["light", "dark"] as const) {
      await selectTheme(page, theme)
      await expect(label).toBeVisible()
      const colors = await label.evaluate((element) => {
        const style = getComputedStyle(element)
        return { background: style.backgroundColor, foreground: style.color }
      })
      expect(
        contrastRatio(colors.foreground, colors.background),
        `${theme} marker label`,
      ).toBeGreaterThanOrEqual(4.5)
    }

    const results = await new AxeBuilder({ page })
      .include('[data-testid="agenda-board"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(results.violations).toEqual([])

    await page.emulateMedia({ forcedColors: "active" })
    await page.reload()
    await expect(label).toBeVisible()
    await expect(marker).toHaveCSS("pointer-events", "none")
    expect(await marker.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
      "rgba(0, 0, 0, 0)",
    )
  })

  test("hides the marker on another date and outside the working range", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-07-22T14:37:00-03:00"))
    await page.goto("/workspace-preview/agenda?date=2026-07-23&scenario=normal")
    await expect(page.getByTestId("agenda-current-time-marker")).toHaveCount(0)

    await page.clock.setFixedTime(new Date("2026-07-22T07:59:00-03:00"))
    await page.goto(agendaUrl())
    await expect(page.getByTestId("agenda-current-time-marker")).toHaveCount(0)
  })
})

test("keeps every appointment neutral while status remains textually and visually distinct", async ({
  page,
}) => {
  await page.goto(agendaUrl("all-statuses"))

  for (const theme of ["light", "dark"] as const) {
    await selectTheme(page, theme)
    const badgeBackgrounds = new Set<string>()

    for (const [status, label] of scheduleStates) {
      const card = page.locator(`[data-appointment-status="${status}"]`).first()
      const badge = card.locator(".agenda-appointment-status-badge")
      await expect(card).toBeVisible()
      await expect(badge).toHaveText(label)
      await expect(
        card.getByRole("button", {
          name: new RegExp(`situação ${escapeRegExp(label)}\\. Ver detalhes$`),
        }),
      ).toBeVisible()

      const styles = await card.evaluate((element) => {
        const cardStyle = getComputedStyle(element)
        const indicator = getComputedStyle(element, "::before")
        const badge = element.querySelector<HTMLElement>(".agenda-appointment-status-badge")
        if (!badge) throw new Error("Appointment status badge is missing")
        const badgeStyle = getComputedStyle(badge)
        const rootStyle = getComputedStyle(document.documentElement)
        const sample = document.createElement("span")
        sample.style.backgroundColor = "var(--card)"
        sample.style.color = "var(--card-foreground)"
        document.body.append(sample)
        const neutralStyle = getComputedStyle(sample)
        const result = {
          background: cardStyle.backgroundColor,
          backgroundImage: cardStyle.backgroundImage,
          badgeBackground: badgeStyle.backgroundColor,
          badgeBorder: badgeStyle.borderTopColor,
          badgeForeground: badgeStyle.color,
          border: cardStyle.borderTopColor,
          borderWidth: cardStyle.borderTopWidth,
          foreground: cardStyle.color,
          indicator: indicator.backgroundColor,
          indicatorWidth: indicator.width,
          neutralBackground: neutralStyle.backgroundColor,
          neutralForeground: neutralStyle.color,
          tintStrength: rootStyle.getPropertyValue("--schedule-appointment-tint").trim(),
        }
        sample.remove()
        return result
      })

      expect(styles.background, `${theme} ${status} surface`).toBe(styles.neutralBackground)
      expect(styles.foreground, `${theme} ${status} foreground`).toBe(styles.neutralForeground)
      expect(styles.backgroundImage, `${theme} ${status} tint`).toContain("linear-gradient")
      expect(styles.borderWidth, `${theme} ${status} boundary`).toBe("1px")
      expect(styles.indicatorWidth, `${theme} ${status} indicator`).toBe("3px")
      expect(styles.tintStrength, `${theme} tint bound`).toBe(theme === "dark" ? "12%" : "16%")
      expect(
        contrastRatio(styles.foreground, styles.background),
        `${theme} ${status} card text`,
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(styles.border, styles.background),
        `${theme} ${status} card boundary`,
      ).toBeGreaterThanOrEqual(3)
      expect(
        contrastRatio(styles.indicator, styles.background),
        `${theme} ${status} indicator`,
      ).toBeGreaterThanOrEqual(3)
      expect(
        contrastRatio(styles.badgeForeground, styles.badgeBackground),
        `${theme} ${status} badge text`,
      ).toBeGreaterThanOrEqual(4.5)
      expect(
        contrastRatio(styles.badgeBorder, styles.badgeBackground),
        `${theme} ${status} badge boundary`,
      ).toBeGreaterThanOrEqual(3)
      badgeBackgrounds.add(styles.badgeBackground)
    }

    expect(badgeBackgrounds.size, `${theme} status badge surfaces`).toBe(scheduleStates.length)
  }
})

test("keeps focus stronger than hover and uses restrained drag and drop treatments", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1100, width: 1440 })
  await page.goto(agendaUrl())

  const card = page.locator('[data-appointment-id="kanban-05"]')
  await card.hover()
  await expect(card).toHaveCSS("box-shadow", /0px 4px 12px/)
  await expect(card).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -1)")
  const hover = await card.evaluate((element) => {
    const style = getComputedStyle(element)
    return { boxShadow: style.boxShadow, transform: style.transform }
  })
  expect(hover.boxShadow).toContain("0px 4px 12px")
  expect(hover.transform).toBe("matrix(1, 0, 0, 1, 0, -1)")

  const details = card.getByRole("button", { name: /^Rafael Costa/ })
  await details.focus()
  await expect(details).toBeFocused()
  const focused = await card.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      transform: style.transform,
    }
  })
  expect(focused.boxShadow).not.toBe(hover.boxShadow)
  expect(focused.boxShadow).toContain("0px 0px 0px 2px")
  expect(focused.transform).toBe("none")

  const handle = card.getByRole("button", { name: "Remarcar Rafael Costa" })
  const target = page.locator(
    '[data-drop-professional-id="professional-bruno"][data-drop-start="13:15"]',
  )
  await target.scrollIntoViewIfNeeded()
  await beginPointerDrag(page, handle, target)

  const preview = page.locator(".agenda-appointment-drag-preview")
  await expect(preview).toBeVisible()
  await expect(card).toHaveAttribute("data-dragging", "true")
  await expect(target).toHaveAttribute("data-over", "true")
  const dragStyles = await preview.evaluate((element) => {
    const style = getComputedStyle(element)
    const indicator = getComputedStyle(element, "::before")
    return {
      background: style.backgroundColor,
      border: style.borderColor,
      boxShadow: style.boxShadow,
      indicator: indicator.backgroundColor,
      transform: style.transform,
    }
  })
  const dropStyles = await target.evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, boxShadow: style.boxShadow }
  })
  expect(dragStyles.boxShadow).not.toBe("none")
  expect(dragStyles.border).toBe(dragStyles.indicator)
  expect(dragStyles.transform).not.toBe("none")
  expect(dropStyles.background).not.toBe("rgba(0, 0, 0, 0)")
  expect(dropStyles.boxShadow).not.toBe("none")

  await page.keyboard.press("Escape")
  await page.mouse.up()
  await expect(preview).toBeHidden()
  await expect(handle).toBeFocused()
})

test("removes visual movement for reduced motion and preserves forced-color structure", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(agendaUrl("all-statuses"))
  const card = page.locator('[data-appointment-status="confirmed"]').first()
  await card.hover()
  await expect(card).toHaveCSS("transform", "none")
  const transitionDurationSeconds = await card.evaluate((element) => {
    const duration = getComputedStyle(element).transitionDuration
    return duration.endsWith("ms")
      ? Number.parseFloat(duration) / 1000
      : Number.parseFloat(duration)
  })
  expect(transitionDurationSeconds).toBeLessThanOrEqual(0.00001)

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  await page.reload()
  for (const [status, label] of scheduleStates) {
    const forcedCard = page.locator(`[data-appointment-status="${status}"]`).first()
    await expect(forcedCard).toContainText(label)
    await expect(forcedCard).toHaveCSS("background-image", "none")
    await expect(forcedCard).toHaveCSS("border-top-style", "solid")
    const indicator = await forcedCard.evaluate(
      (element) => getComputedStyle(element, "::before").backgroundColor,
    )
    expect(indicator).not.toBe("rgba(0, 0, 0, 0)")
  }
})

test("preserves system theme, narrow/zoom reflow, sticky axes, and coarse-pointer actions", async ({
  browser,
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.addInitScript(() => window.localStorage.setItem("triad-studio-theme", "system"))
  await page.setViewportSize({ height: 720, width: 320 })
  await page.goto(agendaUrl("dense"))
  await expect(page.locator("html")).toHaveClass(/dark/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

  const timeHeader = page.getByRole("columnheader", { exact: true, name: "Horário" })
  const timeCell = page.getByRole("rowheader", { exact: true, name: "08:00" })
  await expect(timeHeader).toHaveCSS("position", "sticky")
  await expect(timeCell).toHaveCSS("position", "sticky")

  await page.setViewportSize({ height: 900, width: 640 })
  await page.evaluate(() => {
    document.body.style.zoom = "200%"
  })
  await expect(page.getByRole("heading", { exact: true, name: "Agenda" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640)

  const coarseContext = await browser.newContext({
    colorScheme: "dark",
    hasTouch: true,
    isMobile: true,
    viewport: { height: 812, width: 375 },
  })
  await coarseContext.addInitScript(() => {
    window.localStorage.setItem("triad-studio-theme", "system")
  })
  const coarsePage = await coarseContext.newPage()
  await coarsePage.goto(agendaUrl())
  expect(await coarsePage.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true)
  const coarseCard = coarsePage.locator('[data-appointment-id="kanban-05"]')
  const coarseActions = coarseCard.getByRole("button", { name: "Ações de Rafael Costa" })
  const coarseDragHandle = coarseCard.getByRole("button", { name: "Remarcar Rafael Costa" })
  await expect(coarseActions).toBeVisible()
  await expect(coarseDragHandle).toBeVisible()
  for (const control of [coarseActions, coarseDragHandle]) {
    const bounds = await control.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds?.width).toBeGreaterThanOrEqual(24)
    expect(bounds?.height).toBeGreaterThanOrEqual(24)
  }
  await coarseContext.close()
})

test("keeps the sticky time axis above cards after horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 640 })
  await page.goto(agendaUrl())

  const board = page.getByTestId("agenda-board")
  const scrollContainer = board.locator(":scope > div")
  const timeCell = board.getByRole("rowheader", { exact: true, name: "08:00" })
  const appointment = board.locator('[data-appointment-id="kanban-01"]')

  await expect(timeCell).toBeVisible()
  await expect(appointment).toBeVisible()
  await scrollContainer.evaluate((element) => {
    element.scrollLeft = 120
  })

  const stacking = await timeCell.evaluate((element) => {
    const appointment = document.querySelector<HTMLElement>('[data-appointment-id="kanban-01"]')
    const scrollContainer = element.closest<HTMLElement>(".agenda-grid-scroll")
    if (!appointment || !scrollContainer) return null

    const timeBounds = element.getBoundingClientRect()
    const appointmentBounds = appointment.getBoundingClientRect()
    const point = {
      x: timeBounds.left + timeBounds.width / 2,
      y: timeBounds.top + timeBounds.height / 2,
    }
    const hit = document.elementFromPoint(point.x, point.y)

    return {
      appointmentCoversPoint:
        appointmentBounds.left < point.x &&
        appointmentBounds.right > point.x &&
        appointmentBounds.top < point.y &&
        appointmentBounds.bottom > point.y,
      appointmentWinsHitTest: hit !== null && appointment.contains(hit),
      scrollLeft: scrollContainer.scrollLeft,
      timeAxisWinsHitTest: hit !== null && element.contains(hit),
    }
  })

  expect(stacking).toEqual({
    appointmentCoversPoint: true,
    appointmentWinsHitTest: false,
    scrollLeft: 120,
    timeAxisWinsHitTest: true,
  })
})

test("filters from button menus, selects a period, and switches to Lista", async ({ page }) => {
  await page.goto(agendaUrl())

  const barber = page.getByRole("button", { name: "Barbeiro" })
  await expect(barber).toContainText("6")
  await barber.click()
  await page.getByLabel("Pesquisar barbeiro").fill("Carlos")
  await page.getByRole("menuitemcheckbox", { name: "Carlos Lima" }).click()
  await expect(page).toHaveURL(/professional=professional-carlos/)
  await expect(barber).toContainText("1")
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Status" }).click()
  await page.getByRole("menuitemcheckbox", { name: "Confirmado" }).click()
  await expect(page).toHaveURL(/status=confirmed/)
  await expect(page.locator("[data-appointment-id]")).toHaveCount(1)
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Período: 22/07" }).click()
  await expect(page.getByRole("dialog", { name: "Período da agenda" })).toBeVisible()
  await page.getByRole("button", { name: "7 dias" }).click()
  await expect(page).toHaveURL(/period=next-seven-days/)

  await page.getByRole("button", { name: "Visualizar como lista" }).click()
  await expect(page).toHaveURL(/view=list/)
  await expect(page.getByRole("table", { name: /Agendamentos filtrados/ })).toBeVisible()
})

test("opens a portrait card and completes the non-drag status path", async ({ page }) => {
  await page.goto(agendaUrl())

  const card = page.locator('[data-appointment-id="kanban-02"]')
  await expect(card).toContainText("Carlos Eduardo")
  await expect(card).toContainText("Em atendimento")
  await expect(card.locator("[data-slot=avatar]")).toBeVisible()

  await card.getByRole("button", { name: "Ações de Carlos Eduardo" }).click()
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await page.getByRole("radio", { name: "Em espera" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()
  await expect(page.getByText("Status atualizado para “Em espera”.")).toBeVisible()
  await expect(card).toContainText("Em espera")

  await card.getByRole("button", { name: /^Carlos Eduardo/ }).click()
  await expect(page.getByRole("dialog", { name: "Agenda / Ver agendamento" })).toBeVisible()
})

test("contains short appointment cards within proportional 15-minute rows", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto(agendaUrl("short-durations"))

  const cases = [
    { duration: 15, height: 28, id: "duration-15", layout: "compact", nextSlot: "08:15" },
    { duration: 30, height: 64, id: "duration-30", layout: "medium", nextSlot: "09:30" },
    { duration: 45, height: 100, id: "duration-45", layout: "full", nextSlot: "10:45" },
  ] as const

  const measuredHeights: number[] = []
  for (const item of cases) {
    const card = page.locator(`[data-appointment-id="${item.id}"]`)
    await expect(card).toHaveAttribute("data-card-layout", item.layout)
    await expect(card).toHaveAttribute("data-duration-minutes", String(item.duration))
    await expect(card.getByRole("button", { name: /^Ações de / })).toBeAttached()
    await expect(card.getByRole("button", { name: /^Remarcar / })).toBeAttached()
    if (item.layout === "compact") {
      await expect(card.locator(".agenda-compact-status-symbol")).not.toBeEmpty()
      await expect(card.locator(".agenda-appointment-status-badge")).toHaveCount(0)
    } else {
      await expect(card.locator(".agenda-appointment-status-badge")).toBeVisible()
    }

    const measurement = await card.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const cellContent = element.parentElement?.getBoundingClientRect()
      return {
        cellContentHeight: cellContent?.height ?? 0,
        clientHeight: element.clientHeight,
        height: bounds.height,
        overflow: getComputedStyle(element).overflow,
        scrollHeight: element.scrollHeight,
      }
    })
    expect(measurement.height).toBe(item.height)
    expect(measurement.height).toBe(measurement.cellContentHeight)
    expect(measurement.overflow).toBe("hidden")
    expect(measurement.scrollHeight).toBeLessThanOrEqual(measurement.clientHeight)
    measuredHeights.push(measurement.height)

    const nextSlot = page.locator(
      `[data-drop-professional-id="professional-carlos"][data-drop-start="${item.nextSlot}"]`,
    )
    const [cardBounds, nextSlotBounds] = await Promise.all([
      card.boundingBox(),
      nextSlot.boundingBox(),
    ])
    expect(cardBounds).not.toBeNull()
    expect(nextSlotBounds).not.toBeNull()
    if (cardBounds && nextSlotBounds) {
      expect(cardBounds.y + cardBounds.height).toBeLessThanOrEqual(nextSlotBounds.y)
    }
  }

  expect(measuredHeights[1] - measuredHeights[0]).toBe(36)
  expect(measuredHeights[2] - measuredHeights[1]).toBe(36)

  const compact = page.locator('[data-appointment-id="duration-15"]')
  await expect(compact).toContainText("Cliente quinze")
  await expect(compact).toContainText("08:00")
  const compactHandle = compact.getByRole("button", { name: "Remarcar Cliente quinze" })
  await compactHandle.focus()
  await expect(compactHandle).toBeFocused()
  await compact.getByRole("button", { name: "Ações de Cliente quinze" }).click()
  await expect(page.getByRole("menuitem", { name: "Ver detalhes" })).toBeVisible()
})

test("reschedules vertically, horizontally, and diagonally without changing status", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1100, width: 1440 })
  await page.goto(agendaUrl())

  const card = page.locator('[data-appointment-id="kanban-05"]')
  await expect(card).toContainText("Confirmado")

  await dragAppointment(page, "kanban-05", "professional-carlos", "13:15")
  await expect(page.getByText("Agendamento remarcado para 13:15 com Carlos Lima.")).toBeVisible()
  await expect(card).toContainText("13:15")
  await expect(card).toContainText("Confirmado")

  await dragAppointment(page, "kanban-05", "professional-bruno", "13:15")
  await expect(page.getByText("Agendamento remarcado para 13:15 com Bruno Rocha.")).toBeVisible()
  await expect(card).toContainText("13:15")
  await expect(card).toContainText("Confirmado")

  await dragAppointment(page, "kanban-05", "professional-ana", "14:00")
  await expect(page.getByText("Agendamento remarcado para 14:00 com Ana Clara.")).toBeVisible()
  await expect(card).toContainText("14:00")
  await expect(card).toContainText("Confirmado")
})

test("supports keyboard rescheduling with Portuguese live announcements", async ({ page }) => {
  await page.setViewportSize({ height: 1100, width: 1440 })
  await page.goto(agendaUrl())

  const card = page.locator('[data-appointment-id="kanban-05"]')
  const handle = card.getByRole("button", { name: "Remarcar Rafael Costa" })
  await handle.focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("Space")
  await expect(
    page.locator("#main-content").getByText("O agendamento já está nesse horário e barbeiro."),
  ).toBeAttached()
  await expect(card).toContainText("11:00")

  await handle.focus()
  await page.keyboard.press("Space")
  await expect(page.getByText(/Remarcando Rafael Costa\. Use as setas/)).toBeAttached()
  for (let step = 0; step < 10; step += 1) {
    await page.keyboard.press("ArrowDown")
  }
  await page.keyboard.press("ArrowRight")
  await expect(page.getByText(/Destino 13:30 com Bruno Rocha/)).toBeAttached()
  await page.keyboard.press("Space")

  await expect(page.getByText("Agendamento remarcado para 13:30 com Bruno Rocha.")).toBeVisible()
  await expect(card).toContainText("13:30")
  await expect(card).toContainText("Confirmado")
  await expect(handle).toBeFocused()
})

test("rolls back appointment and hidden occupancy atomically after a conflict", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto(`${agendaUrl()}&professional=professional-carlos&client=client-kanban-02`)

  const card = page.locator('[data-appointment-id="kanban-02"]')
  await expect(card).toContainText("08:45")
  await expect(page.getByText("Ocupado · 08:00–08:45")).toBeVisible()
  await dragAppointment(page, "kanban-02", "professional-carlos", "08:00")

  await expect(
    page.getByLabel("Notifications alt+T").getByText(/não tem espaço suficiente.*restaurado/i),
  ).toBeVisible()
  await expect(card).toContainText("08:45")
  await expect(card).toContainText("Em atendimento")
  await expect(page.getByText("Ocupado · 08:00–08:45")).toBeVisible()
})

test("disables drag for terminal appointments while preserving details", async ({ page }) => {
  await page.goto(agendaUrl())

  const terminal = page.locator('[data-appointment-id="kanban-01"]')
  await expect(
    terminal.getByRole("button", { name: "Remarcação indisponível para João Vitor" }),
  ).toBeDisabled()
  await terminal.getByRole("button", { name: /^João Vitor/ }).click()
  await expect(page.getByRole("dialog", { name: "Agenda / Ver agendamento" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Remarcar" })).toHaveCount(0)
})

test("keeps the board bounded and applies and resets development scenarios", async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 640 })
  await page.goto(agendaUrl("dense"))

  const board = page.getByTestId("agenda-board")
  const dimensions = await board.evaluate((element) => {
    const scroll = element.firstElementChild
    if (!(scroll instanceof HTMLElement)) return { clientWidth: 0, scrollWidth: 0 }
    return { clientWidth: scroll.clientWidth, scrollWidth: scroll.scrollWidth }
  })
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640)

  await page.setViewportSize({ height: 900, width: 1440 })
  await page.getByRole("button", { name: "Configurações do protótipo" }).click()
  await expect(page.getByText("Cenário de desenvolvimento")).toBeVisible()
  await expect(page.getByRole("menuitemradio", { name: /Denso/ })).toBeChecked()

  await page.getByRole("menuitemradio", { name: /Muitos profissionais/ }).click()
  await expect(page).toHaveURL(/scenario=many-professionals/)
  await expect(board.locator("[data-appointment-id]")).toHaveCount(42)
  await expect(board.getByRole("columnheader", { name: /Profissional Sintético 7/ })).toBeVisible()

  await page.getByRole("button", { name: "Configurações do protótipo" }).click()

  await page.getByRole("menuitemradio", { name: /Vazio/ }).click()
  await expect(page).toHaveURL(/scenario=empty/)
  await expect(page.getByRole("heading", { name: "Agenda livre no período" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Adicionar agendamento" })).toBeVisible()

  await page.getByRole("button", { name: "Configurações do protótipo" }).click()
  await page.getByRole("menuitemradio", { name: /Todos os status/ }).click()
  await expect(page).toHaveURL(/scenario=all-statuses/)
  await expect(page.locator("[data-appointment-id]")).toHaveCount(8)

  const confirmed = page.locator('[data-appointment-id="status-confirmed"]')
  await expect(confirmed).toContainText("Confirmado")
  await confirmed.getByRole("button", { name: "Ações de Cliente confirmado" }).click()
  await page.getByRole("menuitem", { name: "Alterar status" }).click()
  await page.getByRole("radio", { name: "Em espera" }).click()
  await page.getByRole("button", { name: "Confirmar alteração" }).click()
  await expect(confirmed).toContainText("Em espera")

  await page.getByRole("button", { name: "Configurações do protótipo" }).click()
  await page.getByRole("menuitem", { name: "Restaurar cenário" }).click()
  await expect(confirmed).toContainText("Confirmado")
})

async function selectTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((nextTheme) => {
    localStorage.setItem("triad-studio-theme", nextTheme)
  }, theme)
  await page.reload()
  await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^$/)
}

async function beginPointerDrag(
  page: Page,
  handle: import("@playwright/test").Locator,
  target: import("@playwright/test").Locator,
) {
  const sourceBox = await handle.boundingBox()
  const targetBox = await target.boundingBox()
  expect(sourceBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  if (!sourceBox || !targetBox) return

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 8, sourceBox.y + sourceBox.height / 2, {
    steps: 2,
  })
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 12,
  })
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
  if (!channels || channels.length < 3) {
    throw new Error(`Unsupported computed color: ${color}`)
  }
  const linear = channels.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function dragAppointment(
  page: import("@playwright/test").Page,
  appointmentId: string,
  professionalId: string,
  start: string,
) {
  const handle = page
    .locator(`[data-appointment-id="${appointmentId}"]`)
    .getByRole("button", { name: /^Remarcar / })
  const target = page.locator(
    `[data-drop-professional-id="${professionalId}"][data-drop-start="${start}"]`,
  )
  await target.scrollIntoViewIfNeeded()
  const sourceBox = await handle.boundingBox()
  const targetBox = await target.boundingBox()
  expect(sourceBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  if (!sourceBox || !targetBox) return

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 8, sourceBox.y + sourceBox.height / 2, {
    steps: 2,
  })
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 12,
  })
  await page.mouse.up()
}
