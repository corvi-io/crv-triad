export function isMemorySourceEnabled(source: string | undefined, target: string | undefined) {
  return source === "memory" && (target === "local" || target === "dev")
}
