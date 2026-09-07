import {
  ArrowRightIcon,
  Building2Icon,
  CalendarClockIcon,
  CheckIcon,
  CircleIcon,
  EyeIcon,
  ScissorsIcon,
  StoreIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react"
import { type ReactNode, useEffect, useRef } from "react"
import type { SetupSection } from "@/modules/barbershop-setup/contracts"
import { StatusBadge } from "@/modules/shared/components/feedback/status-badge"
import { Button } from "@/modules/shared/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/modules/shared/components/ui/card"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/modules/shared/components/ui/dialog"
import { cn } from "@/modules/shared/lib/utils"
import type { ActivationReadiness } from "./readiness"

const stepIcons = {
  business: StoreIcon,
  primary_unit: Building2Icon,
  professional: UserRoundIcon,
  service: ScissorsIcon,
  availability: CalendarClockIcon,
} as const

export function PersistentOnboardingDialog({
  actions,
  children,
  currentSection,
  onSectionChange,
  readiness,
  onDismiss,
}: {
  actions?: ReactNode
  children: ReactNode
  currentSection: SetupSection
  onSectionChange: (section: SetupSection) => void
  onDismiss: () => void
  readiness: ActivationReadiness
}) {
  const progress = Math.round((readiness.completedCount / readiness.totalCount) * 100)
  const firstIncompleteIndex = readiness.steps.findIndex((step) => !step.complete)
  const stepsNavigationRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const navigation = stepsNavigationRef.current
    const current = navigation?.querySelector<HTMLElement>(
      `[data-onboarding-section="${currentSection}"]`,
    )
    if (!navigation || !current) return
    const timer = window.setTimeout(() => {
      const position = current.parentElement?.offsetLeft ?? current.offsetLeft
      if (typeof navigation.scrollTo !== "function") return

      navigation.scrollTo({
        left: position - (navigation.clientWidth - current.offsetWidth) / 2,
        behavior: "auto",
      })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [currentSection])

  return (
    <Dialog open modal onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-6xl"
        aria-describedby="onboarding-description"
      >
        <DialogHeader className="gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid gap-1">
              <DialogTitle>Configure sua barbearia</DialogTitle>
              <DialogDescription id="onboarding-description">
                Conclua as etapas essenciais para abrir a Agenda e receber o primeiro agendamento.
              </DialogDescription>
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
          <Button
            type="button"
            aria-label="Fechar configuração inicial"
            className="absolute top-3 right-3"
            size="icon"
            variant="ghost"
            onClick={onDismiss}
          >
            <XIcon aria-hidden="true" />
          </Button>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
              <span>{progress}% concluído</span>
              <span className="tabular-nums">
                {readiness.completedCount} de {readiness.totalCount} etapas
              </span>
            </div>
            <div
              className="h-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Progresso da configuração inicial"
              aria-valuemin={0}
              aria-valuemax={readiness.totalCount}
              aria-valuenow={readiness.completedCount}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <nav
            ref={stepsNavigationRef}
            aria-label="Etapas da configuração inicial"
            className="overflow-x-auto pb-1"
          >
            <ol className="grid min-w-[50rem] grid-cols-6">
              {readiness.steps.map((step, index) => {
                const isCurrent = currentSection === step.section
                const isLocked =
                  firstIncompleteIndex >= 0 && index > firstIncompleteIndex && !step.complete
                return (
                  <li className="relative flex justify-center" key={step.id}>
                    {index > 0 ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-4 right-1/2 h-px w-full bg-border",
                          step.complete && "bg-primary/60",
                        )}
                      />
                    ) : null}
                    <button
                      type="button"
                      data-onboarding-section={step.section}
                      disabled={isLocked}
                      aria-current={isCurrent ? "step" : undefined}
                      className="group relative z-10 flex min-h-16 w-full cursor-pointer flex-col items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground disabled:cursor-not-allowed"
                      onClick={() => onSectionChange(step.section as SetupSection)}
                    >
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border bg-popover group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-popover",
                          step.complete && "border-primary text-primary",
                          isCurrent && "border-primary bg-primary text-primary-foreground",
                          isLocked && "border-border bg-popover text-muted-foreground/40",
                        )}
                      >
                        {step.complete ? (
                          <CheckIcon
                            aria-hidden="true"
                            className="size-4 animate-in zoom-in-50 duration-200 motion-reduce:animate-none"
                          />
                        ) : (
                          <span aria-hidden="true" className="tabular-nums">
                            {index + 1}
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          isCurrent && "text-foreground",
                          isLocked && "text-muted-foreground/45",
                        )}
                      >
                        {step.title}
                      </span>
                    </button>
                  </li>
                )
              })}
              <li className="relative flex justify-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-4 right-1/2 h-px w-full bg-border",
                    readiness.outcome === "schedule_ready" && "bg-primary/60",
                  )}
                />
                <button
                  type="button"
                  data-onboarding-section="overview"
                  disabled={readiness.outcome !== "schedule_ready"}
                  aria-current={currentSection === "overview" ? "step" : undefined}
                  className="group relative z-10 flex min-h-16 w-full cursor-pointer flex-col items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground disabled:cursor-not-allowed"
                  onClick={() => onSectionChange("overview")}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border bg-popover group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-popover",
                      currentSection === "overview" &&
                        "border-primary bg-primary text-primary-foreground",
                      readiness.outcome !== "schedule_ready" &&
                        "border-border bg-popover text-muted-foreground/40",
                    )}
                  >
                    <EyeIcon aria-hidden="true" className="size-4" />
                  </span>
                  <span
                    className={cn(
                      currentSection === "overview" && "text-foreground",
                      readiness.outcome !== "schedule_ready" && "text-muted-foreground/45",
                    )}
                  >
                    Revisão
                  </span>
                </button>
              </li>
            </ol>
          </nav>
        </DialogHeader>
        <DialogBody className="bg-card/45">
          <div
            key={currentSection}
            className="animate-in fade-in-0 duration-200 motion-reduce:animate-none"
          >
            {currentSection === "overview" ? (
              <OnboardingReview readiness={readiness} onSectionChange={onSectionChange} />
            ) : (
              children
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function OnboardingReview({
  onSectionChange,
  readiness,
}: {
  onSectionChange: (section: SetupSection) => void
  readiness: ActivationReadiness
}) {
  const next = readiness.steps.find((step) => step.id === readiness.nextStepId)

  return (
    <section aria-labelledby="onboarding-review-title" className="grid gap-5">
      <Card className="ring-primary/25">
        <CardHeader className="border-b pb-5">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-primary">
              <CalendarClockIcon aria-hidden="true" className="size-5" />
            </span>
            <div className="grid gap-1">
              <h2 id="onboarding-review-title" className="font-heading text-lg font-semibold">
                Sua barbearia está quase pronta
              </h2>
              <p className="text-sm text-muted-foreground">
                {next?.description ??
                  "Revise as etapas essenciais antes de abrir o espaço de trabalho."}
              </p>
            </div>
          </div>
        </CardHeader>
        {next ? (
          <CardFooter className="justify-end">
            <Button type="button" onClick={() => onSectionChange(next.section as SetupSection)}>
              Continuar configuração
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <div>
        <h3 className="text-base font-semibold">Etapas da configuração</h3>
        <p className="text-sm text-muted-foreground">
          Você pode revisar qualquer etapa antes de continuar.
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-2">
        {readiness.steps.map((step) => {
          const Icon = stepIcons[step.id as keyof typeof stepIcons] ?? CircleIcon
          return (
            <li key={step.id}>
              <Card className={cn("h-full", step.complete && "ring-primary/20")}>
                <CardHeader>
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border bg-muted text-muted-foreground",
                      step.complete && "border-primary/50 bg-primary/10 text-primary",
                    )}
                  >
                    {step.complete ? (
                      <CheckIcon aria-label="Etapa concluída" className="size-4" />
                    ) : (
                      <Icon aria-hidden="true" className="size-4" />
                    )}
                  </span>
                  <h4 className="font-heading text-base font-medium">{step.title}</h4>
                  <CardAction>
                    <StatusBadge tone={step.complete ? "success" : "warning"}>
                      {step.complete ? "Completa" : "Pendente"}
                    </StatusBadge>
                  </CardAction>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {step.description}
                </CardContent>
                <CardFooter className="justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onSectionChange(step.section as SetupSection)}
                  >
                    {step.complete ? "Revisar" : "Configurar"}
                    <ArrowRightIcon aria-hidden="true" />
                  </Button>
                </CardFooter>
              </Card>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
