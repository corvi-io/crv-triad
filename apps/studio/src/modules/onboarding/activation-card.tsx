import { useQuery } from "@tanstack/react-query"
import { ArrowRightIcon, CheckCircle2Icon, RotateCwIcon } from "lucide-react"
import { getApiUrl } from "@/modules/auth/services/auth-client"
import { Button } from "@/modules/shared/components/ui/button"
import { Card, CardContent, CardHeader } from "@/modules/shared/components/ui/card"

export type ActivationReadiness = {
  canManage: boolean
  completedCount: number
  nextStepId: string | null
  outcome: "schedule_ready" | "setup_required"
  steps: readonly {
    complete: boolean
    description: string
    id: string
    section: string
    title: string
  }[]
  totalCount: number
}

export const activationReadinessKey = ["onboarding", "readiness"] as const

export function ActivationCard() {
  const readiness = useQuery({
    queryKey: activationReadinessKey,
    queryFn: async (): Promise<ActivationReadiness> => {
      const response = await fetch(getApiUrl("/api/onboarding/readiness"), {
        credentials: "include",
      })
      if (!response.ok) throw new Error("readiness_unavailable")
      return response.json() as Promise<ActivationReadiness>
    },
  })
  if (readiness.isPending) {
    return (
      <div
        className="mx-4 h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
        role="status"
        aria-label="Carregando próximos passos"
      />
    )
  }
  if (readiness.isError) {
    return (
      <div
        className="mx-4 flex items-center justify-between gap-3 rounded-lg border p-4"
        role="alert"
      >
        <p className="text-sm">Não foi possível carregar os próximos passos.</p>
        <Button variant="outline" onClick={() => void readiness.refetch()}>
          <RotateCwIcon aria-hidden="true" /> Tentar novamente
        </Button>
      </div>
    )
  }
  if (!readiness.data.canManage && readiness.data.outcome !== "schedule_ready") return null
  const next = readiness.data.steps.find((step) => step.id === readiness.data.nextStepId)
  const ready = readiness.data.outcome === "schedule_ready"
  return (
    <Card
      className="onboarding-gold-thread mx-4 overflow-hidden border-primary/30"
      data-ready={ready}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Comece por aqui
            </p>
            <h2 className="font-heading text-base font-medium leading-snug">
              {ready ? "Sua agenda está pronta" : "Prepare o primeiro agendamento"}
            </h2>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">
            {readiness.data.completedCount} de {readiness.data.totalCount}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div
          className="h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Progresso da ativação"
          aria-valuemin={0}
          aria-valuemax={readiness.data.totalCount}
          aria-valuenow={readiness.data.completedCount}
        >
          <div
            className="h-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
            style={{
              width: `${(readiness.data.completedCount / readiness.data.totalCount) * 100}%`,
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {ready ? "Tudo certo para receber o primeiro cliente." : next?.description}
        </p>
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          href={ready ? "/agenda" : `/barbershop-setup/${next?.section ?? "overview"}`}
        >
          {ready ? <CheckCircle2Icon aria-hidden="true" /> : null}
          {ready ? "Abrir agenda" : "Continuar configuração"}
          <ArrowRightIcon aria-hidden="true" />
        </a>
      </CardContent>
    </Card>
  )
}
