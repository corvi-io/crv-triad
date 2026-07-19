import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

test("has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/workspace-preview/sandbox")
  await expect(page.getByRole("heading", { name: "Sandbox de componentes" })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("supports keyboard row actions and restores focus after the drawer closes", async ({
  page,
}) => {
  await page.goto("/workspace-preview/sandbox")
  const row = page.getByRole("row").filter({ hasText: "Registro 001" }).first()

  await row.focus()
  await page.keyboard.press("Shift+F10")
  const viewAction = page.getByRole("menuitem", { name: "Visualizar" })
  await expect(viewAction).toBeVisible()
  await page.keyboard.press("ArrowDown")
  await expect(viewAction).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog", { name: "Registros / Visualizar registro" })).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Registros / Visualizar registro" })).toBeHidden()
  await expect(row).toBeFocused()
})

test("supports deterministic CRUD, search, filter, sort, pagination, failure, and reset", async ({
  page,
}) => {
  await page.goto("/workspace-preview/sandbox")

  await expect(page.getByRole("heading", { name: "Sandbox de componentes" })).toBeVisible()
  await expect(page.getByRole("table", { name: "Registros sintéticos do sandbox" })).toBeVisible()

  await page.getByRole("button", { name: "Novo registro" }).first().click()
  await page.getByLabel("Título").fill("Registro criado no teste")
  await page.getByLabel("Resumo").fill("Resumo sintético")
  await page.getByRole("button", { name: "Salvar registro" }).click()
  await page.getByLabel("Buscar registros").fill("criado no teste")
  await expect(page.getByText("Registro criado no teste")).toBeVisible()

  await selectRowAction(page, "Registro criado no teste", "Visualizar")
  await expect(page.getByRole("dialog", { name: "Registros / Visualizar registro" })).toContainText(
    "Resumo sintético",
  )
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Registros / Visualizar registro" })).toBeHidden()

  await selectRowAction(page, "Registro criado no teste", "Editar")
  await page.getByLabel("Título").fill("Registro editado no teste")
  await page.getByRole("button", { name: "Salvar registro" }).click()
  await page.getByLabel("Buscar registros").fill("editado no teste")
  await expect(page.getByText("Registro editado no teste")).toBeVisible()

  await selectRowAction(page, "Registro editado no teste", "Excluir")
  await page.getByRole("button", { name: "Excluir registro" }).click()
  await expect(page.getByText("Registro editado no teste")).toHaveCount(0)

  await page.getByLabel("Buscar registros").fill("")
  await page.getByLabel("Estado").click()
  await page.getByRole("option", { name: "Pausado" }).click()
  const recordsTable = page.getByRole("table", { name: "Registros sintéticos do sandbox" })
  await expect(recordsTable.getByText("Pausado").first()).toBeVisible()
  await expect(recordsTable.getByText("Ativo")).toHaveCount(0)
  await page.getByLabel("Estado").click()
  await page.getByRole("option", { name: "Todos" }).click()

  await page.getByRole("button", { name: /Título/ }).click()
  await expect(page.getByRole("columnheader", { name: /Título/ })).toHaveAttribute(
    "aria-sort",
    "descending",
  )

  await page.getByLabel("Cenário").click()
  await page.getByRole("option", { name: "Maior" }).click()
  await page.getByRole("button", { name: "Ir para página 2" }).click()
  await expect(page.getByText(/Página 2 de 50/)).toBeVisible()

  await page.getByRole("button", { name: "Falhar próxima operação" }).click()
  await expect(page.getByRole("alert")).toContainText("Não foi possível carregar")
  await page.getByRole("button", { name: "Tentar novamente" }).click()
  await expect(page.getByRole("table", { name: "Registros sintéticos do sandbox" })).toBeVisible()

  await page.getByRole("button", { name: "Restaurar cenário" }).click()
  await expect(page.getByText("Cenário restaurado.")).toBeVisible()
})

async function selectRowAction(
  page: Page,
  title: string,
  action: "Editar" | "Excluir" | "Visualizar",
) {
  await page.getByRole("row").filter({ hasText: title }).first().click({ button: "right" })
  await page.getByRole("menuitem", { name: action }).click()
}
