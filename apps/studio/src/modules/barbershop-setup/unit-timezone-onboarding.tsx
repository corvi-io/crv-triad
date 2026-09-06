import { ArrowRightIcon, Clock3Icon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/modules/shared/components/ui/button"
import { Field, FieldLabel } from "@/modules/shared/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"

export const brazilianTimezones = [
  { value: "America/Sao_Paulo", label: "Brasília, São Paulo e Rio de Janeiro" },
  { value: "America/Recife", label: "Recife" },
  { value: "America/Fortaleza", label: "Fortaleza, Natal e João Pessoa" },
  { value: "America/Bahia", label: "Salvador" },
  { value: "America/Maceio", label: "Maceió e Aracaju" },
  { value: "America/Belem", label: "Belém e Macapá" },
  { value: "America/Araguaina", label: "Palmas e Araguaína" },
  { value: "America/Santarem", label: "Santarém" },
  { value: "America/Manaus", label: "Manaus" },
  { value: "America/Cuiaba", label: "Cuiabá" },
  { value: "America/Campo_Grande", label: "Campo Grande" },
  { value: "America/Porto_Velho", label: "Porto Velho" },
  { value: "America/Boa_Vista", label: "Boa Vista" },
  { value: "America/Rio_Branco", label: "Rio Branco" },
  { value: "America/Eirunepe", label: "Eirunepé" },
  { value: "America/Noronha", label: "Fernando de Noronha" },
]

function suggestedTimezone() {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
  return brazilianTimezones.some((option) => option.value === detected) ? detected : ""
}

export function UnitTimezoneOnboarding({
  unitName,
  canManage,
  onConfirm,
}: {
  unitName: string
  canManage: boolean
  onConfirm: (timezone: string) => Promise<void>
}) {
  const [suggestion] = useState(suggestedTimezone)
  const [timezone, setTimezone] = useState(suggestion)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <section
      aria-labelledby="timezone-title"
      className="grid max-w-4xl overflow-hidden rounded-xl border bg-card md:grid-cols-[minmax(0,1fr)_16rem]"
    >
      <form
        className="flex min-w-0 flex-col gap-6 p-5 sm:p-8"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault()
          if (!canManage || saving) return
          if (!timezone) {
            setError("Escolha a cidade ou região da unidade para continuar.")
            return
          }
          setSaving(true)
          setError(null)
          try {
            await onConfirm(timezone)
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Não foi possível salvar. Tente novamente.",
            )
          } finally {
            setSaving(false)
          }
        }}
      >
        <div className="flex flex-col gap-3">
          <Clock3Icon aria-hidden="true" className="size-7 text-primary" />
          <h2 id="timezone-title" className="text-xl font-semibold tracking-tight">
            Vamos preparar a agenda de {unitName}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Primeiro, confirme o horário local da unidade. Assim, cada agendamento aparece na hora
            certa para a equipe.
          </p>
        </div>
        {canManage ? (
          <>
            <Field>
              <FieldLabel htmlFor="unit-timezone" required>
                Cidade ou região da unidade
              </FieldLabel>
              <Select
                items={brazilianTimezones}
                value={timezone || null}
                onValueChange={(value) => {
                  setTimezone(value ?? "")
                  setError(null)
                }}
                disabled={saving}
              >
                <SelectTrigger
                  id="unit-timezone"
                  aria-required="true"
                  aria-invalid={Boolean(error)}
                  aria-describedby={`timezone-help${error ? " timezone-error" : ""}`}
                >
                  <SelectValue placeholder="Selecione uma cidade ou região" />
                </SelectTrigger>
                <SelectContent>
                  {brazilianTimezones.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="timezone-help" className="text-sm text-muted-foreground">
                Escolha uma opção com o mesmo horário da sua unidade.
              </p>
              {suggestion && timezone === suggestion ? (
                <p className="text-sm text-muted-foreground">
                  Sugerimos o horário deste dispositivo. Confira se ele corresponde ao da unidade.
                </p>
              ) : null}
            </Field>
            {error ? (
              <p id="timezone-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col gap-3">
              <Button type="submit" isLoading={saving} className="w-full sm:w-fit">
                Confirmar e continuar
                <ArrowRightIcon aria-hidden="true" />
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Depois de criar os horários de atendimento, o fuso ficará fixo para manter a agenda
                consistente.
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Peça ao responsável pela barbearia para confirmar o horário local da unidade. Depois,
            você poderá consultar a disponibilidade aqui.
          </p>
        )}
      </form>
      <aside
        aria-label="Preparação da agenda"
        className="flex flex-col gap-6 bg-muted/40 p-5 sm:p-8"
      >
        <h3 className="text-sm font-medium">Do horário certo ao primeiro atendimento</h3>
        <ol className="flex flex-col gap-6 text-sm">
          <li aria-current="step" className="flex gap-3">
            <span className="font-semibold text-primary">1.</span>
            <div className="flex flex-col gap-1">
              <span className="font-medium">Confirmar o horário local</span>
              <p className="leading-relaxed text-muted-foreground">
                Todos os agendamentos seguem o horário da unidade.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-muted-foreground">2.</span>
            <div className="flex flex-col gap-1">
              <span className="font-medium">Definir a disponibilidade</span>
              <p className="leading-relaxed text-muted-foreground">
                Escolha o profissional e os dias e horários em que ele atende.
              </p>
            </div>
          </li>
        </ol>
      </aside>
    </section>
  )
}
