declare module "virtual:studio-barbershop-setup-prototype" {
  import type { BarbershopSetupRepository } from "@/modules/barbershop-setup/contracts"

  export const createBarbershopSetupRepository: (() => BarbershopSetupRepository) | null
}
