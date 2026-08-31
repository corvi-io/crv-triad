import { Elysia } from "elysia"

export function createHealthRoutes() {
  return new Elysia({ name: "health-routes" }).get("/health", () => ({
    status: "ok",
    service: "idp",
  }))
}
