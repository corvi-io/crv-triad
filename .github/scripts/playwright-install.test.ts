import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"

const studioPipelinePaths = [".github/workflows/reusable-app-delivery.yml"]

const lockedStudioPlaywrightInstall = [
  "      - name: Install Studio Playwright browser",
  `        if: \${{ inputs.app == 'studio' }}`,
  "        working-directory: apps/studio",
  "        run: bunx playwright install --with-deps --only-shell chromium",
].join("\n")

describe("Studio Playwright browser installation", () => {
  for (const workflowPath of studioPipelinePaths) {
    it(`resolves Playwright from the Studio workspace in ${workflowPath}`, () => {
      const workflow = readFileSync(workflowPath, "utf8")

      expect(workflow).toContain(lockedStudioPlaywrightInstall)
      expect(workflow.match(/run: bunx playwright install/g)).toHaveLength(1)
    })
  }
})
