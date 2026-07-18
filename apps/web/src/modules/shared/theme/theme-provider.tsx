import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

type Theme = "light" | "dark"
type ThemePreference = Theme | "system"
type ThemeContextValue = {
  preference: ThemePreference
  theme: Theme
  setPreference: (preference: ThemePreference) => void
}

const THEME_STORAGE_KEY = "triad-web-theme"
const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== "system") {
    return preference
  }

  if (typeof window === "undefined") {
    return "light"
  }

  return getSystemTheme()
}

function getInitialPreference(): ThemePreference {
  if (typeof window === "undefined" || !window.localStorage) {
    return "system"
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme
  }

  return "system"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference)
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme(getInitialPreference()))

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference)
    setThemeState(resolveTheme(nextPreference))
    window.localStorage?.setItem(THEME_STORAGE_KEY, nextPreference)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    if (preference !== "system") {
      return
    }

    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!mediaQuery) {
      return
    }

    function handleSystemThemeChange() {
      setThemeState(resolveTheme("system"))
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange)
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange)
  }, [preference])

  const value = useMemo(
    () => ({ preference, setPreference, theme }),
    [preference, setPreference, theme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export type { Theme, ThemePreference }

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider.")
  }

  return value
}
