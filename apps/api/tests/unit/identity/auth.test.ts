import { type BetterAuthOptions, betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { splitSetCookieHeader } from "better-auth/cookies"
import { hashPassword } from "better-auth/crypto"
import { describe, expect, it, vi } from "vitest"

import {
  createAuthOptions,
  getCookiePrefix,
  getDefaultCookieAttributes,
  handleBackgroundTask,
} from "../../../src/modules/idp/identity/auth.js"
import { createInvitationSecret } from "../../../src/modules/idp/identity/invitations.js"

const idpBaseUrl = "https://idp.example.com"
const localIdpBaseUrl = "http://localhost:8000"
const studioOrigin = "https://studio.example.com"
const legacySecureSessionCookieName = "__Secure-better-auth.session_token"
const transitionalSecureSessionCookieName = "__Secure-triad-dev-partitioned.session_token"
const standardSecureSessionCookieName = "__Secure-triad-auth.session_token"
const localSessionCookieName = "triad-auth.session_token"
const partitionedDevelopmentSessionCookieName = "__Secure-triad-auth-partitioned.session_token"

type CookieMetadata = {
  attributes: string[]
  name: string
}

type SessionSummary = {
  authenticated: boolean
  email?: string
}

type TestResponse = {
  body?: unknown
  cookies: CookieMetadata[]
  oauthCallbackUri?: string
  session?: SessionSummary
  status: number
}

type SendResetPassword = NonNullable<
  NonNullable<BetterAuthOptions["emailAndPassword"]>["sendResetPassword"]
>

function createStandaloneAuth(
  appEnv: "local" | "development" | "staging" | "production",
  baseURL = idpBaseUrl,
  sendResetPassword?: SendResetPassword,
) {
  const cookieEnv = { APP_ENV: appEnv, BETTER_AUTH_URL: baseURL } as const
  const cookiePrefix = getCookiePrefix(cookieEnv)

  return betterAuth({
    baseURL,
    database: memoryAdapter({ account: [], session: [], user: [], verification: [] }),
    emailAndPassword: { enabled: true, sendResetPassword },
    socialProviders: {
      google: {
        clientId: "google-client-id-placeholder",
        clientSecret: "google-client-secret-placeholder",
        disableDefaultScope: true,
        scope: ["openid", "email", "profile"],
      },
    },
    logger: { disabled: true },
    rateLimit: { enabled: false },
    secret: "test-secret-that-is-at-least-32-characters",
    trustedOrigins: [studioOrigin],
    advanced: {
      cookiePrefix,
      defaultCookieAttributes: getDefaultCookieAttributes(cookieEnv),
    },
  })
}

function createSessionTestClient(
  handler: (request: Request) => Promise<Response>,
  baseUrl = idpBaseUrl,
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
      new Request(`${baseUrl}/api/auth${path}`, {
        ...(options.body ? { body: JSON.stringify(options.body), method: "POST" } : {}),
        headers,
      }),
    )
    const cookies = applyResponseCookies(response)
    const body = path === "/request-password-reset" ? await response.clone().json() : undefined
    const session = path === "/get-session" ? await summarizeSession(response) : undefined
    const oauthCallbackUri =
      path === "/sign-in/social" ? await extractOAuthCallbackUri(response.clone()) : undefined

    return { body, cookies, oauthCallbackUri, session, status: response.status }
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
    fork: () => createSessionTestClient(handler, baseUrl, cookieJar),
    request,
  }
}

