import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CalendarClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  UserRoundIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { useAccessSummary } from "@/modules/access/use-access-summary"
import {
  createSchedulingCommandClient,
  schedulingRequest,
} from "@/modules/scheduling/http-repository"
import { invalidateSchedulingConsumers } from "@/modules/scheduling/queries"
import { SingleSelectListFilter } from "@/modules/shared/components/data-display/list-filter"
import { DatePicker } from "@/modules/shared/components/forms/date-picker"
import { FormSection } from "@/modules/shared/components/forms/form-layout"
import {
  CompactRhfDateField,
  RhfSelectField,
} from "@/modules/shared/components/forms/rhf-form-fields"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Button } from "@/modules/shared/components/ui/button"
import { Field, FieldLabel } from "@/modules/shared/components/ui/field"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/modules/shared/components/ui/toggle-group"
import { FormSubmissionError } from "@/modules/shared/forms/form-submission-error"
import { useWorkspaceContext } from "@/modules/workspace/context-provider"
import {
  addCalendarDays,
  datesInRange,
  navigateAvailabilityDate,
  visibleAvailabilityRange,
  weekdayForDate,
  weekdays,
} from "./availability-dates"
import { AvailabilityTimeGrid } from "./availability-time-grid"
import type { BarbershopSetupSearch } from "./search"
import { UnitTimezoneOnboarding } from "./unit-timezone-onboarding"

