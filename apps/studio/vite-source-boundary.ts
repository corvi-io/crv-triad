export function isMemorySourceEnabled(source: string | undefined, target: string | undefined) {
  return source === "memory" && (target === "local" || target === "dev")
}

export function serviceDeskSourceKind(source: string | undefined, target: string | undefined) {
  if (source === "memory") return isMemorySourceEnabled(source, target) ? "memory" : "disabled"
  return source === "disabled" ? "disabled" : "http"
}
