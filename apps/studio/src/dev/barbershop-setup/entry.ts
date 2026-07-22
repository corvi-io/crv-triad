import { BarbershopSetupMemoryRepository } from "./memory-repository"

export function createBarbershopSetupRepository() {
  return new BarbershopSetupMemoryRepository()
}
