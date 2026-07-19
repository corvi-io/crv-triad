import { createFileRoute, Navigate } from "@tanstack/react-router"
import { lazy, Suspense } from "react"
import { env, isDevelopmentBuild } from "@/modules/shared/config/env"

const DevelopmentSandboxPage = isDevelopmentBuild
  ? lazy(() => import("@/dev/sandbox/sandbox-page"))
  : null

export const Route = createFileRoute("/workspace-preview/sandbox/")({
  component: DevelopmentSandboxRoute,
})

function DevelopmentSandboxRoute() {
  if (!env.isDevServer || !DevelopmentSandboxPage) {
    return <Navigate replace to="/login" />
  }

  return (
    <Suspense fallback={<div role="status">Carregando sandbox…</div>}>
      <DevelopmentSandboxPage />
    </Suspense>
  )
}
