import { createContext, type ReactNode, useContext, useEffect, useState } from "react"

export type SupportSession = {
  contextId: string
  credential: string
  expiresAt: string
  organizationId: string
  organizationName: string
}

type SupportSessionValue = {
  exit: () => void
  session: SupportSession | null
  start: (session: SupportSession) => void
}

const Context = createContext<SupportSessionValue | null>(null)

export function SupportSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SupportSession | null>(null)

  useEffect(() => {
    if (!session) return
    const remaining = new Date(session.expiresAt).getTime() - Date.now()
    if (remaining <= 0) {
      setSession(null)
      return
    }
    const timeout = window.setTimeout(() => setSession(null), remaining)
    return () => window.clearTimeout(timeout)
  }, [session])

  return (
    <Context value={{ exit: () => setSession(null), session, start: setSession }}>
      {children}
    </Context>
  )
}

export function useSupportSession() {
  const value = useContext(Context)
  if (!value) throw new Error("useSupportSession must be used inside SupportSessionProvider.")
  return value
}
