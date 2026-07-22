import {
  CalendarClockIcon,
  CircleAlertIcon,
  MousePointerClickIcon,
  PlusIcon,
  Repeat2Icon,
  Trash2Icon,
} from "lucide-react"
import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/modules/shared/components/feedback/empty-state"
import { DatePicker } from "@/modules/shared/components/forms/date-picker"
import { ActionDrawer } from "@/modules/shared/components/overlays/action-drawer"
import { ConfirmationDialog } from "@/modules/shared/components/overlays/confirmation-dialog"
import { Button } from "@/modules/shared/components/ui/button"
import { Label } from "@/modules/shared/components/ui/label"
import { ScrollArea } from "@/modules/shared/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/components/ui/select"
import { Skeleton } from "@/modules/shared/components/ui/skeleton"
import { Switch } from "@/modules/shared/components/ui/switch"
import { cn } from "@/modules/shared/lib/utils"

import type {
  AvailabilityBlockType,
  AvailabilityTimeBlock,
  SetupAvailability,
  SetupScenarioId,
  Weekday,
} from "./contracts"
import { SetupOperationInvalidatedError, SetupValidationError } from "./contracts"
import { useSetupAvailability, useUpdateSetupAvailabilityBatch } from "./queries"

const weekdays: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

const weekdayLabels: Record<Weekday, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
}

const weekdayShortLabels: Record<Weekday, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sáb",
  sunday: "Dom",
}

const blockTypeLabels: Record<AvailabilityBlockType, string> = {
  available: "Disponível",
  break: "Pausa ou bloqueio",
  absence: "Ausência",
}

const blockCollection: Record<AvailabilityBlockType, "periods" | "breaks" | "absences"> = {
  available: "periods",
  break: "breaks",
  absence: "absences",
}

const calendarStartMinutes = 6 * 60
const calendarEndMinutes = 22 * 60
const calendarDurationMinutes = calendarEndMinutes - calendarStartMinutes
const slotMinutes = 30
const calendarHeight = 16 * 56

type CalendarBlock = AvailabilityTimeBlock & {
  day: Weekday
  recordId: string
  type: AvailabilityBlockType
}

type BlockEditorDraft = {
  day: Weekday
  days: Weekday[]
  end: string
  original?: CalendarBlock
  recurrenceUntil: string
  repeat: boolean
  scope: "single" | "series"
  start: string
  type: AvailabilityBlockType
}

type DragSelection = { day: Weekday; endMinutes: number; startMinutes: number }

