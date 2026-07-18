import { describe, expect, it } from "vitest"

import { getDefaultCookieAttributes } from "../../../src/identity/auth.js"

describe("getDefaultCookieAttributes", () => {
  it("keeps local HTTP cookies compatible with localhost development", () => {
    expect(getDefaultCookieAttributes({ BETTER_AUTH_URL: "http://localhost:8001" })).toBeUndefined()
  })

  it("uses cross-site compatible cookies for HTTPS browser clients", () => {
    expect(
      getDefaultCookieAttributes({ BETTER_AUTH_URL: "https://triad-idp-dev.fly.dev" }),
    ).toEqual({
      sameSite: "none",
      secure: true,
    })
  })
})
