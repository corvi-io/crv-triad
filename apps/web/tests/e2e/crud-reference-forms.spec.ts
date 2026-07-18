import { expect, type Locator, type Page, test } from "@playwright/test"

type RemainingFormCase = {
  addAnother: string
  fillValid: (page: Page, dialog: Locator, marker: string) => Promise<void>
  firstInvalid: RegExp
  firstSection: string
  header: string
  markerLabel: RegExp
  path: string
  save: string
  switchName?: string
  trigger: string
}

async function selectFirstCalendarDate(page: Page, dialog: Locator, label: RegExp) {
  const trigger = dialog.getByLabel(label)
  await trigger.click()
  const calendar = page.locator('[data-slot="calendar"]')
  await expect(calendar.getByRole("button", { name: "Ir para o mês anterior" })).toBeVisible()
  await expect(calendar.getByRole("button", { name: "Ir para o próximo mês" })).toBeVisible()
  await expect(calendar.getByRole("combobox", { name: "Escolha o mês" })).toBeVisible()
  await expect(calendar.getByRole("combobox", { name: "Escolha o ano" })).toBeVisible()
  await expect(calendar.getByRole("button", { name: /Go to the/i })).toHaveCount(0)
  await expect(calendar.getByRole("combobox", { name: /Choose the/i })).toHaveCount(0)

  const today = calendar.getByRole("button", { name: /^Hoje, / })
  await expect(today).toBeFocused()
  await today.click()
  await expect(trigger).toContainText(/\d{2}\/\d{2}\/\d{4}/)
}

