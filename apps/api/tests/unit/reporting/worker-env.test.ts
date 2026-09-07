import { describe, expect, it } from "vitest"
import { loadReportWorkerEnv } from "../../../src/modules/reporting/config/worker-env.js"

const validEnv = {
  APP_ENV: "development",
  DATABASE_URL: "postgresql://user:password@example.test/triad",
  IDP_EMAIL_FROM: "reports@example.test",
  IDP_STUDIO_URL: "https://studio.example.test",
  IDP_RESEND_API_KEY: "resend-secret",
  R2_PRIVATE_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  R2_PRIVATE_ACCESS_KEY_ID: "access-key",
  R2_PRIVATE_SECRET_ACCESS_KEY: "secret-key",
  R2_PRIVATE_BUCKET: "reports",
}

describe("report worker environment", () => {
  it("loads only the worker-owned runtime values", () => {
    expect(loadReportWorkerEnv(validEnv)).toMatchObject({
      APP_ENV: "development",
      R2_PRIVATE_BUCKET: "reports",
      IDP_RESEND_API_URL: "https://api.resend.com",
    })
  })

  it("rejects incomplete worker provider configuration", () => {
    const { R2_PRIVATE_SECRET_ACCESS_KEY: _, ...incomplete } = validEnv
    expect(() => loadReportWorkerEnv(incomplete)).toThrow()
  })
})
