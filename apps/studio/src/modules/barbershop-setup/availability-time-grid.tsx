import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/modules/shared/lib/utils"

type Interval = { start: string; end: string }
export type AvailabilityGridBlock = Interval & {
  id: string
  date: string
  kind: string
  professionalName?: string
}
const dayEnd = 23 * 60 + 45
const pixelsPerMinute = 1.6
const height = 24 * 60 * pixelsPerMinute
const hours = Array.from({ length: 24 }, (_, hour) => hour)

export function edgeScrollDelta(pointerY: number, top: number, bottom: number) {
  const edge = 48
  if (pointerY > bottom - edge) return Math.min(18, Math.ceil((pointerY - bottom + edge) / 3))
  if (pointerY < top + edge) return -Math.min(18, Math.ceil((top + edge - pointerY) / 3))
  return 0
}
const labels: Record<string, string> = {
  available: "Disponível",
  break: "Intervalo",
  blocked: "Bloqueio",
  absence: "Ausência",
}
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
const time = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`

export function selectionInterval(anchor: number, current: number): Interval {
  const start = Math.max(0, Math.min(dayEnd - 15, Math.min(anchor, current)))
  const end = Math.min(dayEnd, Math.max(start + 15, anchor, current))
  return { start: time(start), end: time(end) }
}

function placeBlocks(blocks: AvailabilityGridBlock[]) {
  const lanes: number[] = []
  const placed = [...blocks]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((block) => {
      let lane = lanes.findIndex((end) => end <= minutes(block.start))
      if (lane < 0) lane = lanes.length
      lanes[lane] = minutes(block.end)
      return { block, lane }
    })
  return { placed, laneCount: lanes.length }
}

export function AvailabilityTimeGrid({
  dates,
  blocks,
  canManage,
  onCreate,
  onEdit,
  initialStartTime,
}: {
  dates: string[]
  blocks: AvailabilityGridBlock[]
  canManage: boolean
  onCreate: (date: string, interval?: Interval) => void
  onEdit: (block: AvailabilityGridBlock) => void
  initialStartTime?: string
}) {
  const firstVisibleStart =
    initialStartTime ??
    blocks.reduce<string | undefined>(
      (first, block) => (!first || block.start < first ? block.start : first),
      undefined,
    )
  const initialScroll = useCallback(
    (node: HTMLElement | null) => {
      if (node)
        node.scrollTop =
          (firstVisibleStart ? Math.max(0, minutes(firstVisibleStart) - 60) : 6 * 60) *
          pixelsPerMinute
    },
    [firstVisibleStart],
  )
  return (
    <section
      ref={initialScroll}
      className="min-h-48 flex-1 overflow-auto rounded-lg border"
      aria-label="Grade de horários"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Read-only users need keyboard scrolling.
      tabIndex={0}
      data-availability-scroll
    >
      <div
        className={cn("grid", dates.length > 1 && "min-w-[56rem]")}
        style={{
          gridTemplateColumns: `3.5rem ${dates.map((date) => `minmax(${dates.length === 1 ? 0 : Math.max(120, placeBlocks(blocks.filter((block) => block.date === date)).laneCount * 110)}px, 1fr)`).join(" ")}`,
        }}
      >
        <div className="sticky top-0 left-0 z-20 border-b bg-card" />
        {dates.map((date) => (
          <button
            key={date}
            type="button"
            disabled={!canManage}
            onClick={() => onCreate(date)}
            className="sticky top-0 z-10 border-b border-l bg-card px-2 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring"
          >
            {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            })}
          </button>
        ))}
        <div aria-hidden="true" className="sticky left-0 z-10 bg-card" style={{ height }}>
          {hours.map((hour) => (
            <span
              key={hour}
              className="absolute right-2 text-xs tabular-nums text-muted-foreground"
              style={{ top: hour * 60 * pixelsPerMinute }}
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        {dates.map((date) => (
          <DayColumn
            key={date}
            date={date}
            blocks={blocks.filter((block) => block.date === date)}
            canManage={canManage}
            onCreate={onCreate}
            onEdit={onEdit}
          />
        ))}
      </div>
    </section>
  )
}

function DayColumn({
  date,
  blocks,
  canManage,
  onCreate,
  onEdit,
}: {
  date: string
  blocks: AvailabilityGridBlock[]
  canManage: boolean
  onCreate: (date: string, interval?: Interval) => void
  onEdit: (block: AvailabilityGridBlock) => void
}) {
  const drag = useRef<{
    anchor: number
    current: number
    pointerY: number
    target: HTMLButtonElement
    viewport: HTMLElement
  } | null>(null)
  const frame = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )
  const suppressClick = useRef(false)
  const [preview, setPreview] = useState<Interval | null>(null)
  function minuteAt(event: { clientY: number; currentTarget: HTMLElement }) {
    return Math.max(
      0,
      Math.min(
        dayEnd,
        Math.round(
          (event.clientY - event.currentTarget.getBoundingClientRect().top) / pixelsPerMinute / 15,
        ) * 15,
      ),
    )
  }
  function cancel() {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    drag.current = null
    setPreview(null)
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return
    drag.current.pointerY = event.clientY
    drag.current.current = minuteAt(event)
    setPreview(selectionInterval(drag.current.anchor, drag.current.current))
  }
  function autoScroll() {
    const active = drag.current
    if (!active) return
    const bounds = active.viewport.getBoundingClientRect()
    const delta = edgeScrollDelta(active.pointerY, bounds.top + 44, bounds.bottom)
    const before = active.viewport.scrollTop
    active.viewport.scrollTop += delta
    if (before !== active.viewport.scrollTop) {
      active.current = minuteAt({ clientY: active.pointerY, currentTarget: active.target })
      setPreview(selectionInterval(active.anchor, active.current))
    }
    frame.current = requestAnimationFrame(autoScroll)
  }
  const { placed, laneCount } = placeBlocks(blocks)
  return (
    <section aria-label={date} className="relative border-l bg-background" style={{ height }}>
      {hours.map((hour) => (
        <div
          key={hour}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t"
          style={{ top: hour * 60 * pixelsPerMinute }}
        />
      ))}
      <button
        type="button"
        disabled={!canManage}
        aria-label={`Selecionar horário em ${date}`}
        className="absolute inset-0 cursor-crosshair touch-pan-y focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
        onPointerDown={(event) => {
          if (!canManage || event.button !== 0 || event.pointerType === "touch") return
          suppressClick.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          const anchor = minuteAt(event)
          const viewport = event.currentTarget.closest<HTMLElement>("[data-availability-scroll]")
          if (!viewport) return
          drag.current = {
            anchor,
            current: anchor,
            pointerY: event.clientY,
            target: event.currentTarget,
            viewport,
          }
          setPreview(selectionInterval(anchor, anchor))
          frame.current = requestAnimationFrame(autoScroll)
        }}
        onPointerMove={move}
        onPointerUp={(event) => {
          if (!drag.current) return
          const interval = selectionInterval(drag.current.anchor, minuteAt(event))
          cancel()
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
          onCreate(date, interval)
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            cancel()
            event.preventDefault()
          }
        }}
        onClick={(event) => {
          if (suppressClick.current && event.detail !== 0) {
            suppressClick.current = false
            return
          }
          if (event.detail === 0) onCreate(date)
          else {
            const start = minuteAt(event)
            onCreate(date, selectionInterval(start, start))
          }
        }}
      />
      {placed.map(({ block, lane }) => (
        <button
          key={block.id}
          type="button"
          aria-label={`${labels[block.kind]} · ${block.start}–${block.end}${block.professionalName ? ` · ${block.professionalName}` : ""}`}
          title={`${block.professionalName ?? ""} · ${labels[block.kind]} · ${block.start}–${block.end}`}
          onClick={() => onEdit(block)}
          className={cn(
            "absolute flex flex-col items-start justify-start overflow-hidden rounded-md border px-2 py-1 text-left text-xs focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-ring",
            block.kind === "available"
              ? "bg-primary text-primary-foreground"
              : block.kind === "absence"
                ? "bg-feedback-destructive text-feedback-destructive-foreground"
                : "bg-feedback-warning text-feedback-warning-foreground",
          )}
          style={{
            top: minutes(block.start) * pixelsPerMinute,
            height: Math.max(12, (minutes(block.end) - minutes(block.start)) * pixelsPerMinute),
            left: `calc(${(lane / laneCount) * 88}% + 3px)`,
            width: `calc(${88 / laneCount}% - 6px)`,
          }}
        >
          <span className="block w-full shrink-0 truncate font-medium">
            {block.professionalName}
          </span>
          <span className="block w-full shrink-0 truncate">{labels[block.kind]}</span>
          <span className="flex shrink-0 flex-wrap gap-x-1 tabular-nums">
            <span>{block.start}</span>
            <span>–{block.end}</span>
          </span>
        </button>
      ))}
      {preview ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1 z-20 rounded border-2 border-primary bg-primary/10 text-xs font-medium text-accent-foreground"
          style={{
            top: minutes(preview.start) * pixelsPerMinute,
            height: (minutes(preview.end) - minutes(preview.start)) * pixelsPerMinute,
          }}
        >
          <span className="rounded-sm bg-accent px-1">
            {preview.start}–{preview.end}
          </span>
        </div>
      ) : null}
    </section>
  )
}
