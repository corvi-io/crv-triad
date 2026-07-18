import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/**", async (route) => {
    await route.fulfill({ body: "null", contentType: "application/json", status: 200 })
  })
})

test("redirects guarded routes without loading domain creation modules in production", async ({
  page,
}) => {
  const creationModuleRequests: string[] = []
  page.on("request", (request) => {
    if (/creation-(?:form|preview)-/.test(request.url())) {
      creationModuleRequests.push(request.url())
    }
  })

  const guardedPaths = [
    "/workspace-preview/forms",
    "/workspace-preview/forms/companies",
    "/workspace-preview/forms/customers",
    "/workspace-preview/forms/products",
    "/workspace-preview/forms/warehouses",
    "/workspace-preview/forms/trucks",
    "/workspace-preview/forms/drivers",
    "/workspace-preview/forms/collaborators",
    "/workspace-preview/forms/permission-profiles",
    "/companies",
    "/customers",
    "/inventory/products",
    "/inventory/warehouses",
    "/fleet/trucks",
    "/drivers",
    "/users/collaborators",
    "/users/permission-profiles",
  ] as const

  for (const path of guardedPaths) {
    const requestsBeforeNavigation = creationModuleRequests.length
    await page.goto(path)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole("heading", { name: "Entrar no CRV Triad" })).toBeVisible()
    expect(creationModuleRequests.slice(requestsBeforeNavigation), path).toEqual([])
  }

  expect(creationModuleRequests).toEqual([])
})
