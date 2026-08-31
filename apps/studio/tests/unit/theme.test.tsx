import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { PreferencesScreen } from "@/modules/preferences/components/preferences-screen"
import { ThemeProvider } from "@/modules/shared/theme/theme-provider"

vi.mock("@/modules/preferences/components/security-access-section", () => ({
  SecurityAccessSection: () => null,
}))

describe("theme support", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.className = ""
  })

  it("sets and persists theme preferences from the preferences screen", async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <PreferencesScreen />
      </ThemeProvider>,
    )

    expect(screen.getByRole("heading", { name: "Aparência" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Sistema/ })).toHaveAttribute("aria-checked", "true")

    await user.click(screen.getByRole("radio", { name: /Escuro/ }))

    expect(document.documentElement).toHaveClass("dark")
    expect(window.localStorage.getItem("triad-studio-theme")).toBe("dark")
    expect(screen.getByRole("radio", { name: /Escuro/ })).toHaveAttribute("aria-checked", "true")
  })
})
