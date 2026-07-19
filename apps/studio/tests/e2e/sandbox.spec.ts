import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/workspace-preview/sandbox")
  await expect(page.getByRole("heading", { name: "Sandbox de componentes" })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations).toEqual([])
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

  await page.getByRole("button", { name: "Visualizar Registro criado no teste" }).click()
  await expect(page.getByRole("dialog", { name: "Registros / Visualizar registro" })).toContainText(
    "Resumo sintético",
  )
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "Registros / Visualizar registro" })).toBeHidden()

  await page.getByRole("button", { name: "Editar Registro criado no teste" }).click()
  await page.getByLabel("Título").fill("Registro editado no teste")
  await page.getByRole("button", { name: "Salvar registro" }).click()
  await page.getByLabel("Buscar registros").fill("editado no teste")
  await expect(page.getByText("Registro editado no teste")).toBeVisible()

  await page.getByRole("button", { name: "Excluir Registro editado no teste" }).click()
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
