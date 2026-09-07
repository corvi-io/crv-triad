import { createContext, type ReactNode, useContext, useMemo } from "react"

import { authClient } from "./auth-client"

export type AuthSession = {
  user: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export type AuthState = {
  session: AuthSession | null
  isPending: boolean
  error: Error | null
  refetch: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, error, refetch } = authClient.useSession()
  const value = useMemo<AuthState>(
    () => ({
      session: data,
      isPending,
      error: error instanceof Error ? error : null,
      refetch,
    }),
    [data, error, isPending, refetch],
  )

  return <AuthStateProvider value={value}>{children}</AuthStateProvider>
}

export function AuthStateProvider({ children, value }: { children: ReactNode; value: AuthState }) {
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.")
  }

  return value
}
