import { afterEach, describe, expect, it, vi } from "vitest"

type RequestObservation = {
  credentials: RequestCredentials
  method: string
  url: string
}

describe("auth client browser contract", () => {
  afterEach(() => {
    vi.resetModules()
  })

  it("uses the absolute cross-origin IDP URL with included credentials", async () => {
    vi.stubEnv("VITE_AUTH_BASE_URL", "https://idp.dev.example.com/api/auth")

    let observation: RequestObservation | undefined
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      observation = {
        credentials: request.credentials,
        method: request.method,
        url: request.url,
      }

      return new Response(JSON.stringify({ redirect: false, user: null }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    })

    const { signInWithEmail } = await import("@/modules/auth/services/auth-client")
    await signInWithEmail({ email: "maria@example.com", password: "test-password-123" })

    expect(observation).toEqual({
      credentials: "include",
      method: "POST",
      url: "https://idp.dev.example.com/api/auth/sign-in/email",
    })
  })
})
