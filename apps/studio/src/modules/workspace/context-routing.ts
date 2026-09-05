import type { AvailableContexts } from "./services/context-client"

export type ContextDestination = "/overview" | "/select-workspace" | null

export function getContextDestination(
  contexts: AvailableContexts,
  pathname: string,
): ContextDestination {
  const isSelection = pathname === "/select-workspace"
  const activeTenant = contexts.tenants.some(
    (tenant) => tenant.id === contexts.activeOrganizationId,
  )

  if (isSelection) return null
  if (activeTenant) return null
  if (contexts.tenants.length === 1) return "/overview"
  return "/select-workspace"
}
