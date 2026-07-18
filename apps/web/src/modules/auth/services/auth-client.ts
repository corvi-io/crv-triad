import { createAuthClient } from "better-auth/react"

import { env } from "@/modules/shared/config/env"

export const authClient = createAuthClient({
  baseURL: getAbsoluteAuthBaseUrl(),
})

export async function signInWithEmail(input: { email: string; password: string }) {
  return authClient.signIn.email({
    callbackURL: getBrowserUrl("/overview"),
    email: input.email,
    password: input.password,
  })
}

export async function signUpWithEmail(input: { email: string; name: string; password: string }) {
  return authClient.signUp.email({
    callbackURL: getBrowserUrl("/overview"),
    email: input.email,
    name: input.name,
    password: input.password,
  })
}

export async function requestPasswordReset(email: string) {
  return authClient.requestPasswordReset({
    email,
    redirectTo: getBrowserUrl("/login"),
  })
}

export async function signOut() {
  return authClient.signOut()
}

function getAbsoluteAuthBaseUrl() {
  if (env.authBaseUrl.startsWith("http://") || env.authBaseUrl.startsWith("https://")) {
    return env.authBaseUrl
  }

  return new URL(env.authBaseUrl, getBrowserOrigin()).toString()
}

function getBrowserUrl(path: string) {
  return new URL(path, getBrowserOrigin()).toString()
}

function getBrowserOrigin() {
  return typeof window === "undefined" ? "http://localhost:3000" : window.location.origin
}
