import { type ReactNode, useEffect, useRef } from "react"

import { StudioLogo } from "@/modules/shared/components/branding/studio-logo"

type AuthShellProps = {
  children: ReactNode
  description: string
  title: string
}

export function AuthShell({ children, description, title }: AuthShellProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <main
      id="main-content"
      className="grid min-h-svh bg-background text-foreground lg:h-svh lg:overflow-hidden lg:grid-cols-2"
    >
      <section className="flex min-h-svh flex-col p-6 md:p-10 lg:h-svh lg:min-h-0 lg:overflow-y-auto">
        <header>
          <a aria-label="TRIAD Studio — ir para o início" className="block w-fit" href="/">
            <StudioLogo className="w-36" />
          </a>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex flex-col items-center gap-1 text-center">
              <h1
                className="text-2xl font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                ref={headingRef}
                tabIndex={-1}
              >
                {title}
              </h1>
              <p className="text-sm text-balance text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>
        </div>
      </section>

      <section
        className="auth-brand-surface group relative hidden h-svh overflow-hidden lg:block"
        aria-label="Identidade visual do TRIAD Studio"
      >
        <div className="absolute inset-0 motion-safe:animate-[auth-drift_18s_ease-in-out_infinite] motion-reduce:transform-none">
          <img
            alt=""
            aria-hidden="true"
            className="size-full scale-[1.04] object-cover object-center"
            src="/auth/studio-quiet-luxury.webp"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,18,38,.28),transparent_35%),linear-gradient(0deg,rgba(8,18,38,.22),transparent_40%)]" />
        <div className="absolute right-8 bottom-8 left-8 rounded-2xl border border-white/12 bg-[rgba(8,18,38,.58)] p-5 text-white shadow-2xl backdrop-blur-md">
          <p className="max-w-md text-xl font-semibold text-balance">
            Menos improviso. Mais controle do dia.
          </p>
          <p className="mt-1 max-w-lg text-sm text-white/72">
            Agenda, equipe e atendimento organizados para sua barbearia operar com clareza.
          </p>
        </div>
      </section>
    </main>
  )
}
