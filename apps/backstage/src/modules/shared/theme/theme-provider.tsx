import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"

type Theme = "light" | "dark"
type ThemePreference = Theme | "system"
type ThemeContextValue = {
  preference: ThemePreference
  theme: Theme
  setPreference: (preference: ThemePreference) => void
}

const THEME_STORAGE_KEY = "triad-backstage-theme"
const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemThemeSnapshot(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function subscribeToSystemTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)")
  if (!mediaQuery) return () => undefined

  mediaQuery.addEventListener("change", onStoreChange)
  return () => mediaQuery.removeEventListener("change", onStoreChange)
}

function resolveTheme(preference: ThemePreference, systemTheme: Theme): Theme {
  return preference === "system" ? systemTheme : preference
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
  const systemTheme = useSyncExternalStore<Theme>(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    (): Theme => "light",
  )
  const theme = resolveTheme(preference, systemTheme)

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference)
    window.localStorage?.setItem(THEME_STORAGE_KEY, nextPreference)
  }, [])

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.style.colorScheme = theme
  }, [theme])

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
