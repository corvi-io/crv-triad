declare module "virtual:studio-scheduling-prototype" {
  import type { SchedulingRepository } from "@/modules/scheduling/contracts"
  export const createSchedulingRepository: (() => SchedulingRepository) | undefined
}
