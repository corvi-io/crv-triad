import { useLocation } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

import { useAuth } from "@/modules/auth/services/auth-provider"
import {
  captureProductEvent,
  identifyAnalyticsUser,
  resetAnalyticsIdentity,
  setAnalyticsTenant,
} from "@/modules/shared/analytics/posthog"
import { useWorkspaceTenantId } from "@/modules/workspace/context-provider"

export function AnalyticsIdentityObserver() {
  const { isPending, session } = useAuth()
  useEffect(() => {
    if (isPending) return
    const userId = session?.user.id
    if (userId) identifyAnalyticsUser(userId)
    else resetAnalyticsIdentity()
  }, [isPending, session?.user.id])
  return null
}

export function AnalyticsTenantObserver() {
  const tenantId = useWorkspaceTenantId()
  useEffect(() => setAnalyticsTenant(tenantId), [tenantId])
  return null
}

export function AnalyticsRouteObserver() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const previous = useRef<string | null>(null)
  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    captureProductEvent("module_viewed", {
      module: moduleFromPath(pathname),
      route: normalizePath(pathname),
    })
  }, [pathname])
  return null
}

function moduleFromPath(pathname: string) {
  return pathname.split("/").filter(Boolean)[0] ?? "login"
}

function normalizePath(pathname: string) {
  return pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
}
