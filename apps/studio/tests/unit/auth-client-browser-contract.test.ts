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

  it("initiates Google through the native social endpoint without browser-visible credentials", async () => {
    vi.stubEnv("VITE_AUTH_BASE_URL", "https://idp.dev.example.com/api/auth")

    let requestBody: Record<string, unknown> | undefined
    let requestUrl = ""
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      requestUrl = request.url
      requestBody = (await request.json()) as Record<string, unknown>

      return new Response(JSON.stringify({ redirect: false, url: null }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    })

    const { signInWithGoogle } = await import("@/modules/auth/services/auth-client")
    await signInWithGoogle()

    expect(requestUrl).toBe("https://idp.dev.example.com/api/auth/sign-in/social")
    expect(requestBody).toEqual({
      callbackURL: "http://localhost:3000/overview",
      errorCallbackURL: "http://localhost:3000/login?error=provider",
      provider: "google",
    })
    expect(JSON.stringify(requestBody)).not.toMatch(/client.?secret|client.?id/i)
  })
})
