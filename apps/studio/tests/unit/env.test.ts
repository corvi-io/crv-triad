import { env } from "@/modules/shared/config/env"

describe("public env", () => {
  it("maps browser-safe Vite values through one config module", () => {
    expect(env.appName).toBe(import.meta.env.VITE_APP_NAME ?? "TRIAD Studio")
    expect(env.authBaseUrl).toBe(
      import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:8001/api/auth",
    )
    expect(env.barbershopSetupSource).toBe(
      import.meta.env.VITE_BARBERSHOP_SETUP_SOURCE ?? "disabled",
    )
    expect(env.deployTarget).toBe(import.meta.env.VITE_DEPLOY_TARGET ?? "local")
    expect(env.schedulingSource).toBe(import.meta.env.VITE_SCHEDULING_SOURCE ?? "disabled")
  })
})
