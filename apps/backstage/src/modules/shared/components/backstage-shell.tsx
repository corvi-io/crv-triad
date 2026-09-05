import { Link, useNavigate } from "@tanstack/react-router"
import { Building2Icon, LogOutIcon } from "lucide-react"
import type { ReactNode } from "react"
import { signOut } from "@/modules/auth/services/auth-client"
import { BackstageLogo } from "./branding/backstage-logo"
import { Button } from "./ui/button"

export function BackstageShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  async function leave() {
    await signOut()
    await navigate({ to: "/login", replace: true })
  }
  return (
    <div className="min-h-svh bg-background text-foreground lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b bg-[color:var(--sidebar)] lg:sticky lg:top-0 lg:h-svh lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center px-5 lg:h-full lg:flex-col lg:items-stretch lg:px-6 lg:py-7">
          <Link className="flex items-center gap-3" to="/barbershops">
            <BackstageLogo className="w-36" />
          </Link>
          <nav className="hidden pt-10 lg:block" aria-label="Navegação principal">
            <Link
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
              to="/barbershops"
            >
              <Building2Icon className="size-4" /> Barbearias
            </Link>
          </nav>
          <Button
            aria-label="Sair"
            className="ml-auto lg:mt-auto lg:ml-0"
            onClick={() => void leave()}
            size="sm"
            variant="ghost"
          >
            <LogOutIcon /> <span className="hidden lg:inline">Sair</span>
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <a className="sr-only focus:not-sr-only" href="#main-content">
          Ir para o conteúdo
        </a>
        {children}
      </div>
    </div>
  )
}
