import { ChevronDownIcon, MonitorIcon, MoonIcon, ShieldCheckIcon, SunIcon } from "lucide-react"

import { Button } from "@/modules/shared/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/modules/shared/components/ui/collapsible"
import { cn } from "@/modules/shared/lib/utils"
import { type ThemePreference, useTheme } from "@/modules/shared/theme/theme-provider"
import { SecurityAccessSection } from "./security-access-section"

const themeOptions = [
  {
    value: "light",
    label: "Claro",
    description: "Usa a aparência clara.",
    icon: SunIcon,
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Usa a aparência escura.",
    icon: MoonIcon,
  },
  {
    value: "system",
    label: "Sistema",
    description: "Acompanha o dispositivo.",
    icon: MonitorIcon,
  },
] as const satisfies readonly {
  value: ThemePreference
  label: string
  description: string
  icon: typeof SunIcon
}[]

export function PreferencesScreen({ googleResult }: { googleResult?: "connected" | "error" }) {
  const { preference, setPreference } = useTheme()

  return (
    <section className="w-full space-y-4">
      <Collapsible className="group rounded-xl border bg-card shadow-sm" defaultOpen>
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-3 p-4 text-left">
          <SunIcon className="size-4 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <h2 className="font-semibold">Aparência</h2>
            <span className="block text-sm text-muted-foreground">
              Tema claro, escuro ou do sistema.
            </span>
          </span>
          <ChevronDownIcon
            className="size-4 transition-transform group-data-[open]:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t p-4">
          <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const isSelected = preference === option.value

              return (
                <Button
                  aria-checked={isSelected}
                  className={cn(
                    "h-auto min-h-24 flex-col items-start justify-start gap-3 whitespace-normal rounded-lg border p-3 text-left",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-foreground",
                  )}
                  key={option.value}
                  onClick={() => setPreference(option.value)}
                  role="radio"
                  type="button"
                  variant="ghost"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="grid gap-1">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </Button>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible className="group rounded-xl border bg-card shadow-sm" defaultOpen>
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-3 p-4 text-left">
          <ShieldCheckIcon className="size-4 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <h2 className="font-semibold">Segurança e acesso</h2>
            <span className="block text-sm text-muted-foreground">Senha e contas conectadas.</span>
          </span>
          <ChevronDownIcon
            className="size-4 transition-transform group-data-[open]:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t p-4">
          <SecurityAccessSection googleResult={googleResult} />
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
