import { resolveBarbershopSetupScenario } from "virtual:studio-barbershop-setup-source"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { createBarbershopSetupRouteSearchDefaults } from "@/modules/barbershop-setup/search"

const searchDefaults = createBarbershopSetupRouteSearchDefaults(resolveBarbershopSetupScenario)

export const Route = createFileRoute("/_authenticated/barbershop-setup/")({
  beforeLoad: () => {
    throw redirect({
      to: "/barbershop-setup/$section",
      params: { section: "overview" },
      search: searchDefaults,
    })
  },
})