async function extractOAuthCallbackUri(response: Response): Promise<string | undefined> {
  const payload = (await response.json()) as { url?: unknown }
  if (typeof payload.url !== "string") return undefined

  const authorizationUrl = new URL(payload.url)
  return authorizationUrl.searchParams.get("redirect_uri") ?? undefined
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

async function createStandaloneUser(
  auth: ReturnType<typeof createStandaloneAuth>,
  email: string,
  baseUrl = idpBaseUrl,
) {
  // This upstream-only fixture does not use or replace the invite-gated createAuth app composition.
  const setupClient = createSessionTestClient((request) => auth.handler(request), baseUrl)
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
    const cookieEnv = { APP_ENV: "local", BETTER_AUTH_URL: localIdpBaseUrl } as const
    expect(getCookiePrefix(cookieEnv)).toBe("triad-auth")
    expect(getDefaultCookieAttributes(cookieEnv)).toBeUndefined()
  })

  it("partitions cross-site cookies only for the deployed HTTPS development environment", () => {
    const cookieEnv = {
      APP_ENV: "development",
      BETTER_AUTH_URL: "https://triad-idp-dev.fly.dev",
    } as const
    expect(getCookiePrefix(cookieEnv)).toBe("triad-auth-partitioned")
    expect(getDefaultCookieAttributes(cookieEnv)).toEqual({
      partitioned: true,
      sameSite: "none",
      secure: true,
    })
  })

  it.each([
    "staging",
    "production",
  ] as const)("preserves the existing HTTPS cookie attributes in %s", (appEnv) => {
    const cookieEnv = {
      APP_ENV: appEnv,
      BETTER_AUTH_URL: `https://triad-idp-${appEnv}.fly.dev`,
    } as const
    expect(getCookiePrefix(cookieEnv)).toBe("triad-auth")
    expect(getDefaultCookieAttributes(cookieEnv)).toEqual({
      sameSite: "none",
      secure: true,
    })
  })

  it("preserves the Better Auth cookie name and attributes for local HTTP", async () => {
    const auth = createStandaloneAuth("local", localIdpBaseUrl)
    const response = await createStandaloneUser(auth, "local-cookie@example.com", localIdpBaseUrl)
    expect(response.status).toBe(200)

    const sessionCookie = response.cookies.find(({ name }) => name === localSessionCookieName)
    expect(sessionCookie?.name).toBe(localSessionCookieName)
    expect(sessionCookie?.attributes).toEqual(
      expect.arrayContaining(["HttpOnly", "SameSite=Lax", "Path=/"]),
    )
    expect(sessionCookie?.attributes).not.toContain("Secure")
    expect(sessionCookie?.attributes).not.toContain("Partitioned")
    expect(sessionCookie?.attributes.some((attribute) => attribute.startsWith("Domain="))).toBe(
      false,
    )
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
      partitionedDevelopmentSessionCookieName,
    )

    const validSignIn = await client.request("/sign-in/email", {
      body: { email, password: "test-password-123" },
    })
    expect(validSignIn.status).toBe(200)

    const sessionCookie = validSignIn.cookies.find(
      ({ name }) => name === partitionedDevelopmentSessionCookieName,
    )
    expect(sessionCookie?.name).toBe(partitionedDevelopmentSessionCookieName)
    expect(sessionCookie?.attributes).toEqual(
      expect.arrayContaining(["HttpOnly", "Secure", "SameSite=None", "Partitioned", "Path=/"]),
    )
    expect(sessionCookie?.attributes.some((attribute) => attribute.startsWith("Domain="))).toBe(
      false,
    )

    const ignoredOldCookies = createSessionTestClient(
      (request) => auth.handler(request),
      idpBaseUrl,
      new Map([
        [legacySecureSessionCookieName, "opaque-legacy-value"],
        [transitionalSecureSessionCookieName, "opaque-transitional-value"],
      ]),
    )
    const ignoredLegacySession = await ignoredOldCookies.request("/get-session")
    expect(ignoredLegacySession.status).toBe(200)
    expect(ignoredLegacySession.session).toEqual({ authenticated: false })

    const staleSessionClient = client.fork()
    const authenticatedSession = await client.request("/get-session")
    expect(authenticatedSession.status).toBe(200)
    expect(authenticatedSession.session).toEqual({ authenticated: true, email })

    const signOut = await client.request("/sign-out", { body: {} })
    expect(signOut.status).toBe(200)
    expect(signOut.cookies.map(({ name }) => name)).toContain(
      partitionedDevelopmentSessionCookieName,
    )

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
      ({ name }) => name === standardSecureSessionCookieName,
    )
    expect(sessionCookie?.name).toBe(standardSecureSessionCookieName)
    expect(sessionCookie?.attributes).toEqual(
      expect.arrayContaining(["HttpOnly", "Secure", "SameSite=None", "Path=/"]),
    )
    expect(sessionCookie?.attributes).not.toContain("Partitioned")
    expect(sessionCookie?.attributes.some((attribute) => attribute.startsWith("Domain="))).toBe(
      false,
    )
  })

  it("ignores legacy cookie families under the standard HTTPS topology", async () => {
    const auth = createStandaloneAuth("production")
    const client = createSessionTestClient(
      (request) => auth.handler(request),
      idpBaseUrl,
      new Map([
        [legacySecureSessionCookieName, "opaque-legacy-value"],
        [transitionalSecureSessionCookieName, "opaque-transitional-value"],
      ]),
    )

    const response = await client.request("/get-session")

    expect(response.status).toBe(200)
    expect(response.session).toEqual({ authenticated: false })
  })

  it("uses the selected TRIAD family for the native OAuth state cookie", async () => {
    const auth = createStandaloneAuth("development")
    const client = createSessionTestClient((request) => auth.handler(request))

    const response = await client.request("/sign-in/social", {
      body: { callbackURL: `${studioOrigin}/login`, provider: "google" },
    })

    expect(response.status).toBe(200)
    expect(response.oauthCallbackUri).toBe(`${idpBaseUrl}/api/auth/callback/google`)
    expect(response.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attributes: expect.arrayContaining([
            "HttpOnly",
            "Secure",
            "SameSite=None",
            "Partitioned",
            "Path=/",
          ]),
          name: "__Secure-triad-auth-partitioned.state",
        }),
      ]),
    )
    expect(
      response.cookies.every(({ name }) => name.startsWith("__Secure-triad-auth-partitioned.")),
    ).toBe(true)
  })
})

