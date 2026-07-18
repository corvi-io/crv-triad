import { expect, type Locator, test } from "@playwright/test"

async function expectOfficialBrandImage(brand: Locator) {
  const image = brand.locator("img")

  await expect(image).toHaveCount(1)
  await expect(image).toHaveAttribute("src", "/brand/crv-triad-symbol.svg")
  await expect
    .poll(async () =>
      image.evaluate(async (element) => {
        const svg = element as HTMLImageElement
        await svg.decode()

        return {
          complete: svg.complete,
          naturalHeight: svg.naturalHeight,
          naturalWidth: svg.naturalWidth,
        }
      }),
    )
    .toEqual({ complete: true, naturalHeight: 48, naturalWidth: 48 })
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/**", async (route) => {
    await route.fulfill({ body: "null", contentType: "application/json", status: 200 })
  })
})

test("opens the development form catalog without an authenticated session", async ({ page }) => {
  const unexpectedDataRequests: string[] = []
  page.on("request", (request) => {
    if (
      ["fetch", "xhr"].includes(request.resourceType()) &&
      !request.url().includes("/api/auth/")
    ) {
      unexpectedDataRequests.push(request.url())
    }
  })

  await page.goto("/workspace-preview/forms")
  await expect(page.getByRole("heading", { name: "Empresas" })).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Formulário" })).toBeVisible()
  await page.getByRole("button", { name: "Nova empresa" }).click()
  await expect(page.getByRole("dialog", { name: "Novo / Empresa" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Entrar no CRV Triad" })).toHaveCount(0)
  expect(unexpectedDataRequests).toEqual([])
})

test("opens every direct development form URL without a session", async ({ page }) => {
  const previews = [
    ["/workspace-preview/forms/companies", "Empresas", "Nova empresa"],
    ["/workspace-preview/forms/customers", "Clientes", "Novo cliente"],
    ["/workspace-preview/forms/products", "Produtos", "Novo produto"],
    ["/workspace-preview/forms/warehouses", "Depósitos", "Novo depósito"],
    ["/workspace-preview/forms/trucks", "Caminhões", "Novo caminhão"],
    ["/workspace-preview/forms/drivers", "Motoristas", "Novo motorista"],
    ["/workspace-preview/forms/collaborators", "Colaboradores", "Novo colaborador"],
    ["/workspace-preview/forms/permission-profiles", "Perfis de permissão", "Novo perfil"],
  ] as const

  for (const [path, heading, trigger] of previews) {
    await page.goto(path)
    await expect(page.getByRole("heading", { name: heading })).toBeVisible()
    await expect(page.getByRole("button", { name: trigger })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Entrar no CRV Triad" })).toHaveCount(0)
  }
})

test("mouse-reviews a valid direct form without an obstructed footer or persistence", async ({
  page,
}) => {
  const marker = "LOCAL-LOCAL-PERMISSION-REVIEW"
  const unexpectedWrites: string[] = []
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType()) && request.method() !== "GET") {
      unexpectedWrites.push(`${request.method()} ${request.url()}`)
    }
  })

  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto("/workspace-preview/forms/permission-profiles")
  await page.getByRole("button", { name: "Novo perfil" }).click()

  const dialog = page.getByRole("dialog", { name: "Novo / Perfil" })
  await dialog.getByLabel(/^Nome/).fill(marker)
  await dialog.getByRole("checkbox", { name: "Empresas" }).click()

  const reviewButton = dialog.getByRole("button", { name: "Salvar perfil" })
  const devtoolsButton = page.locator('button[aria-label="Open TanStack Router Devtools"]')
  await expect(devtoolsButton).toHaveCount(0)
  const reviewBox = await reviewButton.boundingBox()
  expect(reviewBox).not.toBeNull()
  expect(reviewBox?.y).toBeLessThan(720)

  await reviewButton.click()
  await expect(dialog.getByLabel(/^Nome/)).toHaveValue(marker)
  expect(unexpectedWrites).toEqual([])
  const storage = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }))
  expect(JSON.stringify(storage)).not.toContain(marker)
})

test("keeps a partial localized decimal editable but blocks local review", async ({ page }) => {
  await page.goto("/workspace-preview/forms/products")
  await page.getByRole("button", { name: "Novo produto" }).click()

  const dialog = page.getByRole("dialog", { name: "Novo / Produto" })
  await dialog.getByRole("combobox", { name: /Categoria/ }).click()
  await page.getByRole("option", { name: "Produto" }).click()
  await dialog.getByLabel(/Código único/).fill("PROD-01")
  await dialog.getByLabel(/^Nome/).fill("Produto")
  await dialog.getByRole("combobox", { name: /^Unidade/ }).click()
  await page.getByRole("option", { name: "Tonelada" }).click()
  await dialog.getByLabel("NCM").fill("25171000")
  await dialog.getByLabel("CFOP").fill("5102")
  await dialog.getByLabel("CST").fill("00")
  await dialog.locator("#product-minimum-stock").fill("0,")
  await dialog.locator("#product-maximum-stock").fill("10")

  await expect(dialog.locator("#product-minimum-stock")).toHaveValue("0,")
  await dialog.getByRole("button", { name: "Salvar produto" }).click()
  await expect(dialog.locator("#product-minimum-stock")).toBeFocused()
  await expect(dialog.getByText("Informe um número decimal completo.")).toBeVisible()
  await expect(dialog.getByRole("status")).toHaveCount(0)
})

test("previews expanded and persisted collapsed desktop navigation", async ({ page }) => {
  const unexpectedDataRequests: string[] = []
  page.on("request", (request) => {
    if (
      ["fetch", "xhr"].includes(request.resourceType()) &&
      !request.url().includes("/api/auth/")
    ) {
      unexpectedDataRequests.push(request.url())
    }
  })
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/workspace-preview")

  await expect(page.getByText("Pré-visualização de desenvolvimento")).toBeVisible()
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  )
  await expect(
    page.getByRole("button", { name: "Central de Operações — disponível em breve" }),
  ).toHaveAttribute("aria-disabled", "true")

  const sidebar = page.locator('[data-slot="sidebar"][data-state]')
  const sidebarPanel = page.locator('[data-slot="sidebar-inner"]')
  const sidebarDivider = page.locator('[data-slot="sidebar-divider"]')
  const main = page.locator('[data-slot="sidebar-inset"]')
  const secondaryNavigation = page.getByRole("navigation", { name: "Navegação secundária" })
  const userFooter = page.locator('[data-slot="sidebar-footer"] > [data-slot="sidebar-menu"]')
  const workspaceBrand = page.getByRole("link", { name: "CRV Triad — ir para o Dashboard" })
  const activeItem = page.locator('[data-slot="workspace-primary-navigation-item"][data-active]')
  const activeButton = activeItem.locator('[data-slot="sidebar-menu-button"]')
  const activeIcon = activeButton.locator("svg")
  const activeIndicator = activeItem.locator('[data-slot="workspace-active-indicator"]')
  await expect(sidebar).toHaveAttribute("data-state", "expanded")
  await expectOfficialBrandImage(workspaceBrand)
  await expect
    .poll(async () => await sidebarPanel.boundingBox())
    .toMatchObject({
      height: 900,
      width: 255,
      x: 0,
      y: 0,
    })
  await expect
    .poll(async () => await main.boundingBox())
    .toMatchObject({ height: 900, width: 1185, x: 255, y: 0 })
  await expect
    .poll(async () => await sidebarDivider.boundingBox())
    .toMatchObject({ height: 900, width: 1, x: 254, y: 0 })
  await expect.poll(async () => (await secondaryNavigation.boundingBox())?.y).toBe(756)
  await expect.poll(async () => (await userFooter.boundingBox())?.y).toBe(832)
  await expect
    .poll(async () => await activeItem.boundingBox())
    .toMatchObject({
      height: 40,
      width: 239,
      x: 8,
    })
  await expect
    .poll(async () => await activeButton.boundingBox())
    .toMatchObject({
      height: 32,
      width: 239,
      x: 8,
    })
  expect(
    await activeItem.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        background: style.backgroundColor,
        radius: style.borderRadius,
      }
    }),
  ).toEqual({
    background: "rgb(239, 246, 255)",
    radius: "4px",
  })
  expect(
    await activeButton.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        color: style.color,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        radius: style.borderRadius,
      }
    }),
  ).toEqual({
    color: "rgb(59, 130, 246)",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: "20px",
    paddingLeft: "8px",
    paddingRight: "32px",
    radius: "8px",
  })
  await expect
    .poll(async () => await activeIcon.boundingBox())
    .toMatchObject({ height: 16, width: 16, x: 16 })
  expect(
    await activeIndicator.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        borderColor: style.borderColor,
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        radius: style.borderRadius,
      }
    }),
  ).toEqual({
    borderColor: "rgb(191, 219, 254)",
    borderStyle: "solid",
    borderWidth: "1px",
    radius: "4px",
  })
  await activeButton.focus()
  expect(await activeButton.evaluate((element) => getComputedStyle(element).boxShadow)).toContain(
    "rgb(59, 130, 246)",
  )
  expect(
    await sidebarDivider.evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(229, 229, 229)")
  expect(
    await page.evaluate(() => {
      const sidebarContainer = document.querySelector<HTMLElement>(
        '[data-slot="sidebar-container"]',
      )
      const sidebarPanel = document.querySelector<HTMLElement>('[data-slot="sidebar-inner"]')
      const main = document.querySelector<HTMLElement>('[data-slot="sidebar-inset"]')
      const header = document.querySelector<HTMLElement>('[data-slot="workspace-header"]')

      if (!(sidebarContainer && sidebarPanel && main && header)) {
        throw new Error("Workspace shell geometry is incomplete")
      }

      const containerStyle = getComputedStyle(sidebarContainer)
      const panelStyle = getComputedStyle(sidebarPanel)
      const mainStyle = getComputedStyle(main)
      const headerStyle = getComputedStyle(header)

      return {
        containerBorder: containerStyle.borderRightWidth,
        headerBackground: headerStyle.backgroundColor,
        headerBorder: headerStyle.borderBottomWidth,
        mainBackground: mainStyle.backgroundColor,
        mainBorder: mainStyle.borderLeftWidth,
        panelBackground: panelStyle.backgroundColor,
        panelRadius: panelStyle.borderRadius,
        panelShadow: panelStyle.boxShadow,
      }
    }),
  ).toEqual({
    containerBorder: "0px",
    headerBackground: "rgb(255, 255, 255)",
    headerBorder: "0px",
    mainBackground: "rgb(255, 255, 255)",
    mainBorder: "0px",
    panelBackground: "rgb(250, 250, 250)",
    panelRadius: "0px",
    panelShadow: "none",
  })
  await expect(page.getByRole("button", { name: "Abrir notificações" })).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "Central de alertas — disponível em breve" }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440)

  await page.getByRole("button", { name: "Alternar menu de navegação" }).click()
  await expect(sidebar).toHaveAttribute("data-state", "collapsed")
  await expectOfficialBrandImage(workspaceBrand)
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(1)
  await expect(page.getByRole("link", { name: "Configurações", exact: true })).toHaveCount(1)
  await expect
    .poll(async () => await sidebarPanel.boundingBox())
    .toMatchObject({
      height: 900,
      width: 56,
      x: 0,
      y: 0,
    })
  await expect
    .poll(async () => await main.boundingBox())
    .toMatchObject({ height: 900, width: 1384, x: 56, y: 0 })
  await expect
    .poll(async () => await sidebarDivider.boundingBox())
    .toMatchObject({ height: 900, width: 1, x: 55, y: 0 })
  await expect.poll(async () => (await secondaryNavigation.boundingBox())?.y).toBe(756)
  await expect.poll(async () => (await userFooter.boundingBox())?.y).toBe(832)
  await expect
    .poll(async () => await activeItem.boundingBox())
    .toMatchObject({
      height: 40,
      width: 40,
      x: 8,
    })
  await expect
    .poll(async () => await activeButton.boundingBox())
    .toMatchObject({
      height: 32,
      width: 32,
      x: 12,
    })
  expect(
    await activeButton.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        justifyContent: style.justifyContent,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
      }
    }),
  ).toEqual({
    justifyContent: "center",
    paddingLeft: "0px",
    paddingRight: "0px",
  })
  await expect
    .poll(async () => await activeIcon.boundingBox())
    .toMatchObject({ height: 16, width: 16, x: 20 })
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("sidebar_state")))
    .toBe("false")

  await page.reload()
  await expect(page.locator('[data-slot="sidebar"][data-state]')).toHaveAttribute(
    "data-state",
    "collapsed",
  )
  expect(unexpectedDataRequests).toEqual([])
})

test("keeps destination names available when the desktop sidebar is collapsed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("sidebar_state", "false")
  })
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/workspace-preview")

  await expect(page.locator('[data-slot="sidebar"][data-state]')).toHaveAttribute(
    "data-state",
    "collapsed",
  )
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(1)
  await expect(page.getByRole("link", { name: "Configurações", exact: true })).toHaveCount(1)
})

test("keeps the mobile sheet keyboard-operable and restores trigger focus", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 375 })
  await page.goto("/workspace-preview")
  const trigger = page.getByRole("button", { name: "Alternar menu de navegação" })

  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "Navegação do workspace" })
  await expect(dialog).toBeVisible()
  const activeButton = dialog.getByRole("link", { name: "Dashboard", exact: true })
  await expect(activeButton).toBeVisible()
  expect(
    await activeButton.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
      }
    }),
  ).toEqual({ paddingLeft: "8px", paddingRight: "8px" })

  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test("preserves dark, reduced-motion, skip-link, and 320px behavior", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("triad-web-theme", "dark")
  })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ height: 800, width: 320 })
  await page.goto("/workspace-preview")

  await expect(page.locator("html")).toHaveClass(/dark/)
  expect(
    await page.locator('[data-slot="workspace-header"]').evaluate((element) => {
      const headerStyle = getComputedStyle(element)
      const main = document.querySelector<HTMLElement>('[data-slot="sidebar-inset"]')
      if (!main) {
        throw new Error("Workspace main surface is missing")
      }
      const mainStyle = getComputedStyle(main)
      return {
        border: headerStyle.borderBottomWidth,
        headerBackground: headerStyle.backgroundColor,
        mainBackground: mainStyle.backgroundColor,
      }
    }),
  ).toEqual({
    border: "0px",
    headerBackground: "rgb(23, 23, 23)",
    mainBackground: "rgb(23, 23, 23)",
  })
  await page.keyboard.press("Tab")
  const skipLink = page.getByRole("link", { name: "Ir para o conteúdo" })
  await expect(skipLink).toBeFocused()
  await skipLink.press("Enter")
  await expect(page.locator("#main-content")).toBeFocused()

  const mobileTrigger = page.getByRole("button", { name: "Alternar menu de navegação" })
  await mobileTrigger.click()
  const dialog = page.getByRole("dialog", { name: "Navegação do workspace" })
  const mobileBrand = dialog.getByRole("link", { name: "CRV Triad — ir para o Dashboard" })
  await expectOfficialBrandImage(mobileBrand)
  const darkActiveItem = dialog.locator(
    '[data-slot="workspace-primary-navigation-item"][data-active]',
  )
  expect(
    await darkActiveItem.evaluate((element) => {
      const activeButton = element.querySelector<HTMLElement>('[data-slot="sidebar-menu-button"]')
      const activeIndicator = element.querySelector<HTMLElement>(
        '[data-slot="workspace-active-indicator"]',
      )
      if (!(activeButton && activeIndicator)) {
        throw new Error("Dark selected navigation state is incomplete")
      }
      return {
        background: getComputedStyle(element).backgroundColor,
        border: getComputedStyle(activeIndicator).borderColor,
        foreground: getComputedStyle(activeButton).color,
      }
    }),
  ).toEqual({
    background: "rgb(23, 37, 84)",
    border: "rgb(30, 64, 175)",
    foreground: "rgb(219, 234, 254)",
  })
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(mobileTrigger).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(
    await page.locator('[data-slot="sidebar-wrapper"]').evaluate((element) => {
      return getComputedStyle(element).transitionDuration
    }),
  ).toMatch(/0\.0+1m?s|0s|1e-05s/)
})
