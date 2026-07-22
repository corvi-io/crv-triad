import { type ReactNode, useEffect, useRef } from "react"

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
          <a className="flex w-fit items-center gap-2 text-sm font-medium" href="/">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              T
            </span>
            TRIAD Studio
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
        className="auth-brand-surface relative hidden h-svh overflow-hidden lg:block"
        aria-label="Identidade visual do TRIAD Studio"
      >
        <img
          src="/placeholder.svg"
          alt=""
          className="absolute inset-0 size-full object-cover opacity-15 mix-blend-luminosity"
        />
      </section>
    </main>
  )
}