type Series = {
  id: string
  unitId: string
  professionalId: string
  kind: "available" | "break" | "blocked" | "absence"
  start: string
  end: string
  weekdays: string[]
  effectiveFrom: string
  effectiveUntil: string | null
  status: "active" | "archived"
  version: number
  excludedDates: string[]
}
type Occurrence = Pick<Series, "start" | "end" | "kind" | "professionalId" | "version"> & {
  id: string
  seriesId: string
  date: string
}
type Projection = {
  timezone: string | null
  series: Series[]
  archived: Series[]
  occurrences: Occurrence[]
}
const labels = {
  available: "Disponível",
  break: "Intervalo",
  blocked: "Bloqueio",
  absence: "Ausência",
}
const dayLabels = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sáb",
  sunday: "Dom",
}
const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const value = `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`
  return { value, label: value }
})
export function ProductionAvailability(props: {
  search: BarbershopSetupSearch
  onSearchChange: (value: Partial<BarbershopSetupSearch>) => void
  createRequest?: boolean
  onCreateHandled?: () => void
}) {
  const { activeTenant } = useWorkspaceContext()
  return <AvailabilityCalendar key={activeTenant?.id} {...props} />
}
function AvailabilityCalendar({
  search,
  onSearchChange,
  createRequest,
  onCreateHandled,
}: {
  search: BarbershopSetupSearch
  onSearchChange: (value: Partial<BarbershopSetupSearch>) => void
  createRequest?: boolean
  onCreateHandled?: () => void
}) {
  const { activeTenant } = useWorkspaceContext()
  const [command] = useState(createSchedulingCommandClient)
  const cache = useQueryClient(),
    access = useAccessSummary()
  const canManage =
    access.data?.capabilities.some(
      (item) => item.capability === "availability.manage" && item.allowed,
    ) ?? false
  const unitId = search.unitId ?? "",
    professionalId = search.professionalId ?? ""
  const setUnitId = (unitId: string) =>
    onSearchChange({ unitId: unitId || undefined, professionalId: undefined })
  const setProfessionalId = (professionalId: string) =>
    onSearchChange({ professionalId: professionalId || undefined })
  const [error, setError] = useState<string | null>(null)
  const [focusedTime, setFocusedTime] = useState<string>()
  const [draft, setDraft] = useState<{
    date: string
    start?: string
    end?: string
    series?: Series
  } | null>(null)
  const bounds = visibleAvailabilityRange(search.availabilityView, search.availabilityDate)
  const units = useQuery({
    queryKey: ["scheduling", activeTenant?.id, "units"],
    queryFn: ({ signal }) =>
      schedulingRequest<{ id: string; name: string; timezone: string | null; version: number }[]>(
        "/api/scheduling/units",
        { signal },
      ),
  })
  const selectedUnit =
    units.data?.find((item) => item.id === unitId) ??
    (units.data?.length === 1 ? units.data[0] : undefined)
  const actualUnit = selectedUnit?.id ?? ""
  const people = useQuery({
    queryKey: ["availability", activeTenant?.id, "professionals", actualUnit],
    queryFn: ({ signal }) =>
      schedulingRequest<{ id: string; name: string; unitIds: string[] }[]>(
        "/api/professionals/options",
        { signal },
      ),
    enabled: Boolean(actualUnit),
  })
  const professionals = people.data?.filter((item) => item.unitIds.includes(actualUnit)) ?? []
  const projection = useQuery({
    queryKey: ["availability", activeTenant?.id, actualUnit, professionalId, bounds],
    queryFn: ({ signal }) =>
      schedulingRequest<Projection>(
        `/api/availability?${new URLSearchParams({ unitId: actualUnit, ...(professionalId ? { professionalId } : {}), startDate: bounds.start, endDate: bounds.end, includeArchived: "true" })}`,
        { signal },
      ),
    enabled: Boolean(actualUnit && selectedUnit?.timezone),
  })
  useEffect(() => {
    if (createRequest) {
      if (actualUnit && professionals.length > 0 && selectedUnit?.timezone)
        setDraft({ date: search.availabilityDate })
      else
        toast.error(
          "Selecione uma unidade, confirme o horário local e vincule um profissional antes de adicionar um bloco.",
        )
      onCreateHandled?.()
    }
  }, [
    createRequest,
    onCreateHandled,
    search.availabilityDate,
    actualUnit,
    professionals.length,
    selectedUnit?.timezone,
  ])
  const selectedDay = draft?.date ?? search.availabilityDate
  return (
    <section
      aria-label="Calendário de disponibilidade"
      className="flex h-full min-h-0 flex-col gap-2"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <SingleSelectListFilter
          showSelectedLabel
          icon={MapPinIcon}
          id="availability-unit"
          label="Unidade"
          value={actualUnit}
          inactiveValue=""
          options={units.data?.map((item) => ({ value: item.id, label: item.name })) ?? []}
          onValueChange={(value) => {
            setUnitId(value)
            setDraft(null)
          }}
        />
        <SingleSelectListFilter
          showSelectedLabel
          icon={UserRoundIcon}
          id="availability-professional"
          label={professionalId ? "Profissional" : "Todos os profissionais"}
          value={professionalId}
          inactiveValue=""
          options={professionals.map((item) => ({ value: item.id, label: item.name }))}
          onValueChange={(value) => {
            setProfessionalId(value)
            setDraft(null)
          }}
        />
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label="Período anterior"
            onClick={() =>
              onSearchChange({
                availabilityDate: navigateAvailabilityDate(
                  search.availabilityView,
                  search.availabilityDate,
                  -1,
                ),
              })
            }
          >
            <ChevronLeftIcon />
          </Button>
          <div className="w-40 shrink-0 [&>button]:h-10">
            <DatePicker
              id="availability-date"
              placeholder="Selecione a data"
              value={search.availabilityDate}
              onValueChange={(value) => value && onSearchChange({ availabilityDate: value })}
              aria-label="Data da disponibilidade"
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            aria-label="Próximo período"
            onClick={() =>
              onSearchChange({
                availabilityDate: navigateAvailabilityDate(
                  search.availabilityView,
                  search.availabilityDate,
                  1,
                ),
              })
            }
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <ToggleGroup
          value={[search.availabilityView]}
          onValueChange={(values) => {
            const view = values[0] as BarbershopSetupSearch["availabilityView"]
            if (view) onSearchChange({ availabilityView: view })
          }}
          aria-label="Período da disponibilidade"
        >
          {(
            [
              ["day", "Dia"],
              ["week", "Semana"],
              ["month", "Mês"],
            ] as const
          ).map(([value, label]) => (
            <ToggleGroupItem key={value} value={value}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {units.isPending ? (
        <div role="status" aria-label="Carregando unidades">
          <Skeleton className="h-40" />
        </div>
      ) : units.isError || people.isError ? (
        <div role="alert">
          <p>Não foi possível carregar a configuração.</p>
          <Button
            variant="outline"
            onClick={() => {
              void units.refetch()
              void people.refetch()
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : !selectedUnit ? (
        <p role="status">Selecione uma unidade ativa. Se necessário, cadastre uma em Unidades.</p>
      ) : !selectedUnit.timezone ? (
        <UnitTimezoneOnboarding
          key={actualUnit}
          unitName={selectedUnit.name}
          canManage={canManage}
          onConfirm={async (timezone) => {
            await command(
              `/api/availability/units/${encodeURIComponent(actualUnit)}/timezone`,
              { timezone, version: selectedUnit.version },
              "PUT",
            )
            await cache.invalidateQueries({ queryKey: ["scheduling"] })
            toast.success("Horário local confirmado. Agora, defina a disponibilidade.")
          }}
        />
      ) : professionals.length === 0 ? (
        <p role="status">
          {professionals.length
            ? "Selecione um profissional para consultar a disponibilidade."
            : "Vincule um profissional ativo a esta unidade na seção Profissionais."}
        </p>
      ) : projection.isPending ? (
        <div role="status" aria-label="Carregando disponibilidade">
          <Skeleton className="h-96" />
        </div>
      ) : projection.isError ? (
        <div role="alert">
          <p>{projection.error.message}</p>
          <Button variant="outline" onClick={() => void projection.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          {canManage && projection.data?.archived.length ? (
            <section aria-label="Blocos arquivados" className="flex flex-wrap gap-2">
              {projection.data.archived.map((series) => (
                <Button
                  key={series.id}
                  variant="outline"
                  onClick={() => setDraft({ date: series.effectiveFrom, series })}
                >
                  Restaurar {labels[series.kind].toLowerCase()} · {series.start}–{series.end}
                </Button>
              ))}
            </section>
          ) : null}
          {canManage
            ? projection.data?.series.flatMap((series) =>
                series.excludedDates
                  .filter((date) => date >= bounds.start && date <= bounds.end)
                  .map((date) => (
                    <Button
                      key={`${series.id}:${date}`}
                      variant="outline"
                      onClick={async () => {
                        try {
                          await command(
                            `/api/availability/series/${encodeURIComponent(series.id)}`,
                            { version: series.version, scope: "occurrence", date, restore: true },
                            "PATCH",
                          )
                          await invalidateSchedulingConsumers(cache)
                        } catch (failure) {
                          setError(
                            failure instanceof Error
                              ? failure.message
                              : "Não foi possível restaurar.",
                          )
                        }
                      }}
                    >
                      Restaurar ocorrência de {date} · {series.start}–{series.end}
                    </Button>
                  )),
              )
            : null}
          {error ? <p role="alert">{error}</p> : null}
          {search.availabilityView !== "month" ? (
            <AvailabilityTimeGrid
              key={`${actualUnit}:${professionalId}:${bounds.start}`}
              initialStartTime={focusedTime}
              dates={datesInRange(bounds)}
              blocks={(projection.data?.occurrences ?? []).map((item) => ({
                ...item,
                professionalName:
                  professionals.find((person) => person.id === item.professionalId)?.name ??
                  "Profissional indisponível",
              }))}
              canManage={canManage}
              onCreate={(date, interval) => setDraft({ date, ...interval })}
              onEdit={(item) =>
                setDraft({
                  date: item.date,
                  series: projection.data?.series.find(
                    (series) =>
                      series.id ===
                      projection.data?.occurrences.find((occurrence) => occurrence.id === item.id)
                        ?.seriesId,
                  ),
                })
              }
            />
          ) : (
            <div className="max-w-full overflow-x-auto">
              <div className="grid min-w-[980px] grid-cols-7 gap-px rounded-lg border bg-border">
                {datesInRange(bounds).map((date) => (
                  <section
                    key={date}
                    className="flex min-h-36 min-w-0 flex-col gap-2 bg-background p-3"
                    aria-label={date}
                  >
                    <Button
                      variant="ghost"
                      className="h-auto min-h-10 justify-start whitespace-normal text-left"
                      disabled={!canManage}
                      onClick={() => setDraft({ date })}
                    >
                      <CalendarClockIcon />
                      {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        weekday: "short",
                      })}
                    </Button>
                    {projection.data?.occurrences
                      .filter((item) => item.date === date)
                      .map((item) => (
                        <Button
                          key={item.id}
                          variant="outline"
                          className="h-auto min-h-10 justify-start whitespace-normal text-left"
                          onClick={() =>
                            setDraft({
                              date,
                              series: projection.data?.series.find(
                                (series) => series.id === item.seriesId,
                              ),
                            })
                          }
                        >
                          {labels[item.kind]} · {item.start}–{item.end} ·{" "}
                          {professionals.find((person) => person.id === item.professionalId)
                            ?.name ?? "Profissional indisponível"}
                        </Button>
                      ))}
                  </section>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {draft && selectedUnit?.timezone ? (
        <AvailabilityEditor
          key={`${draft.series?.id ?? "new"}:${selectedDay}`}
          unitId={actualUnit}
          professionalId={professionalId}
          professionals={professionals}
          interval={draft.start && draft.end ? { start: draft.start, end: draft.end } : undefined}
          date={selectedDay}
          series={draft.series}
          canManage={canManage}
          onClose={() => setDraft(null)}
          onSaved={async (focus) => {
            await invalidateSchedulingConsumers(cache)
            setFocusedTime(focus.start)
            onSearchChange({ availabilityDate: focus.date })
            setDraft(null)
          }}
        />
      ) : null}
    </section>
  )
}
const formSchema = z
  .object({
    professionalId: z.string().min(1, "Selecione o profissional."),
    kind: z.enum(["available", "break", "blocked", "absence"]),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecione o início."),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecione o término."),
    repeat: z.enum(["once", "weekly"]),
    effectiveFrom: z.iso.date("Selecione a data inicial."),
    effectiveUntil: z.string(),
    weekdays: z.array(z.string()).min(1, "Selecione ao menos um dia."),
    scope: z.enum(["series", "occurrence"]),
  })
  .refine((value) => value.end > value.start, {
    path: ["end"],
    message: "O término deve ser posterior ao início.",
  })
function AvailabilityEditor({
  unitId,
  professionalId,
  professionals,
  interval,
  date,
  series: initialSeries,
  canManage,
  onClose,
  onSaved,
}: {
  unitId: string
  professionalId: string
  professionals: { id: string; name: string }[]
  interval?: { start: string; end: string }
  date: string
  series?: Series
  canManage: boolean
  onClose: () => void
  onSaved: (focus: { date: string; start: string }) => Promise<void>
}) {
  const [command] = useState(createSchedulingCommandClient)
  const [series, setSeries] = useState(initialSeries)
  const [failure, setFailure] = useState<FormSubmissionError | null>(null),
    [saving, setSaving] = useState(false),
    [archive, setArchive] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      professionalId: series?.professionalId ?? professionalId,
      kind: series?.kind ?? "available",
      start: series?.start ?? interval?.start ?? "",
      end: series?.end ?? interval?.end ?? "",
      repeat: series && series.effectiveFrom !== series.effectiveUntil ? "weekly" : "once",
      effectiveFrom: series?.effectiveFrom ?? date,
      effectiveUntil: series?.effectiveUntil ?? "",
      weekdays: series?.weekdays ?? [weekdayForDate(date)],
      scope: "occurrence",
    },
  })
  const [repeat, days] = useWatch({ control: form.control, name: ["repeat", "weekdays"] })
  async function save(values: z.infer<typeof formSchema>, archived = false) {
    setSaving(true)
    setFailure(null)
    const input = {
      unitId,
      professionalId: values.professionalId,
      kind: values.kind,
      start: values.start,
      end: values.end,
      effectiveFrom: values.repeat === "once" ? date : values.effectiveFrom,
      effectiveUntil: values.repeat === "once" ? date : values.effectiveUntil || null,
      weekdays: values.repeat === "once" ? [weekdayForDate(date)] : values.weekdays,
    }
    try {
      await command(
        series
          ? `/api/availability/series/${encodeURIComponent(series.id)}`
          : "/api/availability/series",
        series
          ? {
              input: archived ? undefined : input,
              version: series.version,
              scope: series.status === "archived" ? "series" : values.scope,
              date,
              archive: archived,
              restore: series.status === "archived",
            }
          : input,
        series ? "PATCH" : "POST",
      )
      toast.success(archived ? "Bloco arquivado." : "Disponibilidade salva.")
      const firstDate =
        datesInRange({
          start: input.effectiveFrom,
          end: addCalendarDays(input.effectiveFrom, 6),
        }).find((day) => input.weekdays.includes(weekdayForDate(day))) ?? input.effectiveFrom
      await onSaved({ date: series ? date : firstDate, start: input.start })
    } catch (error) {
      const failure =
        error instanceof FormSubmissionError
          ? error
          : new FormSubmissionError("source_error", "Não foi possível salvar. Tente novamente.")
      setFailure(failure)
      if (failure.field && failure.field in form.getValues())
        form.setError(
          failure.field as keyof z.infer<typeof formSchema>,
          { message: failure.message },
          { shouldFocus: true },
        )
    } finally {
      setSaving(false)
      setArchive(false)
    }
  }
  return (
    <>
      <ActionDrawer
        context="Disponibilidade"
        title={
          !canManage
            ? "Visualizar bloco"
            : series?.status === "archived"
              ? "Restaurar bloco"
              : series
                ? "Editar bloco"
                : "Novo bloco"
        }
        description={`Horários locais da unidade para ${date}.`}
        isOpen
        onOpenChange={(open) => !open && onClose()}
        primaryAction={
          canManage ? (
            <Button form="availability-form" type="submit" isLoading={saving}>
              {series?.status === "archived" ? "Restaurar bloco" : "Salvar bloco"}
            </Button>
          ) : undefined
        }
        secondaryActions={
          <>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {series?.status === "active" && canManage ? (
              <Button variant="destructive" onClick={() => setArchive(true)}>
                Arquivar bloco
              </Button>
            ) : null}
          </>
        }
      >
        <form
          id="availability-form"
          className="flex flex-col gap-5"
          noValidate
          onSubmit={form.handleSubmit((values) => save(values))}
        >
          <fieldset disabled={!canManage || saving} className="contents">
            <FormSection title="Horário">
              <RhfSelectField
                control={form.control}
                id="availability-professional-field"
                name="professionalId"
                label="Profissional"
                placeholder="Selecione o profissional"
                options={professionals.map((person) => ({ value: person.id, label: person.name }))}
                disabled={Boolean(series)}
                required
              />
              <RhfSelectField
                control={form.control}
                id="availability-kind"
                name="kind"
                label="Tipo de bloco"
                placeholder="Selecione um tipo"
                options={Object.entries(labels).map(([value, label]) => ({ value, label }))}
                required
              />
              <RhfSelectField
                control={form.control}
                id="availability-start"
                name="start"
                label="Início"
                placeholder="Selecione o início"
                options={timeOptions}
                required
              />
              <RhfSelectField
                control={form.control}
                id="availability-end"
                name="end"
                label="Término"
                placeholder="Selecione o término"
                options={timeOptions}
                required
              />
            </FormSection>
            <FormSection title="Repetição">
              <RhfSelectField
                control={form.control}
                id="availability-repeat"
                name="repeat"
                label="Repetição"
                placeholder="Selecione a repetição"
                options={[
                  { value: "once", label: "Sem repetição" },
                  { value: "weekly", label: "Semanal" },
                ]}
                required
              />
              {repeat === "weekly" ? (
                <>
                  <CompactRhfDateField
                    control={form.control}
                    id="availability-from"
                    name="effectiveFrom"
                    label="Início da repetição"
                    placeholder="Quando começa"
                    required
                  />
                  <CompactRhfDateField
                    control={form.control}
                    id="availability-until"
                    name="effectiveUntil"
                    label="Repetir até"
                    placeholder="Sem data final"
                  />
                  <Field>
                    <FieldLabel required>Dias da semana</FieldLabel>
                    <ToggleGroup
                      aria-label="Dias da semana"
                      multiple
                      value={days}
                      onValueChange={(value) =>
                        form.setValue("weekdays", value, { shouldValidate: true })
                      }
                    >
                      {weekdays.map((day) => (
                        <ToggleGroupItem key={day} value={day}>
                          {dayLabels[day]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    {form.formState.errors.weekdays ? (
                      <p role="alert">{form.formState.errors.weekdays.message}</p>
                    ) : null}
                  </Field>
                </>
              ) : null}
              {series ? (
                <RhfSelectField
                  control={form.control}
                  id="availability-scope"
                  name="scope"
                  label="Aplicar alteração em"
                  placeholder="Selecione o alcance"
                  options={[
                    { value: "occurrence", label: "Somente esta ocorrência" },
                    { value: "series", label: "Toda a série" },
                  ]}
                  required
                />
              ) : null}
            </FormSection>
          </fieldset>
          {failure ? (
            <div role="alert" className="text-sm text-destructive">
              <p>{failure.message}</p>
              {failure.code === "version_conflict" ? (
                <Button
                  variant="outline"
                  type="button"
                  onClick={async () => {
                    if (!series) return
                    try {
                      const latest = await schedulingRequest<Series>(
                        `/api/availability/series/${encodeURIComponent(series.id)}`,
                      )
                      setSeries(latest)
                      form.reset({
                        professionalId: latest.professionalId,
                        kind: latest.kind,
                        start: latest.start,
                        end: latest.end,
                        repeat: latest.effectiveFrom === latest.effectiveUntil ? "once" : "weekly",
                        effectiveFrom: latest.effectiveFrom,
                        effectiveUntil: latest.effectiveUntil ?? "",
                        weekdays: latest.weekdays,
                        scope: form.getValues("scope"),
                      })
                      setFailure(null)
                    } catch (error) {
                      setFailure(
                        error instanceof FormSubmissionError
                          ? error
                          : new FormSubmissionError(
                              "network_error",
                              "Não foi possível recarregar. Tente novamente.",
                            ),
                      )
                    }
                  }}
                >
                  Recarregar versão atual
                </Button>
              ) : null}
            </div>
          ) : null}
        </form>
      </ActionDrawer>
      <ConfirmationDialog
        isOpen={archive}
        title="Arquivar disponibilidade?"
        description="O bloco deixará de oferecer horários. A alteração será recusada se afetar agendamentos existentes."
        confirmLabel="Arquivar bloco"
        cancelLabel="Manter bloco"
        isLoading={saving}
        onCancel={() => setArchive(false)}
        onConfirm={() => void save(form.getValues(), true)}
      />
    </>
  )
}
