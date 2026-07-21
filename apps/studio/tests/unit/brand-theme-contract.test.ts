import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { appointmentStatuses } from "@/modules/scheduling/contracts"
import { appointmentStatusPresentation } from "@/modules/scheduling/status"
import indexHtml from "../../index.html?raw"
import themeInitSource from "../../public/theme-init.js?raw"
import styles from "../../src/index.css?raw"

const feedbackRoles = ["success", "warning", "info", "destructive"] as const

describe("TRIAD brand theme contract", () => {
  it("maps accepted navy and gold anchors through semantic and component layers", () => {
    expect(styles).toContain("--primitive-navy-900: #0f172a")
    expect(styles).toContain("--primitive-navy-950: #080d19")
    expect(styles).toContain("--primitive-gold-500: #cdaa5b")
    expect(styles).toContain("--primitive-gold-700: #86652f")
    expect(styles).not.toContain("--primitive-brand-")
    expect(styles).toContain("--primary: var(--primitive-gold-700)")
    expect(styles).toContain("--auth-brand-background:")
    expect(styles).toContain("--auth-brand-shadow:")
    expect(styles).toContain(".auth-brand-surface")
  })

  it("registers complete feedback and scheduling roles for semantic consumers", () => {
    for (const role of feedbackRoles) {
      expect(styles).toContain(`--color-feedback-${role}: var(--feedback-${role})`)
      expect(styles).toContain(
        `--color-feedback-${role}-foreground: var(--feedback-${role}-foreground)`,
      )
      expect(styles).toContain(`--color-feedback-${role}-border: var(--feedback-${role}-border)`)
    }

    for (const status of appointmentStatuses) {
      expect(styles).toContain(`--color-schedule-${status}: var(--schedule-${status})`)
      expect(styles).toContain(
        `--color-schedule-${status}-foreground: var(--schedule-${status}-foreground)`,
      )
      expect(styles).toContain(
        `--color-schedule-${status}-border: var(--schedule-${status}-border)`,
      )
      expect(appointmentStatusPresentation[status].label).not.toBe("")
      expect(appointmentStatusPresentation[status].symbol).not.toBe("")
      expect(appointmentStatusPresentation[status].className).toContain(
        `border-schedule-${status}-border`,
      )
    }
  })

  it("resolves the saved or system preference before the application module", () => {
    expect(themeInitSource).toContain('const storageKey = "triad-studio-theme"')
    expect(themeInitSource).toContain('preference === "system" ? systemTheme : preference')
    expect(themeInitSource).toContain('classList.toggle("dark", theme === "dark")')
    expect(indexHtml.indexOf('src="/theme-init.js"')).toBeGreaterThan(-1)
    expect(indexHtml.indexOf('src="/theme-init.js"')).toBeLessThan(
      indexHtml.indexOf('src="/src/main.tsx"'),
    )
  })

  it("keeps raw palette utilities and values out of project-owned consumers", async () => {
    const roots = [
      path.resolve(process.cwd(), "src/modules"),
      path.resolve(process.cwd(), "src/routes"),
      path.resolve(process.cwd(), "src/dev"),
    ]
    const files = (await Promise.all(roots.map((root) => sourceFiles(root))))
      .flat()
      .filter((file) => !file.includes("/components/ui/"))
    const sources = await Promise.all(files.map((file) => readFile(file, "utf8")))

    for (const source of sources) {
      expect(source).not.toMatch(
        /(?:bg|text|border|ring|from|via|to)-(?:blue|sky|emerald|green|amber|yellow|red|rose|orange|indigo|violet|purple|cyan|teal|lime|slate|gray|zinc|neutral|stone)-\d+/,
      )
      expect(source).not.toMatch(/#[\da-f]{3,8}/i)
      expect(source).not.toMatch(/var\(--primitive-/)
    }
  })
})

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) return sourceFiles(target)
      return /\.(ts|tsx)$/.test(entry.name) ? [target] : []
    }),
  )
  return nested.flat()
}