describe("createAuthOptions", () => {
  const env = {
    NODE_ENV: "test",
    APP_ENV: "test",
    API_HOST: "127.0.0.1",
    API_PORT: 8000,
    DATABASE_URL: "postgresql://idp:idp@127.0.0.1:5432/idp",
    BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
    BETTER_AUTH_URL: "http://127.0.0.1:8000",
    AUTH_TRUSTED_ORIGINS: ["http://localhost:3000"],
    AUTH_SESSION_EXPIRES_IN_SECONDS: 2_592_000,
    AUTH_PASSWORD_MIN_LENGTH: 8,
    AUTH_PASSWORD_MAX_LENGTH: 256,
    AUTH_RESET_PASSWORD_TOKEN_EXPIRES_IN_SECONDS: 3_600,
    AUTH_GOOGLE_CLIENT_ID: "google-client-id-placeholder",
    AUTH_GOOGLE_CLIENT_SECRET: "google-client-secret-placeholder",
    IDP_EMAIL_FROM: "auth@example.invalid",
    IDP_STUDIO_URL: "http://localhost:3000",
    IDP_RESEND_API_KEY: "resend-api-key-placeholder",
    IDP_RESEND_API_URL: "https://api.resend.com",
  } as const

  const emailSender = {
    sendInvitation: async () => "sent" as const,
    sendPasswordReset: async () => "sent" as const,
    sendVerification: async () => "sent" as const,
  }

  const testPassword = "test-password-123"

  it("configures organization tenancy without enabling public provisioning", () => {
    const options = createAuthOptions(env as never, {} as never, emailSender)
    const plugin = options.plugins?.find((candidate) => candidate.id === "organization") as
      | { options?: Record<string, unknown>; schema?: Record<string, unknown> }
      | undefined

    expect(plugin).toBeDefined()
    expect(plugin?.options).toMatchObject({
      allowUserToCreateOrganization: false,
      creatorRole: "owner",
      disableOrganizationDeletion: true,
      dynamicAccessControl: { enabled: false },
      schema: {
        invitation: { modelName: "organizationInvitation" },
        member: { modelName: "member" },
        organization: { modelName: "organization" },
        session: { fields: { activeOrganizationId: "active_organization_id" } },
      },
    })
    expect(plugin?.schema).not.toHaveProperty("team")
    expect(options.plugins?.some((candidate) => candidate.id === "admin")).toBe(false)
  })

  type GoogleIdentity = {
    id: string
    email: string
    emailVerified: boolean
    name: string
  }

  type LocalIdentity = {
    email: string
    emailVerified: boolean
    id: string
    name: string
    role: "admin" | "member"
    status: "active" | "disabled"
  }

  function createHookDb(rowsByQuery: unknown[][]) {
    let queryIndex = 0
    const takeRows = async () => rowsByQuery[queryIndex++] ?? []

    return {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: takeRows,
            orderBy: () => ({ limit: takeRows }),
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({ returning: async () => [] }),
        }),
      }),
    }
  }

  async function createAuthPolicyHarness({
    googleIdentity,
    hookSelectRows,
    localIdentity,
  }: {
    googleIdentity: GoogleIdentity
    hookSelectRows?: unknown[][]
    localIdentity?: LocalIdentity
  }) {
    const now = new Date()
    const persistedUser = localIdentity
      ? { ...localIdentity, createdAt: now, image: null, updatedAt: now }
      : undefined
    const memoryDb: Record<string, Array<Record<string, unknown>>> = {
      account: persistedUser
        ? [
            {
              accountId: persistedUser.id,
              createdAt: now,
              id: `credential-${persistedUser.id}`,
              password: await hashPassword(testPassword),
              providerId: "credential",
              updatedAt: now,
              userId: persistedUser.id,
            },
          ]
        : [],
      session: [],
      user: persistedUser ? [persistedUser] : [],
      verification: [],
    }
    const defaultHookRows = persistedUser ? [[persistedUser]] : [[], []]
    const options = createAuthOptions(
      env as never,
      createHookDb(hookSelectRows ?? defaultHookRows) as never,
      emailSender,
    )
    const google = options.socialProviders?.google
    if (!google || typeof google === "function") {
      throw new Error("Expected the Google provider configuration.")
    }

    const auth = betterAuth({
      ...options,
      database: memoryAdapter(memoryDb),
      logger: { disabled: true },
      rateLimit: { enabled: false },
      socialProviders: {
        google: {
          ...google,
          getUserInfo: async () => ({ data: googleIdentity, user: googleIdentity }),
          verifyIdToken: async () => true,
        },
      },
    })
    const client = createSessionTestClient((request) => auth.handler(request), env.BETTER_AUTH_URL)

    return { client, memoryDb }
  }

  it("observes detached background task failures without logging sensitive context", () => {
    const catchTaskFailure = vi.fn()

    handleBackgroundTask({ catch: catchTaskFailure } as unknown as Promise<unknown>)

    expect(catchTaskFailure).toHaveBeenCalledOnce()
    const rejectionHandler = catchTaskFailure.mock.calls[0]?.[0]
    expect(rejectionHandler).toBeTypeOf("function")
    expect(rejectionHandler?.(new Error("delivery failed"))).toBeUndefined()
  })

  it("keeps existing and unknown reset responses identical when delivery fails", async () => {
    const existingEmail = "existing-reset-user@example.invalid"
    const observeDeliveryFailure = vi.fn()
    const failingEmailSender = {
      ...emailSender,
      sendPasswordReset: vi.fn(async () => "failed" as const),
    }
    const options = createAuthOptions(
      env as never,
      {} as never,
      failingEmailSender,
      observeDeliveryFailure,
    )
    const sendResetPassword = options.emailAndPassword?.sendResetPassword
    if (!sendResetPassword) throw new Error("Expected reset delivery callback to be configured.")

    const auth = createStandaloneAuth("local", localIdpBaseUrl, sendResetPassword)
    const createdUser = await createStandaloneUser(auth, existingEmail, localIdpBaseUrl)
    expect(createdUser.status).toBe(200)

    const client = createSessionTestClient((request) => auth.handler(request), localIdpBaseUrl)
    const existingResponse = await client.request("/request-password-reset", {
      body: { email: existingEmail, redirectTo: `${studioOrigin}/reset-password` },
    })
    const unknownResponse = await client.request("/request-password-reset", {
      body: {
        email: "unknown-reset-user@example.invalid",
        redirectTo: `${studioOrigin}/reset-password`,
      },
    })

    expect({ body: existingResponse.body, status: existingResponse.status }).toEqual({
      body: unknownResponse.body,
      status: unknownResponse.status,
    })
    expect(existingResponse.status).toBe(200)
    expect(failingEmailSender.sendPasswordReset).toHaveBeenCalledOnce()
    expect(observeDeliveryFailure).toHaveBeenCalledOnce()
    expect(observeDeliveryFailure).toHaveBeenCalledWith({
      event: "auth_email_delivery_failed",
      operation: "password_reset",
    })
    expect(JSON.stringify(observeDeliveryFailure.mock.calls)).not.toContain(existingEmail)
  })

  it("records reset delivery exceptions without sensitive context or response failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const sensitiveEmail = "private-reset-user@example.invalid"
    const sensitiveToken = "opaque-private-reset-token"
    const sensitiveFailure = "provider response with private context"
    const failingEmailSender = {
      ...emailSender,
      sendPasswordReset: vi.fn(async () => {
        throw new Error(sensitiveFailure)
      }),
    }

    try {
      const options = createAuthOptions(env as never, {} as never, failingEmailSender)
      const sendResetPassword = options.emailAndPassword?.sendResetPassword
      if (!sendResetPassword) throw new Error("Expected reset delivery callback to be configured.")

      await expect(
        sendResetPassword(
          {
            token: sensitiveToken,
            url: "https://idp.example.invalid/reset-password/private-value",
            user: { email: sensitiveEmail },
          } as never,
          new Request("https://idp.example.invalid/api/auth/request-password-reset"),
        ),
      ).resolves.toBeUndefined()

      expect(consoleError).toHaveBeenCalledOnce()
      expect(consoleError).toHaveBeenCalledWith(
        '{"event":"auth_email_delivery_failed","operation":"password_reset"}',
      )
      const loggedContext = JSON.stringify(consoleError.mock.calls)
      expect(loggedContext).not.toContain(sensitiveEmail)
      expect(loggedContext).not.toContain(sensitiveToken)
      expect(loggedContext).not.toContain(sensitiveFailure)
      expect(loggedContext).not.toContain("private-value")
    } finally {
      consoleError.mockRestore()
    }
  })

  it("configures the native verification, Google, linking, token, and rate-limit contract", () => {
    const options = createAuthOptions(env as never, {} as never, emailSender)

    expect(options.emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
    })
    expect(options.emailVerification).toMatchObject({
      autoSignInAfterVerification: false,
      sendOnSignIn: true,
      sendOnSignUp: false,
    })
    expect(options.socialProviders?.google).toMatchObject({
      disableDefaultScope: true,
      overrideUserInfoOnSignIn: false,
      scope: ["openid", "email", "profile"],
    })
    expect(options.account).toMatchObject({
      encryptOAuthTokens: true,
      accountLinking: {
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        disableImplicitLinking: false,
        enabled: true,
        requireLocalEmailVerified: false,
        updateUserInfoOnLink: false,
      },
    })
    expect(options.rateLimit).toMatchObject({ enabled: true, storage: "memory" })
    expect(options.advanced?.backgroundTasks?.handler).toBeTypeOf("function")
    expect(options.databaseHooks?.user?.create?.before).toBeTypeOf("function")
    expect(options.databaseHooks?.account?.create?.before).toBeTypeOf("function")
    expect(options.databaseHooks?.session?.create?.before).toBeTypeOf("function")
  })

  it("accepts one invitation with a session and rejects replay", async () => {
    const secret = createInvitationSecret()
    const now = new Date()
    const memoryDb: Record<string, Array<Record<string, unknown>>> = {
      account: [],
      invitation: [
        {
          acceptedAt: null,
          acceptedByUserId: null,
          createdAt: now,
          email: "invited-user@example.invalid",
          expiresAt: new Date(now.getTime() + 60_000),
          id: "invitation-id",
          invitedByUserId: null,
          role: "member",
          status: "pending",
          tokenDigest: secret.digest,
          tokenIssuedAt: now,
          updatedAt: now,
        },
      ],
      session: [],
      user: [],
      verification: [],
    }
    const sessionHookDb = {
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => memoryDb.user.slice(0, 1) }),
        }),
      }),
    }
    const onInvitationAccepted = vi.fn(async () => undefined)
    const options = createAuthOptions(
      env as never,
      sessionHookDb as never,
      emailSender,
      undefined,
      onInvitationAccepted,
    )
    const auth = betterAuth({
      ...options,
      database: memoryAdapter(memoryDb),
      logger: { disabled: true },
      rateLimit: { enabled: false },
    })
    const firstClient = createSessionTestClient(
      (request) => auth.handler(request),
      env.BETTER_AUTH_URL,
    )
    const secondClient = createSessionTestClient(
      (request) => auth.handler(request),
      env.BETTER_AUTH_URL,
    )
    const body = {
      email: "invitation-proof@invalid.example",
      invitationToken: secret.token,
      name: "Usuário TRIAD",
      password: "Senha válida 1!",
      rememberMe: false,
    }

    const responses = [
      await firstClient.request("/sign-up/email", { body }),
      await secondClient.request("/sign-up/email", { body }),
    ]

    expect(responses.map((response) => response.status).sort()).toEqual([200, 403])
    expect(memoryDb.user).toHaveLength(1)
    expect(memoryDb.user[0]).toMatchObject({
      email: "invited-user@example.invalid",
      emailVerified: true,
      role: "member",
      status: "active",
    })
    expect(memoryDb.account).toHaveLength(1)
    expect(memoryDb.account[0]).toMatchObject({ providerId: "credential" })
    expect(memoryDb.session).toHaveLength(1)
    expect(memoryDb.invitation[0]).toMatchObject({
      acceptedByUserId: memoryDb.user[0]?.id,
      status: "accepted",
    })
    expect(onInvitationAccepted).toHaveBeenCalledWith(expect.any(String), memoryDb.user[0]?.id)
  })

  it("rolls back invitation consumption and native identity writes after credential failure", async () => {
    const secret = createInvitationSecret()
    const now = new Date()
    const memoryDb: Record<string, Array<Record<string, unknown>>> = {
      account: [],
      invitation: [
        {
          acceptedAt: null,
          acceptedByUserId: null,
          createdAt: now,
          email: "rollback-user@example.invalid",
          expiresAt: new Date(now.getTime() + 60_000),
          id: "rollback-invitation-id",
          invitedByUserId: null,
          role: "member",
          status: "pending",
          tokenDigest: secret.digest,
          tokenIssuedAt: now,
          updatedAt: now,
        },
      ],
      session: [],
      user: [],
      verification: [],
    }
    const options = createAuthOptions(env as never, {} as never, emailSender)
    const accountCreateBefore = options.databaseHooks?.account?.create?.before
    if (!accountCreateBefore) throw new Error("Expected the credential proof hook.")

    const auth = betterAuth({
      ...options,
      database: memoryAdapter(memoryDb),
      databaseHooks: {
        ...options.databaseHooks,
        account: {
          create: {
            ...options.databaseHooks?.account?.create,
            before: async (incomingAccount: unknown, context: unknown) => {
              await accountCreateBefore(incomingAccount as never, context as never)
              throw new Error("Injected credential persistence failure.")
            },
          },
        },
      },
      logger: { disabled: true },
      rateLimit: { enabled: false },
    })
    const client = createSessionTestClient((request) => auth.handler(request), env.BETTER_AUTH_URL)

    const response = await client.request("/sign-up/email", {
      body: {
        email: "untrusted-input@example.invalid",
        invitationToken: secret.token,
        name: "Usuário TRIAD",
        password: "Senha válida 1!",
        rememberMe: false,
      },
    })

    expect(response.status).toBe(500)
    expect(memoryDb.user).toHaveLength(0)
    expect(memoryDb.account).toHaveLength(0)
    expect(memoryDb.invitation[0]).toMatchObject({
      acceptedAt: null,
      acceptedByUserId: null,
      status: "pending",
    })
  })

  it("rejects a Google user-create callback without a verified email claim", async () => {
    const options = createAuthOptions(env as never, {} as never, emailSender)

    await expect(
      options.databaseHooks?.user?.create?.before?.(
        {
          email: "recipient@example.invalid",
          emailVerified: false,
          name: "Test identity",
        } as never,
        { path: "/callback/google" } as never,
      ),
    ).rejects.toMatchObject({ status: "FORBIDDEN" })
  })

  it("links a provider-verified normalized same-email Google identity and creates a session", async () => {
    const localIdentity = {
      email: "existing-user@example.invalid",
      emailVerified: false,
      id: "existing-user-id",
      name: "Existing user",
      role: "member",
      status: "active",
    } as const
    const { client, memoryDb } = await createAuthPolicyHarness({
      googleIdentity: {
        email: "EXISTING-USER@example.invalid",
        emailVerified: true,
        id: "google-existing-user-id",
        name: "Google user",
      },
      localIdentity,
    })

    const response = await client.request("/sign-in/social", {
      body: { idToken: { token: "verified-google-token" }, provider: "google" },
    })

    expect(response.status).toBe(200)
    expect(memoryDb.account).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId: "google-existing-user-id",
          providerId: "google",
          userId: localIdentity.id,
        }),
      ]),
    )
    expect(memoryDb.session).toHaveLength(1)
    expect(memoryDb.user[0]).toMatchObject({
      email: localIdentity.email,
      emailVerified: true,
      id: localIdentity.id,
      name: localIdentity.name,
      role: localIdentity.role,
      status: localIdentity.status,
    })
  })

  it("keeps password sign-in verification-gated for a locally unverified user", async () => {
    const localIdentity = {
      email: "password-user@example.invalid",
      emailVerified: false,
      id: "password-user-id",
      name: "Password user",
      role: "member",
      status: "active",
    } as const
    const { client, memoryDb } = await createAuthPolicyHarness({
      googleIdentity: {
        email: localIdentity.email,
        emailVerified: true,
        id: "unused-google-id",
        name: "Unused Google user",
      },
      localIdentity,
    })

    const response = await client.request("/sign-in/email", {
      body: { email: localIdentity.email, password: testPassword },
    })

    expect(response.status).toBe(403)
    expect(memoryDb.session).toHaveLength(0)
    expect(memoryDb.user[0]).toMatchObject({ emailVerified: false })
  })

  it("rejects an unverified invited Google identity without creating a usable session", async () => {
    const email = "invited-unverified-google@example.invalid"
    const pendingInvitation = {
      email,
      expiresAt: new Date(Date.now() + 60_000),
      id: "pending-unverified-google-invitation-id",
      role: "member",
      status: "pending",
    }
    const { client, memoryDb } = await createAuthPolicyHarness({
      googleIdentity: {
        email,
        emailVerified: false,
        id: "invited-unverified-google-account-id",
        name: "Invited unverified Google user",
      },
      hookSelectRows: [
        [],
        [pendingInvitation],
        [pendingInvitation],
        [{ emailVerified: false, status: "active" }],
      ],
    })

    const response = await client.request("/sign-in/social", {
      body: { idToken: { token: "invited-unverified-google-token" }, provider: "google" },
    })
    const session = await client.request("/get-session")

    expect(response.status).toBe(403)
    expect(response.cookies.map(({ name }) => name)).not.toContain(localSessionCookieName)
    expect(memoryDb.session).toHaveLength(0)
    expect(session.status).toBe(200)
    expect(session.session).toEqual({ authenticated: false })
  })

  it("rejects an unverified Google identity for an existing same-email user", async () => {
    const localIdentity = {
      email: "unverified-google@example.invalid",
      emailVerified: false,
      id: "unverified-google-user-id",
      name: "Unverified Google user",
      role: "member",
      status: "active",
    } as const
    const { client, memoryDb } = await createAuthPolicyHarness({
      googleIdentity: {
        email: localIdentity.email,
        emailVerified: false,
        id: "unverified-google-account-id",
        name: "Unverified Google user",
      },
      localIdentity,
    })

    const response = await client.request("/sign-in/social", {
      body: { idToken: { token: "unverified-google-token" }, provider: "google" },
    })

    expect(response.status).toBe(401)
    expect(memoryDb.account).toHaveLength(1)
    expect(memoryDb.session).toHaveLength(0)
    expect(memoryDb.user[0]).toMatchObject({ emailVerified: false })
  })

  it("rejects a different-email Google identity instead of linking it", async () => {
    const localIdentity = {
      email: "local-user@example.invalid",
      emailVerified: false,
      id: "local-user-id",
      name: "Local user",
      role: "member",
      status: "active",
    } as const
    const { client, memoryDb } = await createAuthPolicyHarness({
      googleIdentity: {
        email: "different-user@example.invalid",
        emailVerified: true,
        id: "different-google-account-id",
        name: "Different Google user",
      },
      hookSelectRows: [[], []],
      localIdentity,
    })

    const response = await client.request("/sign-in/social", {
      body: { idToken: { token: "different-email-google-token" }, provider: "google" },
    })

    expect(response.status).toBe(401)
    expect(memoryDb.account).toHaveLength(1)
    expect(memoryDb.session).toHaveLength(0)
    expect(memoryDb.user).toHaveLength(1)
  })

  it("rejects an unknown uninvited Google identity", async () => {
    const { client, memoryDb } = await createAuthPolicyHarness({
      googleIdentity: {
        email: "unknown-user@example.invalid",
        emailVerified: true,
        id: "unknown-google-account-id",
        name: "Unknown Google user",
      },
    })

    const response = await client.request("/sign-in/social", {
      body: { idToken: { token: "unknown-google-token" }, provider: "google" },
    })

    expect(response.status).toBe(401)
    expect(memoryDb.account).toHaveLength(0)
    expect(memoryDb.session).toHaveLength(0)
    expect(memoryDb.user).toHaveLength(0)
  })

  it("rejects a disabled existing user from creating a Google session", async () => {
    const localIdentity = {
      email: "disabled-user@example.invalid",
      emailVerified: false,
      id: "disabled-user-id",
      name: "Disabled user",
      role: "member",
      status: "disabled",
    } as const
    const { client, memoryDb } = await createAuthPolicyHarness({
      googleIdentity: {
        email: localIdentity.email,
        emailVerified: true,
        id: "disabled-google-account-id",
        name: "Disabled Google user",
      },
      localIdentity,
    })

    const response = await client.request("/sign-in/social", {
      body: { idToken: { token: "disabled-user-google-token" }, provider: "google" },
    })

    expect(response.status).toBe(403)
    expect(memoryDb.session).toHaveLength(0)
  })
})
