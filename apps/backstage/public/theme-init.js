;(() => {
  const storageKey = "triad-backstage-theme"
  const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  let preference = "system"

  try {
    const storedPreference = window.localStorage.getItem(storageKey)
    if (
      storedPreference === "light" ||
      storedPreference === "dark" ||
      storedPreference === "system"
    ) {
      preference = storedPreference
    }
  } catch {
    preference = "system"
  }

  const theme = preference === "system" ? systemTheme : preference
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
})()
