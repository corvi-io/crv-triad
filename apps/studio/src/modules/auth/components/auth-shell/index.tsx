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
          <a aria-label="TRIAD Studio — ir para o início" className="block w-fit" href="/">
            <span className="sr-only">TRIAD Studio — ir para o início</span>
            <img
              alt=""
              aria-hidden="true"
              className="h-auto w-36 dark:hidden"
              src="/brand/crv-triad-horizontal-gold.svg"
            />
            <img
              alt=""
              aria-hidden="true"
              className="hidden h-auto w-36 dark:block"
              src="/brand/crv-triad-horizontal-white.svg"
            />
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
        className="auth-brand-surface relative hidden h-svh items-center justify-center overflow-hidden p-16 lg:flex"
        aria-label="Identidade visual do TRIAD Studio"
      >
        <img
          alt=""
          aria-hidden="true"
          className="h-auto w-full max-w-xl dark:hidden"
          src="/brand/crv-triad-stacked-gold.svg"
        />
        <img
          alt=""
          aria-hidden="true"
          className="hidden h-auto w-full max-w-xl dark:block"
          src="/brand/crv-triad-stacked-white.svg"
        />
      </section>
    </main>
  )
}
