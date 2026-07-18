import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/modules/shared/components/ui/button"
import { cn } from "@/modules/shared/lib/utils"
import { type ThemePreference, useTheme } from "@/modules/shared/theme/theme-provider"

const themeOptions = [
  {
    value: "light",
    label: "Claro",
    description: "Usa a aparência clara.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Usa a aparência escura.",
    icon: Moon,
  },
  {
    value: "system",
    label: "Sistema",
    description: "Acompanha o dispositivo.",
    icon: Monitor,
  },
] as const satisfies readonly {
  value: ThemePreference
  label: string
  description: string
  icon: typeof Sun
}[]

export function PreferencesScreen() {
  const { preference, setPreference } = useTheme()

  return (
    <section className="max-w-2xl space-y-5">
      <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Aparência</h2>
          <p className="text-sm text-muted-foreground">Escolha como o sistema deve aparecer.</p>
        </div>

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
      </section>
    </section>
  )
}