const remainingFormCases: readonly RemainingFormCase[] = [
  {
    path: "/workspace-preview/forms/customers",
    trigger: "Novo cliente",
    header: "Novo / Cliente",
    firstSection: "Dados gerais",
    firstInvalid: /CNPJ/,
    markerLabel: /Razão social/,
    addAnother: "Salvar e adicionar outro",
    save: "Salvar cliente",
    switchName: "Compra produtos",
    fillValid: async (_page, dialog, marker) => {
      await dialog.getByLabel(/CNPJ/).fill("12345678000190")
      await dialog.getByLabel(/Razão social/).fill(marker)
      await dialog.getByLabel(/^CEP/).fill("50000000")
      await dialog.getByLabel(/Nome do contato/).fill("Contato local")
      await dialog.getByLabel(/Observações/).fill("Revisão local do cliente")
    },
  },
  {
    path: "/workspace-preview/forms/products",
    trigger: "Novo produto",
    header: "Novo / Produto",
    firstSection: "Informações",
    firstInvalid: /Categoria/,
    markerLabel: /^Nome/,
    addAnother: "Salvar e adicionar outro",
    save: "Salvar produto",
    switchName: "Produto ativo",
    fillValid: async (page, dialog, marker) => {
      await dialog.getByRole("combobox", { name: /Categoria/ }).click()
      await page.getByRole("option", { name: "Produto" }).click()
      await dialog.getByLabel(/Código único/).fill("LOCAL-01")
      await dialog.getByLabel(/^Nome/).fill(marker)
      await dialog.getByRole("combobox", { name: /^Unidade/ }).click()
      await page.getByRole("option", { name: "Tonelada" }).click()
      await dialog.locator("#product-minimum-stock").fill("1")
      await dialog.locator("#product-maximum-stock").fill("10")
      await dialog.getByLabel("NCM").fill("2517.10.00")
      await dialog.getByLabel("CFOP").fill("5102")
      await dialog.getByLabel("CST").fill("00")
      await dialog.getByRole("combobox", { name: "Estoque mínimo: unidade" }).click()
      await page.getByRole("option", { name: "kg", exact: true }).click()
      await expect(dialog.getByRole("combobox", { name: "Estoque máximo: unidade" })).toContainText(
        "kg",
      )
      await dialog.getByLabel(/Observações/).fill("Revisão local do produto")
      await expect(dialog.getByLabel("NCM")).toBeEnabled()
    },
  },
  {
    path: "/workspace-preview/forms/warehouses",
    trigger: "Novo depósito",
    header: "Novo / Depósito",
    firstSection: "Informações",
    firstInvalid: /^Nome/,
    markerLabel: /^Nome/,
    addAnother: "Salvar e adicionar outro",
    save: "Salvar depósito",
    switchName: "Depósito principal",
    fillValid: async (page, dialog, marker) => {
      await dialog.getByLabel(/^Nome/).fill(marker)
      await dialog.getByRole("combobox", { name: /Empresa/ }).click()
      await page.getByRole("option", { name: "Empresa Exemplo" }).click()
      await dialog.getByRole("combobox", { name: /^Tipo/ }).click()
      await page.getByRole("option", { name: "Depósito", exact: true }).click()
      await dialog.getByLabel(/^CEP/).fill("50000000")
      await dialog.getByRole("combobox", { name: /Colaborador/ }).fill("Responsável local")
      await dialog.locator("#warehouse-minimum-stock").fill("1")
      await dialog.locator("#warehouse-maximum-stock").fill("10")
      await dialog.getByRole("combobox", { name: "Estoque mínimo: unidade" }).click()
      await page.getByRole("option", { name: "m³", exact: true }).click()
      await dialog.getByLabel(/Observações/).fill("Revisão local do depósito")
    },
  },
  {
    path: "/workspace-preview/forms/trucks",
    trigger: "Novo caminhão",
    header: "Novo / Caminhão",
    firstSection: "Identificação",
    firstInvalid: /Placa/,
    markerLabel: /Placa/,
    addAnother: "Salvar e adicionar outro",
    save: "Salvar caminhão",
    switchName: "Caminhão próprio",
    fillValid: async (page, dialog) => {
      await dialog.getByLabel(/Placa/).fill("ABC1D23")
      await dialog.getByRole("combobox", { name: /Marca/ }).click()
      await page.getByRole("option", { name: "Mercedes-Benz" }).click()
      await selectFirstCalendarDate(page, dialog, /^CRLV/)
      await selectFirstCalendarDate(page, dialog, /^Licenciamento/)
      await dialog.locator("#truck-capacity").fill("12,5")
      await dialog.getByRole("combobox", { name: "Capacidade: unidade" }).click()
      await page.getByRole("option", { name: "t", exact: true }).click()
      await dialog.locator("#truck-volume").fill("18")
      await dialog.getByRole("combobox", { name: "Volume m³: unidade" }).click()
      await page.locator('[role="option"]:visible').filter({ hasText: /^m³$/ }).click()
      await dialog.getByRole("combobox", { name: /Depósito base/ }).fill("Depósito Central")
      await dialog.getByLabel(/Observações/).fill("Revisão local do caminhão")
    },
  },
  {
    path: "/workspace-preview/forms/drivers",
    trigger: "Novo motorista",
    header: "Novo / Motorista",
    firstSection: "Dados gerais",
    firstInvalid: /^Nome/,
    markerLabel: /^Nome/,
    addAnother: "Salvar e adicionar outro",
    save: "Salvar motorista",
    switchName: "Atividade remunerada",
    fillValid: async (page, dialog, marker) => {
      await dialog.getByLabel(/^Nome/).fill(marker)
      await selectFirstCalendarDate(page, dialog, /^Data de nascimento/)
      await dialog.getByLabel(/^Telefone/).fill("81999990000")
      await dialog.getByLabel(/^Número/).fill("12345678900")
      await selectFirstCalendarDate(page, dialog, /^Validade/)
      await dialog.getByRole("combobox", { name: /Caminhão principal/ }).fill("ABC1D23")
      await dialog.getByLabel(/Observações/).fill("Revisão local do motorista")
    },
  },
  {
    path: "/workspace-preview/forms/collaborators",
    trigger: "Novo colaborador",
    header: "Novo / Colaborador",
    firstSection: "Identificação",
    firstInvalid: /^Nome/,
    markerLabel: /^Nome/,
    addAnother: "Salvar e adicionar outro",
    save: "Salvar colaborador",
    switchName: "Recebe notificações",
    fillValid: async (page, dialog, marker) => {
      await dialog.getByLabel(/^Nome/).fill(marker)
      await dialog.getByRole("combobox", { name: /Empresa/ }).click()
      await page.getByRole("option", { name: "Empresa Exemplo" }).click()
      await dialog.getByRole("combobox", { name: /^Perfil/ }).click()
      await page.getByRole("option", { name: "Operação" }).click()
      await dialog.locator("#collaborator-username").fill("colaborador.local")
      await dialog.getByRole("button", { name: "Gerar senha segura" }).click()
      await expect(dialog.locator("#collaborator-password")).toHaveValue(
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{20}$/,
      )
      await dialog.getByLabel(/Observações/).fill("Revisão local do colaborador")
    },
  },
  {
    path: "/workspace-preview/forms/permission-profiles",
    trigger: "Novo perfil",
    header: "Novo / Perfil",
    firstSection: "Identificação",
    firstInvalid: /^Nome/,
    markerLabel: /^Nome/,
    addAnother: "Salvar e adicionar outro",
    save: "Salvar perfil",
    fillValid: async (_page, dialog, marker) => {
      await dialog.getByLabel(/^Nome/).fill(marker)
      await dialog.getByLabel(/Descrição/).fill("Descrição local do perfil")
      const companies = dialog.getByRole("checkbox", { name: "Empresas" })
      await companies.click()
      await companies.click()
    },
  },
]

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/**", async (route) => {
    if (route.request().url().includes("get-session")) {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          session: {
            id: "session-reference",
            expiresAt: "2099-01-01T00:00:00.000Z",
            token: "redacted-test-token",
            userId: "user-reference",
          },
          user: {
            id: "user-reference",
            email: "reference@example.com",
            name: "Usuário de Referência",
          },
        }),
      })
      return
    }

    await route.fulfill({ body: "null", contentType: "application/json", status: 200 })
  })
})

test("matches the company drawer contract and validates both local submit intents", async ({
  page,
}) => {
  const unexpectedWrites: string[] = []
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType()) && request.method() !== "GET") {
      unexpectedWrites.push(`${request.method()} ${request.url()}`)
    }
  })
  await page.addInitScript(() => {
    const storageWrites: string[] = []
    Object.defineProperty(window, "__localStorageWrites", { value: storageWrites })
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function setItem(key, value) {
      storageWrites.push(`${key}:${value}`)
      return originalSetItem.call(this, key, value)
    }
  })

  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/workspace-preview/forms/companies")
  await page.getByRole("button", { name: "Nova empresa" }).click()

  const dialog = page.getByRole("dialog", { name: "Novo / Empresa" })
  await expect(dialog).toBeVisible()
  await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(640)

  const body = dialog.locator("[data-slot='scroll-area-viewport']")
  const header = dialog.locator("[data-slot='sheet-header']")
  const firstSection = dialog.locator("[data-slot='collapsible']").first()
  await expect.poll(async () => Math.round((await body.boundingBox())?.width ?? 0)).toBe(640)
  await expect
    .poll(async () => Math.round((await firstSection.boundingBox())?.width ?? 0))
    .toBe(592)
  const headerBox = await header.boundingBox()
  const firstSectionBox = await firstSection.boundingBox()
  expect(
    Math.round((firstSectionBox?.y ?? 0) - (headerBox?.y ?? 0) - (headerBox?.height ?? 0)),
  ).toBe(16)

  const sectionNames = ["Dados gerais", "Localização", "Contato", "Fiscal", "Configurações"]
  for (const name of sectionNames) {
    const disclosure = dialog.getByRole("button", { name })
    await expect(disclosure).toHaveAttribute("aria-expanded", "true")
    await expect(disclosure.locator("svg.lucide-chevron-down")).toHaveCount(1)
  }
  await expect(dialog.locator("label svg[aria-hidden='true']")).not.toHaveCount(0)
  await expect(dialog.locator("label .lucide-paperclip")).toHaveCount(1)
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Salvar e adicionar outra" })).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Salvar empresa" })).toBeVisible()

  const cnpj = dialog.getByLabel(/^CNPJ/)
  const cnpjLabel = dialog.locator("label[for='company-cnpj']")
  const rowBox = await cnpjLabel.locator("xpath=..").boundingBox()
  const controlBox = await cnpj.boundingBox()
  expect(Math.round((controlBox?.x ?? 0) - (rowBox?.x ?? 0) - 24)).toBe(200)
  expect(Math.round(controlBox?.width ?? 0)).toBe(344)
  expect(Math.round(controlBox?.height ?? 0)).toBe(32)

  const closeButton = dialog.getByRole("button", { name: "Fechar" })
  expect(Math.round((await closeButton.boundingBox())?.width ?? 0)).toBe(28)
  expect(Math.round((await closeButton.locator("svg").boundingBox())?.width ?? 0)).toBe(16)
  for (const actionName of ["Cancelar", "Salvar e adicionar outra", "Salvar empresa"]) {
    expect(
      Math.round(
        (await dialog.getByRole("button", { name: actionName }).boundingBox())?.height ?? 0,
      ),
    ).toBe(36)
  }

  const generalDisclosure = dialog.getByRole("button", { name: "Dados gerais" })
  await generalDisclosure.click()
  await expect(generalDisclosure).toHaveAttribute("aria-expanded", "false")
  await expect(cnpj).toBeHidden()

  await dialog.getByRole("button", { name: "Salvar empresa" }).click()
  await expect(generalDisclosure).toHaveAttribute("aria-expanded", "true")
  await expect(cnpj).toBeVisible()
  await expect(cnpj).toBeFocused()
  await dialog.getByRole("button", { name: "Salvar e adicionar outra" }).click()
  await expect(cnpj).toBeFocused()

  const draftMarker = "LOCAL-COMPANY-NOT-STORED"
  await cnpj.fill("12345678000190")
  await dialog.getByLabel(/^Razão social/).fill(draftMarker)
  await dialog.getByLabel(/^Telefone/).fill("81999990000")
  await dialog.getByLabel(/^E-mail/).fill("empresa@example.com")
  await dialog.getByRole("combobox", { name: /^Ambiente SEFAZ/ }).click()
  await page.getByRole("option", { name: "Homologação" }).click()
  const certificateMarker = "local-certificate-fixture.txt"
  const certificatePasswordMarker = "Certificado!LOCAL"
  await dialog
    .locator("input#company-certificate")
    .setInputFiles("tests/fixtures/local-certificate-fixture.txt")
  await expect(dialog.getByText(certificateMarker)).toBeVisible()
  await dialog.getByLabel(/^Senha do certificado/).fill(certificatePasswordMarker)

  await dialog.getByRole("button", { name: "Salvar e adicionar outra" }).click()
  await expect(dialog.getByLabel(/^Razão social/)).toHaveValue(draftMarker)
  await expect(dialog.getByText(certificateMarker)).toBeVisible()

  await dialog.getByRole("button", { name: "Salvar empresa" }).click()
  await expect(dialog.getByLabel(/^Razão social/)).toHaveValue(draftMarker)
  await expect(dialog.getByText(certificateMarker)).toBeVisible()

  expect(unexpectedWrites).toEqual([])
  const storageEvidence = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
    writes: (window as unknown as { __localStorageWrites: string[] }).__localStorageWrites,
  }))
  expect(storageEvidence.writes).toEqual([])
  expect(JSON.stringify(storageEvidence)).not.toContain(draftMarker)
  expect(JSON.stringify(storageEvidence)).not.toContain(certificateMarker)
  expect(JSON.stringify(storageEvidence)).not.toContain(certificatePasswordMarker)
  await expect(page.getByText(/salva com sucesso|empresa salva/i)).toHaveCount(0)
})

test("reopens a selected date on its month and restores focus to its day", async ({ page }) => {
  await page.goto("/workspace-preview/forms/drivers")
  await page.getByRole("button", { name: "Novo motorista" }).click()

  const dialog = page.getByRole("dialog", { name: "Novo / Motorista" })
  const trigger = dialog.getByLabel(/^Data de nascimento/)
  await trigger.click()

  const calendar = page.locator('[data-slot="calendar"]')
  await calendar.getByRole("button", { name: "Ir para o mês anterior" }).click()
  const monthValue = await calendar.getByRole("combobox", { name: "Escolha o mês" }).inputValue()
  const yearValue = await calendar.getByRole("combobox", { name: "Escolha o ano" }).inputValue()
  const day = calendar.getByRole("button", { name: /^[^,]+, 15 de .+ de \d{4}$/ })
  const dayName = await day.getAttribute("aria-label")
  expect(dayName).not.toBeNull()

  await day.click()
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText(/^15\/\d{2}\/\d{4}$/)

  await trigger.click()
  await expect(calendar.getByRole("combobox", { name: "Escolha o mês" })).toHaveValue(monthValue)
  await expect(calendar.getByRole("combobox", { name: "Escolha o ano" })).toHaveValue(yearValue)
  const selectedDay = calendar.getByRole("button", {
    exact: true,
    name: `${dayName}, selecionado`,
  })
  await expect(selectedDay).toHaveAccessibleName(`${dayName}, selecionado`)
  await expect(selectedDay).toBeFocused()
})

for (const formCase of remainingFormCases) {
  test(`${formCase.header} matches its audited direct-preview contract and keeps both intents local`, async ({
    page,
  }) => {
    const unexpectedWrites: string[] = []
    page.on("request", (request) => {
      if (["fetch", "xhr"].includes(request.resourceType()) && request.method() !== "GET") {
        unexpectedWrites.push(`${request.method()} ${request.url()}`)
      }
    })
    await page.addInitScript(() => {
      const storageWrites: string[] = []
      Object.defineProperty(window, "__localStorageWrites", { value: storageWrites })
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = function setItem(key, value) {
        storageWrites.push(`${key}:${value}`)
        return originalSetItem.call(this, key, value)
      }
    })

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(formCase.path)
    await page.getByRole("button", { name: formCase.trigger }).click()

    const dialog = page.getByRole("dialog", { name: formCase.header })
    await expect(dialog).toBeVisible()
    await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(640)
    const firstSection = dialog.locator("[data-slot='collapsible']").first()
    await expect
      .poll(async () => Math.round((await firstSection.boundingBox())?.width ?? 0))
      .toBe(592)
    const sections = dialog.locator("[data-slot='collapsible']")
    const sectionCount = await sections.count()
    expect(sectionCount).toBeGreaterThan(0)
    for (let index = 0; index < sectionCount; index += 1) {
      const sectionDisclosure = sections.nth(index).locator("button[aria-expanded]").first()
      await expect(sectionDisclosure).toHaveAttribute("aria-expanded", "true")
      await expect(sectionDisclosure.locator("svg.lucide-chevron-down")).toHaveCount(1)
    }
    const disclosure = dialog.getByRole("button", { name: formCase.firstSection })
    await expect(disclosure).toHaveAttribute("aria-expanded", "true")
    await expect(disclosure.locator("svg.lucide-chevron-down")).toHaveCount(1)
    await expect(dialog.locator("label svg[aria-hidden='true']")).not.toHaveCount(0)
    await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: formCase.addAnother })).toBeVisible()
    await expect(dialog.getByRole("button", { name: formCase.save })).toBeVisible()

    await disclosure.focus()
    await disclosure.press("Space")
    await expect(disclosure).toHaveAttribute("aria-expanded", "false")
    await disclosure.press("Enter")
    await expect(disclosure).toHaveAttribute("aria-expanded", "true")

    if (formCase.switchName) {
      const toggle = dialog.getByRole("switch", { name: formCase.switchName })
      const initialState = await toggle.getAttribute("aria-checked")
      if (formCase.switchName === "Atividade remunerada") {
        await expect(dialog.getByText("Sim", { exact: true })).toBeVisible()
      }
      await toggle.click()
      await expect(toggle).not.toHaveAttribute("aria-checked", initialState ?? "")
      if (formCase.switchName === "Atividade remunerada") {
        await expect(dialog.getByText("Não", { exact: true })).toBeVisible()
      }
      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-checked", initialState ?? "true")
    }

    const firstInvalid = dialog.getByLabel(formCase.firstInvalid)
    await dialog.getByRole("button", { name: formCase.save }).click()
    await expect(firstInvalid).toBeFocused()
    await dialog.getByRole("button", { name: formCase.addAnother }).click()
    await expect(firstInvalid).toBeFocused()

    const marker = `LOCAL-${formCase.header.toUpperCase()}-LOCAL`
    await formCase.fillValid(page, dialog, marker)
    const sensitiveValue =
      formCase.header === "Novo / Colaborador"
        ? await dialog.locator("#collaborator-password").inputValue()
        : undefined
    await dialog.getByRole("button", { name: formCase.addAnother }).click()
    await expect(dialog.getByLabel(formCase.markerLabel)).toHaveValue(
      formCase.header === "Novo / Caminhão" ? "ABC1D23" : marker,
    )

    await dialog.getByRole("button", { name: formCase.save }).click()
    await expect(dialog.getByLabel(formCase.markerLabel)).toHaveValue(
      formCase.header === "Novo / Caminhão" ? "ABC1D23" : marker,
    )

    expect(unexpectedWrites).toEqual([])
    const storageEvidence = await page.evaluate(() => ({
      local: Object.values(localStorage),
      session: Object.values(sessionStorage),
      writes: (window as unknown as { __localStorageWrites: string[] }).__localStorageWrites,
    }))
    expect(storageEvidence.writes).toEqual([])
    expect(JSON.stringify(storageEvidence)).not.toContain(marker)
    if (sensitiveValue) expect(JSON.stringify(storageEvidence)).not.toContain(sensitiveValue)
    await expect(page.getByText(/salv[oa] com sucesso|criad[oa] com sucesso/i)).toHaveCount(0)
  })
}

test("keeps the password generator control inside the collaborator password field", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 })
  await page.goto("/workspace-preview/forms/collaborators")
  await page.getByRole("button", { name: "Novo colaborador" }).click()

  const dialog = page.getByRole("dialog", { name: "Novo / Colaborador" })
  const password = dialog.locator("#collaborator-password")
  const generator = dialog.getByRole("button", { name: "Gerar senha segura" })
  const generatorFrame = generator.locator("[data-slot='password-generator-frame']")
  await expect(password).toBeVisible()
  await expect(generator).toHaveText("Gerar senha")
  await expect(generatorFrame).toHaveCSS("border-top-color", "rgb(59, 130, 246)")
  await expect(generatorFrame).toHaveCSS("border-top-width", "1px")
  await expect(generatorFrame).toHaveCSS("border-top-left-radius", "4px")
  await expect(generatorFrame).toHaveCSS("font-size", "10px")
  await expect(generatorFrame).toHaveCSS("font-weight", "500")
  await expect(generatorFrame).toHaveCSS("line-height", "12px")
  await expect(generatorFrame).toHaveCSS("padding-left", "6px")
  await expect(generatorFrame).toHaveCSS("padding-top", "4px")

  const [passwordBox, generatorBox, generatorFrameBox] = await Promise.all([
    password.boundingBox(),
    generator.boundingBox(),
    generatorFrame.boundingBox(),
  ])
  expect(Math.round(generatorBox?.height ?? 0)).toBeGreaterThanOrEqual(24)
  expect(Math.round(generatorFrameBox?.width ?? 0)).toBe(69)
  expect(Math.round(generatorFrameBox?.height ?? 0)).toBe(20)
  expect(Math.round((generatorFrameBox?.y ?? 0) - (passwordBox?.y ?? 0))).toBe(6)
  const rightInset = Math.round(
    (passwordBox?.x ?? 0) +
      (passwordBox?.width ?? 0) -
      (generatorFrameBox?.x ?? 0) -
      (generatorFrameBox?.width ?? 0),
  )
  expect(rightInset).toBeGreaterThanOrEqual(4)
  expect(rightInset).toBeLessThanOrEqual(8)

  await generator.focus()
  await expect(generator).toBeFocused()
  await generator.press("Enter")
  await expect(password).toHaveValue(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{20}$/)
})

test("keeps the form full-width and usable at 320px with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ height: 800, width: 320 })
  await page.goto("/workspace-preview/forms/companies")
  await page.getByRole("button", { name: "Nova empresa" }).click()

  const dialog = page.getByRole("dialog", { name: "Novo / Empresa" })
  await expect(dialog).toBeVisible()
  await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(320)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  const labelBox = await dialog.locator("label[for='company-cnpj']").boundingBox()
  const controlBox = await dialog.getByLabel(/^CNPJ/).boundingBox()
  expect(Math.round(labelBox?.x ?? 0)).toBe(Math.round(controlBox?.x ?? 0))
  expect(Math.round(controlBox?.width ?? 0)).toBeLessThanOrEqual(264)
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeVisible()
})

for (const formCase of remainingFormCases) {
  test(`${formCase.header} remains full-width without horizontal overflow at 320px`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.setViewportSize({ height: 800, width: 320 })
    await page.goto(formCase.path)
    await page.getByRole("button", { name: formCase.trigger }).click()

    const dialog = page.getByRole("dialog", { name: formCase.header })
    await expect(dialog).toBeVisible()
    await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(320)
    expect(
      await page.evaluate(() =>
        Boolean(
          document.documentElement.scrollWidth <= window.innerWidth &&
            document.querySelector<HTMLElement>("[role='dialog']")?.scrollWidth ===
              document.querySelector<HTMLElement>("[role='dialog']")?.clientWidth,
        ),
      ),
    ).toBe(true)

    const firstControl = dialog.getByLabel(formCase.firstInvalid)
    const firstLabel = dialog.locator(`label[for='${await firstControl.getAttribute("id")}']`)
    const labelBox = await firstLabel.boundingBox()
    const controlBox = await firstControl.boundingBox()
    expect(Math.round(labelBox?.x ?? 0)).toBe(Math.round(controlBox?.x ?? 0))
    expect(Math.round(controlBox?.width ?? 0)).toBeLessThanOrEqual(264)
    await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: formCase.save })).toBeVisible()
  })
}

test("confirms dirty dismissal and restores the page trigger", async ({ page }) => {
  await page.goto("/companies")
  const trigger = page.getByRole("button", { name: "Nova empresa" })
  await trigger.click()
  const drawer = page.getByRole("dialog", { name: "Novo / Empresa" })
  await drawer.getByLabel(/Razão social/).fill("Empresa de teste")
  await drawer.getByRole("button", { name: "Cancelar" }).click()

  const confirmation = page.getByRole("dialog", { name: "Descartar alterações?" })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole("button", { name: "Descartar alterações" }).click()
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()
})
