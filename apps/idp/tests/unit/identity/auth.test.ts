import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { splitSetCookieHeader } from "better-auth/cookies"
import { describe, expect, it } from "vitest"

import { getDefaultCookieAttributes } from "../../../src/identity/auth.js"

const idpBaseUrl = "https://idp.example.com"
const studioOrigin = "https://studio.example.com"

type CookieMetadata = {
  attributes: string[]
  name: string
}

type SessionSummary = {
  authenticated: boolean
  email?: string
}

type TestResponse = {
  cookies: CookieMetadata[]
  session?: SessionSummary
  status: number
}

function createStandaloneAuth(appEnv: "development" | "staging" | "production") {
  return betterAuth({
    baseURL: idpBaseUrl,
    database: memoryAdapter({ account: [], session: [], user: [], verification: [] }),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
    rateLimit: { enabled: false },
    secret: "test-secret-that-is-at-least-32-characters",
    trustedOrigins: [studioOrigin],
    advanced: {
      defaultCookieAttributes: getDefaultCookieAttributes({
        APP_ENV: appEnv,
        BETTER_AUTH_URL: idpBaseUrl,
      }),
    },
  })
}

function createSessionTestClient(
  handler: (request: Request) => Promise<Response>,
  initialCookies = new Map<string, string>(),
) {
  const cookieJar = new Map(initialCookies)

  async function request(
    path: string,
    options: { body?: Record<string, unknown> } = {},
  ): Promise<TestResponse> {
    const headers = new Headers({ origin: studioOrigin })
    if (options.body) headers.set("content-type", "application/json")
    if (cookieJar.size > 0) {
      headers.set("cookie", Array.from(cookieJar, ([name, value]) => `${name}=${value}`).join("; "))
    }

    const response = await handler(
      new Request(`${idpBaseUrl}/api/auth${path}`, {
        ...(options.body ? { body: JSON.stringify(options.body), method: "POST" } : {}),
        headers,
      }),
    )
    const cookies = applyResponseCookies(response)
    const session = path === "/get-session" ? await summarizeSession(response) : undefined

    return { cookies, session, status: response.status }
  }

  function applyResponseCookies(response: Response) {
    const metadata: CookieMetadata[] = []

    for (const serialized of splitSetCookieHeader(response.headers.get("set-cookie") ?? "")) {
      const [cookiePair, ...attributes] = serialized.split(";").map((part) => part.trim())
      const separator = cookiePair?.indexOf("=") ?? -1
      if (!cookiePair || separator < 1) continue

      const name = cookiePair.slice(0, separator)
      const value = cookiePair.slice(separator + 1)
      const expiresImmediately =
        value.length === 0 ||
        attributes.some((attribute) => attribute.toLowerCase() === "max-age=0")

      if (expiresImmediately) cookieJar.delete(name)
      else cookieJar.set(name, value)

      metadata.push({ attributes, name })
    }

    return metadata
  }

  return {
    fork: () => createSessionTestClient(handler, cookieJar),
    request,
  }
}

async function summarizeSession(response: Response): Promise<SessionSummary> {
  const payload = (await response.json()) as {
    session?: unknown
    user?: { email?: unknown }
  } | null

  return {
    authenticated: Boolean(payload?.session && payload.user),
    ...(typeof payload?.user?.email === "string" ? { email: payload.user.email } : {}),
  }
}

async function createStandaloneUser(auth: ReturnType<typeof createStandaloneAuth>, email: string) {
  // This upstream-only fixture does not use or replace the invite-gated createAuth app composition.
  const setupClient = createSessionTestClient((request) => auth.handler(request))
  return setupClient.request("/sign-up/email", {
    body: {
      email,
      name: "Session Lifecycle",
      password: "test-password-123",
    },
  })
}

describe("getDefaultCookieAttributes", () => {
  it("keeps local HTTP cookies compatible with localhost development", () => {
    expect(
      getDefaultCookieAttributes({
        APP_ENV: "local",
        BETTER_AUTH_URL: "http://localhost:8001",
      }),
    ).toBeUndefined()
  })

  it("partitions cross-site cookies only for the deployed HTTPS development environment", () => {
    expect(
      getDefaultCookieAttributes({
        APP_ENV: "development",
        BETTER_AUTH_URL: "https://triad-idp-dev.fly.dev",
      }),
    ).toEqual({
      partitioned: true,
      sameSite: "none",
      secure: true,
    })
  })

  it.each([
    "staging",
    "production",
  ] as const)("preserves the existing HTTPS cookie attributes in %s", (appEnv) => {
    expect(
      getDefaultCookieAttributes({
        APP_ENV: appEnv,
        BETTER_AUTH_URL: `https://triad-idp-${appEnv}.fly.dev`,
      }),
    ).toEqual({
      sameSite: "none",
      secure: true,
    })
  })

  it("retains and invalidates a protected development session across requests", async () => {
    const auth = createStandaloneAuth("development")
    const email = "session-lifecycle@example.com"
    const setup = await createStandaloneUser(auth, email)
    expect(setup.status).toBe(200)

    const client = createSessionTestClient((request) => auth.handler(request))
    const invalidSignIn = await client.request("/sign-in/email", {
      body: { email, password: "invalid-password" },
    })
    expect(invalidSignIn.status).toBe(401)
    expect(invalidSignIn.cookies.map(({ name }) => name)).not.toContain(
      "__Secure-better-auth.session_token",
    )

    const validSignIn = await client.request("/sign-in/email", {
      body: { email, password: "test-password-123" },
    })
    expect(validSignIn.status).toBe(200)

    const sessionCookie = validSignIn.cookies.find(
      ({ name }) => name === "__Secure-better-auth.session_token",
    )
    expect(sessionCookie?.name).toBe("__Secure-better-auth.session_token")
    expect(sessionCookie?.attributes).toEqual(
      expect.arrayContaining(["HttpOnly", "Secure", "SameSite=None", "Partitioned"]),
    )

    const staleSessionClient = client.fork()
    const authenticatedSession = await client.request("/get-session")
    expect(authenticatedSession.status).toBe(200)
    expect(authenticatedSession.session).toEqual({ authenticated: true, email })

    const signOut = await client.request("/sign-out", { body: {} })
    expect(signOut.status).toBe(200)
    expect(signOut.cookies.map(({ name }) => name)).toContain("__Secure-better-auth.session_token")

    const clearedSession = await client.request("/get-session")
    expect(clearedSession.status).toBe(200)
    expect(clearedSession.session).toEqual({ authenticated: false })

    const invalidatedServerSession = await staleSessionClient.request("/get-session")
    expect(invalidatedServerSession.status).toBe(200)
    expect(invalidatedServerSession.session).toEqual({ authenticated: false })
  })

  it.each([
    "staging",
    "production",
  ] as const)("keeps serialized %s session cookies non-partitioned", async (appEnv) => {
    const auth = createStandaloneAuth(appEnv)
    const response = await createStandaloneUser(auth, `${appEnv}-cookie@example.com`)
    expect(response.status).toBe(200)

    const sessionCookie = response.cookies.find(
      ({ name }) => name === "__Secure-better-auth.session_token",
    )
    expect(sessionCookie?.attributes).toEqual(
      expect.arrayContaining(["HttpOnly", "Secure", "SameSite=None"]),
    )
    expect(sessionCookie?.attributes).not.toContain("Partitioned")
  })
})
