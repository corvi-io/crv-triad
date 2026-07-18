import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"

const DeferredCompanyCreationScreen = createDeferredRouteScreen(async () => {
  const { CompanyCreationScreen } = await import(
    "@/modules/companies/components/company-creation-form"
  )
  return { default: CompanyCreationScreen }
})

export const Route = createLazyFileRoute("/_authenticated/companies/")({
  component: DeferredCompanyCreationScreen,
})
