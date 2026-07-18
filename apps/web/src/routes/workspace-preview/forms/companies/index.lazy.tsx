import { createLazyFileRoute } from "@tanstack/react-router"

import { createDeferredRouteScreen } from "@/modules/shared/components/deferred-route-screen"
import { ReferenceFormPreview } from "@/modules/shared/components/reference-form-preview"

const DeferredCompanyCreationScreen = createDeferredRouteScreen(async () => {
  const { CompanyCreationScreen } = await import(
    "@/modules/companies/components/company-creation-form"
  )
  return { default: CompanyCreationScreen }
})

export const Route = createLazyFileRoute("/workspace-preview/forms/companies/")({
  component: () => (
    <ReferenceFormPreview selectedId="companies">
      <DeferredCompanyCreationScreen />
    </ReferenceFormPreview>
  ),
})
