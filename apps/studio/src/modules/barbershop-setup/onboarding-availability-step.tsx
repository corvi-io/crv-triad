import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarClockIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  createSchedulingCommandClient,
  schedulingRequest,
} from "@/modules/scheduling/http-repository"
import { invalidateSchedulingConsumers } from "@/modules/scheduling/queries"
import { FormField } from "@/modules/shared/components/forms/form-layout"
import { Button } from "@/modules/shared/components/ui/button"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/modules/shared/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/modules/shared/components/ui/toggle-group"
import { useWorkspaceTenantId } from "@/modules/workspace/context-provider"
import type { SetupScenarioId } from "./contracts"
import { useBusinessProfile, useSetupEntities } from "./queries"

const weekdays = [
  ["monday", "Seg"],
  ["tuesday", "Ter"],
  ["wednesday", "Qua"],
  ["thursday", "Qui"],
  ["friday", "Sex"],
  ["saturday", "Sáb"],
  ["sunday", "Dom"],
] as const

const times = Array.from({ length: 96 }, (_, index) => {
  const value = `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`
  return { label: value, value }
})

export function OnboardingAvailabilityStep({
  onCompleted,
  scenarioId,
}: {
  onCompleted: () => Promise<void> | void
  scenarioId: SetupScenarioId
}) {
  const tenantId = useWorkspaceTenantId()
  const cache = useQueryClient()
  const profile = useBusinessProfile()
  const catalogUnits = useSetupEntities({
    kind: "unit",
    page: 1,
    pageSize: 50,
    scenarioId,
    search: "",
    sort: { direction: "asc", field: "name" },
    status: "active",
  })
  const units = useQuery({
    queryKey: ["scheduling", tenantId, "units"],
    queryFn: ({ signal }) =>
      schedulingRequest<{ id: string; name: string; timezone: string | null }[]>(
        "/api/scheduling/units",
        { signal },
      ),
  })
  const unitId = profile.data?.primaryUnitId ?? ""
  const professionals = useQuery({
    enabled: Boolean(unitId),
    queryKey: ["availability", tenantId, "professionals", unitId],
    queryFn: ({ signal }) =>
      schedulingRequest<{ id: string; name: string; unitIds: string[] }[]>(
        "/api/professionals/options",
        { signal },
      ),
  })
  const eligibleProfessionals =
    professionals.data?.filter((professional) => professional.unitIds.includes(unitId)) ?? []
  const [professionalId, setProfessionalId] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [days, setDays] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const actualProfessionalId = professionalId || eligibleProfessionals[0]?.id || ""
  const primaryCatalogUnit = catalogUnits.data?.items.find(
    (item) => item.kind === "unit" && item.id === unitId,
  )

  useEffect(() => {
    if (primaryCatalogUnit?.kind !== "unit" || start || end || days.length) return
    const firstPeriod =
      primaryCatalogUnit.businessHours.periods?.[0] ?? primaryCatalogUnit.businessHours
    setStart(firstPeriod.start)
    setEnd(firstPeriod.end)
    setDays([...firstPeriod.days])
  }, [days.length, end, primaryCatalogUnit, start])

  if (profile.isPending || units.isPending || professionals.isPending || catalogUnits.isPending)
    return <Skeleton className="h-80 w-full" />
  if (profile.isError || units.isError || professionals.isError || catalogUnits.isError)
    return (
      <div role="alert" className="grid gap-3 rounded-xl border p-5">
        <p>Não foi possível preparar a disponibilidade.</p>
        <Button
          className="w-fit"
          variant="outline"
          onClick={() =>
            void Promise.all([
              profile.refetch(),
              units.refetch(),
              professionals.refetch(),
              catalogUnits.refetch(),
            ])
          }
        >
          Tentar novamente
        </Button>
      </div>
    )

  const unit = units.data.find(({ id }) => id === unitId)
  if (!unit?.timezone || !actualProfessionalId)
    return (
      <p role="alert" className="rounded-xl border p-5 text-sm text-muted-foreground">
        Conclua a unidade principal e vincule um profissional ativo antes de definir a
        disponibilidade.
      </p>
    )
  const timezone = unit.timezone

  return (
    <section className="grid gap-6 rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
          <CalendarClockIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="grid gap-1">
          <h2 className="font-heading text-lg font-semibold">Defina a primeira disponibilidade</h2>
          <p className="text-sm text-muted-foreground">
            Informe os dias e horários em que um profissional poderá receber agendamentos.
          </p>
        </div>
      </div>
      <form
        className="grid gap-5"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault()
          if (saving) return
          if (!days.length || start >= end) {
            setError(
              !days.length
                ? "Selecione pelo menos um dia."
                : "O término deve ser posterior ao início.",
            )
            return
          }
          setSaving(true)
          setError(null)
          try {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone })
            await createSchedulingCommandClient()(
              "/api/availability/series",
              {
                unitId,
                professionalId: actualProfessionalId,
                kind: "available",
                start,
                end,
                effectiveFrom: today,
                effectiveUntil: null,
                weekdays: days,
              },
              "POST",
            )
            await invalidateSchedulingConsumers(cache)
            toast.success("Disponibilidade salva.")
            await onCompleted()
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Não foi possível salvar. Tente novamente.",
            )
          } finally {
            setSaving(false)
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FormField id="onboarding-professional" label="Profissional" required>
            <Select
              items={eligibleProfessionals.map(({ id, name }) => ({ label: name, value: id }))}
              value={actualProfessionalId}
              onValueChange={(value) => setProfessionalId(value ?? "")}
            >
              <SelectTrigger id="onboarding-professional">
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {eligibleProfessionals.map(({ id, name }) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormField>
          <TimeSelect id="onboarding-start" label="Início" value={start} onChange={setStart} />
          <TimeSelect id="onboarding-end" label="Término" value={end} onChange={setEnd} />
        </div>
        <FieldSet>
          <FieldLegend variant="label">Dias da semana *</FieldLegend>
          <ToggleGroup
            aria-label="Dias da disponibilidade"
            className="flex-wrap"
            multiple
            value={days}
            onValueChange={(value) => {
              setDays(value)
              setError(null)
            }}
          >
            {weekdays.map(([value, label]) => (
              <ToggleGroupItem key={value} value={value}>
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end border-t pt-4">
          <Button type="submit" isLoading={saving}>
            Salvar e revisar
          </Button>
        </div>
      </form>
    </section>
  )
}

function TimeSelect({
  id,
  label,
  onChange,
  value,
}: {
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} required>
        {label}
      </FieldLabel>
      <Select items={times} value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {times.map((time) => (
              <SelectItem key={time.value} value={time.value}>
                {time.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
