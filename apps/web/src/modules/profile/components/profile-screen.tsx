import { Mail, UserRound } from "lucide-react"

import type { AuthSession } from "@/modules/auth/services/auth-provider"

export function ProfileScreen({ session }: { session: AuthSession }) {
  const name = session.user.name || "Nome não informado"
  const email = session.user.email || "E-mail não informado"

  return (
    <section className="max-w-2xl space-y-5">
      <dl className="divide-y rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="grid gap-1 p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <UserRound className="size-4" aria-hidden="true" />
            Nome
          </dt>
          <dd className="break-words text-sm font-medium sm:text-base">{name}</dd>
        </div>
        <div className="grid gap-1 p-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Mail className="size-4" aria-hidden="true" />
            E-mail
          </dt>
          <dd className="break-words text-sm font-medium sm:text-base">{email}</dd>
        </div>
      </dl>
    </section>
  )
}