export function AvailabilityCalendar({ scenarioId }: { scenarioId: SetupScenarioId }) {
  const [professionalId, setProfessionalId] = useState<string>()
  const [unitId, setUnitId] = useState<string>()
  const [editor, setEditor] = useState<BlockEditorDraft | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorError, setEditorError] = useState<string>()
  const [deleteTarget, setDeleteTarget] = useState<BlockEditorDraft | null>(null)
  const [selection, setSelection] = useState<DragSelection | null>(null)
  const dragRef = useRef<DragSelection | null>(null)

  const relationships = useSetupAvailability({ scenarioId })
  const resolvedProfessional =
    relationships.data?.professionals.find(({ id }) => id === professionalId) ??
    relationships.data?.professionals[0]
  const resolvedUnitId =
    unitId && resolvedProfessional?.unitIds.includes(unitId)
      ? unitId
      : (resolvedProfessional?.unitIds[0] ?? relationships.data?.units[0]?.id)
  const availability = useSetupAvailability({
    scenarioId,
    professionalId: resolvedProfessional?.id,
    unitId: resolvedUnitId,
  })
  const updateBatch = useUpdateSetupAvailabilityBatch()
  if (relationships.isPending || availability.isPending) return <AvailabilityLoading />
  if (relationships.isError || availability.isError)
    return (
      <AvailabilityError
        onRetry={() => {
          relationships.refetch()
          availability.refetch()
        }}
      />
    )
  if (relationships.data.professionals.length === 0 || relationships.data.units.length === 0)
    return (
      <EmptyState
        icon={CalendarClockIcon}
        title="Disponibilidade ainda não configurável"
        description="Adicione uma unidade e um profissional antes de definir horários."
      />
    )
  if (!resolvedProfessional || resolvedProfessional.unitIds.length === 0)
    return (
      <EmptyState
        icon={CalendarClockIcon}
        title="Profissional sem unidade vinculada"
        description="Vincule o profissional a uma unidade antes de definir a disponibilidade."
      />
    )

  const selectedProfessional = resolvedProfessional
  const selectedUnitId = resolvedUnitId ?? selectedProfessional.unitIds[0]
  const records = completeAvailabilityWeek(
    availability.data.records,
    selectedProfessional.id,
    selectedUnitId,
  )
  const blocks = calendarBlocks(records)

  function openEditor(nextEditor: BlockEditorDraft) {
    setEditorError(undefined)
    setEditor(nextEditor)
    requestAnimationFrame(() => setIsEditorOpen(true))
  }

  function closeEditor() {
    setIsEditorOpen(false)
    setEditorError(undefined)
  }

  function handleEditorClosed(open: boolean) {
    if (!open) setEditor(null)
  }

  function startCreate(day: Weekday, start = "09:00", end = "10:00") {
    openEditor({
      day,
      days: [day],
      end,
      recurrenceUntil: "",
      repeat: false,
      scope: "single",
      start,
      type: "available",
    })
  }

  function startEdit(block: CalendarBlock) {
    const seriesDays = weekdays.filter((day) =>
      blocks.some((candidate) => candidate.seriesId === block.seriesId && candidate.day === day),
    )
    openEditor({
      day: block.day,
      days: seriesDays.length > 0 ? seriesDays : [block.day],
      end: block.end,
      original: block,
      recurrenceUntil: block.recurrenceUntil ?? "",
      repeat: seriesDays.length > 1 || Boolean(block.recurrenceUntil),
      scope: "single",
      start: block.start,
      type: block.type,
    })
  }

  async function saveEditor() {
    if (!editor) return
    if (editor.start >= editor.end) {
      setEditorError("O término deve ser posterior ao início.")
      return
    }
    const targetDays = editor.repeat ? editor.days : [editor.day]
    if (targetDays.length === 0) {
      setEditorError("Selecione pelo menos um dia para a recorrência.")
      return
    }

    const seriesId =
      editor.original && editor.scope === "series"
        ? editor.original.seriesId
        : createAvailabilityId("series")
    const nextRecords = records.map((record) => {
      let next = record
      if (editor.original) {
        next =
          editor.scope === "series"
            ? removeSeries(next, editor.original.seriesId)
            : removeBlock(next, editor.original)
      }
      const shouldAdd =
        editor.original && editor.scope === "single"
          ? record.day === editor.day
          : targetDays.includes(record.day)
      if (!shouldAdd) return next
      return addBlock(next, editor.type, {
        id: createAvailabilityId(`block-${record.day}`),
        seriesId,
        start: editor.start,
        end: editor.end,
        recurrenceUntil:
          editor.repeat && editor.recurrenceUntil ? editor.recurrenceUntil : undefined,
      })
    })

    try {
      await updateBatch.mutateAsync({ records: changedRecords(records, nextRecords) })
      toast.success(editor.original ? "Bloco atualizado." : "Bloco adicionado.")
      closeEditor()
    } catch (error) {
      setEditorError(availabilityErrorMessage(error))
    }
  }

  async function confirmDelete() {
    if (!deleteTarget?.original) return
    const original = deleteTarget.original
    const nextRecords = records.map((record) =>
      deleteTarget.scope === "series"
        ? removeSeries(record, original.seriesId)
        : removeBlock(record, original),
    )
    try {
      await updateBatch.mutateAsync({ records: changedRecords(records, nextRecords) })
      toast.success(deleteTarget.scope === "series" ? "Recorrência removida." : "Bloco removido.")
      setDeleteTarget(null)
      closeEditor()
    } catch (error) {
      setDeleteTarget(null)
      setEditorError(availabilityErrorMessage(error))
    }
  }

  function pointerMinute(event: ReactPointerEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    return clampToCalendar(
      Math.round((calendarStartMinutes + ratio * calendarDurationMinutes) / slotMinutes) *
        slotMinutes,
    )
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, day: Weekday) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const minute = pointerMinute(event)
    const next = { day, startMinutes: minute, endMinutes: minute + slotMinutes }
    dragRef.current = next
    setSelection(next)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const minute = pointerMinute(event)
    const next = { ...dragRef.current, endMinutes: minute }
    dragRef.current = next
    setSelection(next)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = dragRef.current
    if (!current) return
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    setSelection(null)
    const normalized = normalizeSelection(current)
    startCreate(
      current.day,
      fromMinutes(normalized.startMinutes),
      fromMinutes(normalized.endMinutes),
    )
  }

  const editorSeriesCount = editor?.original
    ? blocks.filter(({ seriesId }) => seriesId === editor.original?.seriesId).length
    : 0

  return (
    <section
      aria-labelledby="availability-title"
      className="flex h-full min-h-[36rem] flex-col gap-3"
    >
      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="availability-title" className="text-lg font-semibold">
            Disponibilidade semanal
          </h2>
          <p className="text-sm text-muted-foreground">
            Arraste sobre a grade ou use “Adicionar bloco” para informar o período com precisão.
          </p>
        </div>
        <Button type="button" onClick={() => startCreate("monday")}>
          <PlusIcon aria-hidden="true" />
          Adicionar bloco
        </Button>
      </div>

      <div className="grid shrink-0 gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="availability-professional">Profissional</Label>
          <Select
            value={selectedProfessional.id}
            onValueChange={(value) => {
              setProfessionalId(value ?? undefined)
              setUnitId(undefined)
            }}
          >
            <SelectTrigger id="availability-professional">
              <SelectValue>{selectedProfessional.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {relationships.data.professionals.map((professional) => (
                <SelectItem key={professional.id} value={professional.id}>
                  {professional.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="availability-unit">Unidade</Label>
          <Select value={selectedUnitId} onValueChange={(value) => setUnitId(value ?? undefined)}>
            <SelectTrigger id="availability-unit">
              <SelectValue>
                {relationships.data.units.find(({ id }) => id === selectedUnitId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {relationships.data.units
                .filter(({ id }) => selectedProfessional.unitIds.includes(id))
                .map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {availability.data.conflicts.length > 0 ? (
        <div
          role="alert"
          className="shrink-0 rounded-lg border border-feedback-destructive-border bg-feedback-destructive p-3 text-feedback-destructive-foreground"
        >
          <div className="flex items-center gap-2 font-medium">
            <CircleAlertIcon aria-hidden="true" className="size-5" />
            Conflitos encontrados
          </div>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {availability.data.conflicts.map((conflict) => (
              <li key={conflict}>{conflict}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" /> Disponível
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-warning" /> Pausa ou bloqueio
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-feedback-destructive-foreground" /> Ausência
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <MousePointerClickIcon aria-hidden="true" className="size-3.5" /> Clique ou arraste
          </span>
        </div>
        <ScrollArea className="min-h-0 flex-1" scrollbars="both" maskHeight={18}>
          <div className="grid min-w-[68rem] grid-cols-[4rem_repeat(7,minmax(8.5rem,1fr))]">
            <div className="sticky top-0 left-0 z-40 border-r border-b bg-card" />
            {weekdays.map((day) => (
              <div
                key={day}
                className="sticky top-0 z-30 border-r border-b bg-card px-2 py-2 text-center"
              >
                <span className="block text-sm font-medium">{weekdayShortLabels[day]}</span>
                <span className="text-xs text-muted-foreground">{weekdayLabels[day]}</span>
              </div>
            ))}
            <TimeRail />
            {weekdays.map((day) => (
              <div
                key={day}
                className="relative border-r"
                style={{ height: `${calendarHeight}px` }}
              >
                <button
                  type="button"
                  aria-label={`Adicionar período em ${weekdayLabels[day]}`}
                  className="absolute inset-0 cursor-crosshair bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(3.125%-1px),var(--border)_3.125%)] focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={(event) => {
                    if (event.detail === 0) startCreate(day)
                  }}
                  onPointerCancel={() => {
                    dragRef.current = null
                    setSelection(null)
                  }}
                  onPointerDown={(event) => handlePointerDown(event, day)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
                {selection?.day === day ? <SelectionPreview selection={selection} /> : null}
                {blocks
                  .filter((block) => block.day === day)
                  .map((block) => (
                    <CalendarBlockButton
                      key={block.id}
                      block={block}
                      onClick={() => startEdit(block)}
                    />
                  ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {editor ? (
        <ActionDrawer
          isOpen={isEditorOpen}
          size="form"
          context="Disponibilidade"
          title={editor.original ? "Editar bloco" : "Novo bloco"}
          description="Defina o período, o tipo e como ele se repete."
          onOpenChange={(open) => !open && closeEditor()}
          onOpenChangeComplete={handleEditorClosed}
          secondaryActions={
            <>
              {editor.original ? (
                <Button type="button" variant="outline" onClick={() => setDeleteTarget(editor)}>
                  <Trash2Icon aria-hidden="true" />
                  Excluir
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={closeEditor}>
                Cancelar
              </Button>
            </>
          }
          primaryAction={
            <Button type="button" isLoading={updateBatch.isPending} onClick={saveEditor}>
              Salvar bloco
            </Button>
          }
        >
          <div className="grid gap-5">
            <div className="grid gap-1">
              <Label htmlFor="availability-block-type">Tipo de bloco</Label>
              <Select
                value={editor.type}
                onValueChange={(value) =>
                  setEditor((current) =>
                    current ? { ...current, type: value as AvailabilityBlockType } : current,
                  )
                }
              >
                <SelectTrigger id="availability-block-type">
                  <SelectValue>{blockTypeLabels[editor.type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível para agendamento</SelectItem>
                  <SelectItem value="break">Pausa ou bloqueio</SelectItem>
                  <SelectItem value="absence">Ausência</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Agendamentos ocupados são controlados pela Agenda, não por esta configuração.
              </p>
            </div>

            <TimeRangeEditor editor={editor} onChange={setEditor} hasError={Boolean(editorError)} />

            {editor.original && editorSeriesCount > 1 ? (
              <fieldset className="grid gap-2 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">Aplicar alteração em</legend>
                <ScopeOption
                  checked={editor.scope === "single"}
                  label={`Somente ${weekdayLabels[editor.day].toLocaleLowerCase("pt-BR")}`}
                  onChange={() => setEditor({ ...editor, scope: "single" })}
                />
                <ScopeOption
                  checked={editor.scope === "series"}
                  label="Toda a recorrência"
                  onChange={() => setEditor({ ...editor, scope: "series" })}
                />
              </fieldset>
            ) : null}

            <div className="grid gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="availability-repeat" className="font-medium">
                    Repetir semanalmente
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use uma data final para limitar a um mês, ano ou período específico.
                  </p>
                </div>
                <Switch
                  id="availability-repeat"
                  checked={editor.repeat}
                  disabled={Boolean(
                    editor.original && editorSeriesCount > 1 && editor.scope === "single",
                  )}
                  onCheckedChange={(repeat) => setEditor({ ...editor, repeat })}
                />
              </div>
              {editor.repeat ? (
                <>
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">Repetir nos dias</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {weekdays.map((day) => (
                        <label
                          key={day}
                          className="cursor-pointer rounded-md border px-2.5 py-1.5 text-xs transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
                        >
                          <input
                            className="sr-only"
                            type="checkbox"
                            checked={editor.days.includes(day)}
                            disabled={Boolean(
                              editor.original && editorSeriesCount > 1 && editor.scope === "single",
                            )}
                            onChange={(event) =>
                              setEditor({
                                ...editor,
                                days: event.currentTarget.checked
                                  ? [...editor.days, day]
                                  : editor.days.filter((selectedDay) => selectedDay !== day),
                              })
                            }
                          />
                          {weekdayShortLabels[day]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid gap-1">
                    <Label htmlFor="availability-repeat-until">Repetir até (opcional)</Label>
                    <DatePicker
                      id="availability-repeat-until"
                      placeholder="Sem data final"
                      value={editor.recurrenceUntil}
                      onValueChange={(recurrenceUntil) => setEditor({ ...editor, recurrenceUntil })}
                    />
                    {editor.recurrenceUntil ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="justify-self-start"
                        onClick={() => setEditor({ ...editor, recurrenceUntil: "" })}
                      >
                        Remover data final
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>

            {editorError ? (
              <p role="alert" className="text-sm text-feedback-destructive-foreground">
                {editorError}
              </p>
            ) : null}
          </div>
        </ActionDrawer>
      ) : null}

      <ConfirmationDialog
        isOpen={deleteTarget !== null}
        title={
          deleteTarget?.scope === "series" ? "Excluir toda a recorrência?" : "Excluir este bloco?"
        }
        description={
          deleteTarget?.original?.type === "available"
            ? deleteTarget.scope === "series"
              ? "Os períodos disponíveis ligados a esta recorrência serão removidos. Se um dia ficar sem disponibilidade, pausas e ausências desse dia também serão removidas. Agendamentos existentes não serão afetados."
              : "Somente o período disponível deste dia será removido. Se o dia ficar sem disponibilidade, suas pausas e ausências também serão removidas. Os demais dias continuarão iguais."
            : deleteTarget?.scope === "series"
              ? "Todos os dias ligados a esta recorrência serão removidos. Esta ação não afeta agendamentos existentes."
              : "Somente o bloco do dia selecionado será removido. Os demais dias da recorrência continuarão iguais."
        }
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

function TimeRangeEditor({
  editor,
  hasError,
  onChange,
}: {
  editor: BlockEditorDraft
  hasError: boolean
  onChange: (editor: BlockEditorDraft) => void
}) {
  return (
    <div className="grid gap-1">
      <Label htmlFor="availability-block-start">Período</Label>
      <fieldset className="grid grid-cols-[1fr_auto_1fr] items-center overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
        <legend className="sr-only">Período do bloco</legend>
        <label className="grid gap-0.5 px-3 py-1.5" htmlFor="availability-block-start">
          <span className="text-xs text-muted-foreground">Início</span>
          <input
            id="availability-block-start"
            type="time"
            step={900}
            value={editor.start}
            aria-invalid={hasError}
            className="min-w-0 bg-transparent text-sm outline-none"
            onChange={(event) => onChange({ ...editor, start: event.currentTarget.value })}
          />
        </label>
        <span aria-hidden="true" className="text-muted-foreground">
          —
        </span>
        <label className="grid gap-0.5 px-3 py-1.5" htmlFor="availability-block-end">
          <span className="text-xs text-muted-foreground">Fim</span>
          <input
            id="availability-block-end"
            type="time"
            step={900}
            value={editor.end}
            aria-invalid={hasError}
            className="min-w-0 bg-transparent text-sm outline-none"
            onChange={(event) => onChange({ ...editor, end: event.currentTarget.value })}
          />
        </label>
      </fieldset>
    </div>
  )
}

function ScopeOption({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary/5">
      <input type="radio" checked={checked} name="availability-edit-scope" onChange={onChange} />
      {label}
    </label>
  )
}

function TimeRail() {
  const labels = Array.from({ length: 17 }, (_, index) => calendarStartMinutes + index * 60)
  return (
    <div
      className="sticky left-0 z-20 border-r bg-card"
      style={{ height: `${calendarHeight}px` }}
      aria-hidden="true"
    >
      {labels.map((minute) => (
        <span
          key={minute}
          className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground"
          style={{ top: `${((minute - calendarStartMinutes) / calendarDurationMinutes) * 100}%` }}
        >
          {fromMinutes(minute)}
        </span>
      ))}
    </div>
  )
}

function SelectionPreview({ selection }: { selection: DragSelection }) {
  const normalized = normalizeSelection(selection)
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-1 left-1 z-10 rounded-md border-2 border-dashed border-primary bg-primary/15"
      style={blockPosition(normalized.startMinutes, normalized.endMinutes)}
    />
  )
}

function CalendarBlockButton({ block, onClick }: { block: CalendarBlock; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${blockTypeLabels[block.type]}, ${weekdayLabels[block.day]}, das ${block.start} às ${block.end}`}
      className={cn(
        "absolute right-1 left-1 z-10 overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-[filter,transform] hover:brightness-95 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        block.type === "available" && "border-primary/40 bg-primary text-primary-foreground",
        block.type === "break" &&
          "right-2 left-2 z-20 border-warning bg-warning text-warning-foreground",
        block.type === "absence" &&
          "right-3 left-3 z-30 border-feedback-destructive-border bg-feedback-destructive text-feedback-destructive-foreground",
      )}
      style={blockPosition(toMinutes(block.start), toMinutes(block.end))}
      onClick={onClick}
    >
      <span className="block truncate font-medium">{blockTypeLabels[block.type]}</span>
      <span className="block truncate tabular-nums">
        {block.start}–{block.end}
      </span>
      {block.recurrenceUntil ? (
        <Repeat2Icon aria-label="Recorrência com data final" className="mt-1 size-3" />
      ) : null}
    </button>
  )
}

function calendarBlocks(records: readonly SetupAvailability[]) {
  return records.flatMap((record) => [
    ...record.periods.map((block) => calendarBlock(record, block, "available")),
    ...record.breaks.map((block) => calendarBlock(record, block, "break")),
    ...record.absences.map((block) => calendarBlock(record, block, "absence")),
  ])
}

function calendarBlock(
  record: SetupAvailability,
  block: AvailabilityTimeBlock,
  type: AvailabilityBlockType,
): CalendarBlock {
  return { ...block, day: record.day, recordId: record.id, type }
}

function addBlock(
  record: SetupAvailability,
  type: AvailabilityBlockType,
  block: AvailabilityTimeBlock,
): SetupAvailability {
  const key = blockCollection[type]
  return {
    ...record,
    closed: type === "available" ? false : record.closed,
    [key]: [...record[key], block],
  }
}

function removeBlock(record: SetupAvailability, block: CalendarBlock): SetupAvailability {
  if (record.id !== block.recordId) return record
  const key = blockCollection[block.type]
  return normalizeClosedDay({
    ...record,
    [key]: record[key].filter(({ id }) => id !== block.id),
  })
}

function removeSeries(record: SetupAvailability, seriesId: string): SetupAvailability {
  return normalizeClosedDay({
    ...record,
    periods: record.periods.filter((block) => block.seriesId !== seriesId),
    breaks: record.breaks.filter((block) => block.seriesId !== seriesId),
    absences: record.absences.filter((block) => block.seriesId !== seriesId),
  })
}

function normalizeClosedDay(record: SetupAvailability): SetupAvailability {
  return record.periods.length > 0
    ? { ...record, closed: false }
    : { ...record, absences: [], breaks: [], closed: true }
}

function completeAvailabilityWeek(
  records: readonly SetupAvailability[],
  professionalId: string,
  unitId: string,
) {
  return weekdays.map(
    (day): SetupAvailability =>
      records.find((record) => record.day === day) ?? {
        absences: [],
        breaks: [],
        closed: true,
        day,
        id: `availability-draft-${professionalId}-${unitId}-${day}`,
        kind: "availability",
        periods: [],
        professionalId,
        unitId,
      },
  )
}

function changedRecords(current: readonly SetupAvailability[], next: readonly SetupAvailability[]) {
  return next.filter((record, index) => JSON.stringify(record) !== JSON.stringify(current[index]))
}

function normalizeSelection(selection: DragSelection) {
  const startMinutes = Math.min(
    calendarEndMinutes - slotMinutes,
    Math.min(selection.startMinutes, selection.endMinutes),
  )
  let endMinutes = Math.max(selection.startMinutes, selection.endMinutes)
  if (endMinutes === startMinutes) endMinutes += slotMinutes
  return {
    startMinutes: clampToCalendar(startMinutes),
    endMinutes: clampToCalendar(Math.max(startMinutes + slotMinutes, endMinutes)),
  }
}

function blockPosition(startMinutes: number, endMinutes: number) {
  const start = Math.max(calendarStartMinutes, startMinutes)
  const end = Math.min(calendarEndMinutes, endMinutes)
  return {
    top: `${((start - calendarStartMinutes) / calendarDurationMinutes) * 100}%`,
    height: `${Math.max(1.5, ((end - start) / calendarDurationMinutes) * 100)}%`,
  }
}

function clampToCalendar(minutes: number) {
  return Math.min(calendarEndMinutes, Math.max(calendarStartMinutes, minutes))
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

function fromMinutes(value: number) {
  const normalized = Math.min(24 * 60 - 1, Math.max(0, value))
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`
}

function createAvailabilityId(prefix: string) {
  return `${prefix}-${globalThis.crypto.randomUUID()}`
}

function availabilityErrorMessage(error: unknown) {
  return error instanceof SetupValidationError || error instanceof SetupOperationInvalidatedError
    ? error.message
    : "Não foi possível concluir a ação. Tente novamente."
}

function AvailabilityLoading() {
  return (
    <div role="status" aria-label="Carregando disponibilidade" className="grid h-full gap-3">
      <Skeleton className="h-24" />
      <Skeleton className="min-h-96" />
    </div>
  )
}

function AvailabilityError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="grid min-h-56 place-items-center rounded-lg border border-feedback-destructive-border bg-feedback-destructive p-6 text-center"
    >
      <div className="grid max-w-md gap-3">
        <CircleAlertIcon aria-hidden="true" className="mx-auto size-7" />
        <h2 className="font-semibold">Não foi possível carregar a disponibilidade</h2>
        <p className="text-sm">Tente novamente para recuperar a semana de trabalho.</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
