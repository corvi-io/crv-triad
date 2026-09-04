import { useQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { getOperator } from "./backstage-client"

export function useOperator() {
  return useQuery({
    queryKey: ["operator"],
    queryFn: ({ signal }) => getOperator(signal),
    staleTime: 60_000,
  })
}

export function OperatorGate({ children }: { children: ReactNode }) {
  const operator = useOperator()

  if (operator.isPending) {
    return (
      <main className="grid min-h-svh place-items-center bg-background text-foreground">
        <p role="status">Validando acesso interno…</p>
      </main>
    )
  }
  if (operator.isError) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
        <section className="max-w-md text-center" role="alert">
          <p className="text-sm font-semibold text-primary">TRIAD Backstage</p>
          <h1 className="mt-3 text-2xl font-semibold">Acesso interno não autorizado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua identidade está válida, mas não possui uma atribuição ativa no Backstage.
          </p>
        </section>
      </main>
    )
  }
  return children
}
