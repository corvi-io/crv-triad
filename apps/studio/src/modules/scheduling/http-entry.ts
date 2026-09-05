import { SchedulingHttpRepository } from "./http-repository"
export function createSchedulingRepository() {
  return new SchedulingHttpRepository()
}
