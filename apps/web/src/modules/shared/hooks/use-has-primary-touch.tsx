import { useSyncExternalStore } from "react"

function getTouchPrimarySnapshot() {
  if (typeof window === "undefined") return false

  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0
  return hasTouch && window.matchMedia("(pointer: coarse)").matches
}

function subscribeToTouchPrimary(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(pointer: coarse)")
  mediaQuery.addEventListener("change", onStoreChange)
  window.addEventListener("pointerdown", onStoreChange)

  return () => {
    mediaQuery.removeEventListener("change", onStoreChange)
    window.removeEventListener("pointerdown", onStoreChange)
  }
}

export function useTouchPrimary() {
  return useSyncExternalStore(subscribeToTouchPrimary, getTouchPrimarySnapshot, () => false)
}
