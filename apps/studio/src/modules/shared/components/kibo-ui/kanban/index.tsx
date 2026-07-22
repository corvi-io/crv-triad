"use client"

import type {
  Announcements,
  DndContextProps,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useState,
  useSyncExternalStore,
} from "react"
import { createPortal } from "react-dom"
import tunnel from "tunnel-rat"
import { Card } from "@/modules/shared/components/ui/card"
import { ScrollArea, ScrollBar } from "@/modules/shared/components/ui/scroll-area"
import { cn } from "@/modules/shared/lib/utils"

const t = tunnel()

export type { DragEndEvent } from "@dnd-kit/core"

type KanbanItemProps = {
  id: string
  name: string
  column: string
} & Record<string, unknown>

type KanbanColumnProps = {
  id: string
  name: string
} & Record<string, unknown>

type KanbanContextProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = {
  columns: C[]
  data: T[]
  activeCardId: string | null
}

const KanbanContext = createContext<KanbanContextProps>({
  columns: [],
  data: [],
  activeCardId: null,
})

export type KanbanBoardProps = HTMLAttributes<HTMLDivElement> & {
  id: string
  children: ReactNode
  className?: string
  isOverClassName?: string
}

export const KanbanBoard = ({
  id,
  children,
  className,
  isOverClassName = "ring-primary",
  ...props
}: KanbanBoardProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  })

  return (
    <div
      className={cn(
        "flex size-full min-h-40 flex-col overflow-hidden rounded-md border bg-secondary text-xs shadow-sm ring-2 ring-inset ring-transparent transition-all",
        isOver && isOverClassName,
        className,
      )}
      ref={setNodeRef}
      {...props}
    >
      {children}
    </div>
  )
}

export type KanbanCardProps<T extends KanbanItemProps = KanbanItemProps> = T &
  Omit<HTMLAttributes<HTMLDivElement>, "id"> & {
    children?: ReactNode
    className?: string
    dragHandle?: ReactNode
    dragHandleLabel?: string
    isDragDisabled?: boolean
  }

export const KanbanCard = <T extends KanbanItemProps = KanbanItemProps>({
  id,
  name,
  column: _column,
  children,
  className,
  dragHandle,
  dragHandleLabel,
  isDragDisabled = false,
  ...props
}: KanbanCardProps<T>) => {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transition,
    transform,
    isDragging,
  } = useSortable({ disabled: isDragDisabled, id })
  const { activeCardId } = useContext(KanbanContext) as KanbanContextProps
  const reduceMotion = useReducedMotion()

  const style = {
    transition: reduceMotion ? "none" : transition,
    transform: CSS.Transform.toString(transform),
  }
  const rootActivatorProps = dragHandle || isDragDisabled ? {} : { ...listeners, ...attributes }

  return (
    <>
      <div style={style} {...rootActivatorProps} {...props} ref={setNodeRef}>
        <Card
          className={cn(
            "gap-4 rounded-md p-3 shadow-sm",
            isDragDisabled ? "cursor-default" : "cursor-grab",
            isDragging && "pointer-events-none cursor-grabbing opacity-30",
            className,
          )}
        >
          {dragHandle ? (
            <button
              ref={setActivatorNodeRef}
              aria-label={dragHandleLabel ?? `Mover ${name}`}
              className={cn(
                "flex min-h-8 w-full items-center justify-center rounded-md text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isDragDisabled
                  ? "cursor-default"
                  : "cursor-grab hover:bg-muted active:cursor-grabbing",
              )}
              data-kanban-drag-handle
              disabled={isDragDisabled}
              type="button"
              {...(isDragDisabled ? {} : listeners)}
              {...(isDragDisabled ? {} : attributes)}
            >
              {dragHandle}
            </button>
          ) : null}
          {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
        </Card>
      </div>
      {activeCardId === id && (
        <t.In>
          <Card
            className={cn(
              "cursor-grab gap-4 rounded-md p-3 shadow-sm ring-2 ring-primary",
              isDragging && "cursor-grabbing",
              className,
            )}
          >
            {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
          </Card>
        </t.In>
      )}
    </>
  )
}

export type KanbanCardsProps<T extends KanbanItemProps = KanbanItemProps> = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "id"
> & {
  children: (item: T) => ReactNode
  id: string
}

export const KanbanCards = <T extends KanbanItemProps = KanbanItemProps>({
  children,
  className,
  ...props
}: KanbanCardsProps<T>) => {
  const { data } = useContext(KanbanContext) as KanbanContextProps<T>
  const filteredData = data.filter((item) => item.column === props.id)
  const items = filteredData.map((item) => item.id)

  return (
    <ScrollArea className="min-h-0 flex-1 overflow-hidden">
      <SortableContext items={items}>
        <div className={cn("flex min-h-full flex-grow flex-col gap-2 p-2", className)} {...props}>
          {filteredData.map(children)}
        </div>
      </SortableContext>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}

export type KanbanHeaderProps = HTMLAttributes<HTMLDivElement>

export const KanbanHeader = ({ className, ...props }: KanbanHeaderProps) => (
  <div className={cn("m-0 p-2 font-semibold text-sm", className)} {...props} />
)

export type KanbanProviderProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = Omit<DndContextProps, "children"> & {
  children: (column: C) => ReactNode
  className?: string
  columns: C[]
  data: T[]
  onDataChange?: (data: T[]) => void
  onDragCancel?: (event: DragCancelEvent) => void
  onDragStart?: (event: DragStartEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
  onDragOver?: (event: DragOverEvent) => void
}

export const KanbanProvider = <
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
>({
  children,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragCancel,
  className,
  columns,
  data,
  onDataChange,
  ...props
}: KanbanProviderProps<T, C>) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const card = data.find((item) => item.id === event.active.id)
    if (card) {
      setActiveCardId(event.active.id as string)
    }
    onDragStart?.(event)
  }

  const handleDragOver = (event: DragOverEvent) => {
    onDragOver?.(event)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null)

    const { active, over } = event

    if (!over || active.id === over.id) {
      onDragEnd?.(event)
      return
    }

    const activeItem = data.find((item) => item.id === active.id)
    const overItem = data.find((item) => item.id === over.id)
    const overColumn =
      overItem?.column || columns.find((column) => column.id === over.id)?.id || activeItem?.column

    if (!activeItem || !overColumn) {
      onDragEnd?.(event)
      return
    }

    let newData = [...data]
    const oldIndex = newData.findIndex((item) => item.id === active.id)
    const newIndex = newData.findIndex((item) => item.id === over.id)

    if (oldIndex < 0) {
      onDragEnd?.(event)
      return
    }

    const nextActiveItem = { ...activeItem, column: overColumn } as T
    newData[oldIndex] = nextActiveItem

    if (newIndex >= 0) {
      newData = arrayMove(newData, oldIndex, newIndex)
    } else if (activeItem.column !== overColumn) {
      newData = arrayMove(newData, oldIndex, newData.length - 1)
    }

    onDataChange?.(newData)
    onDragEnd?.(event)
  }

  const handleDragCancel = (event: DragCancelEvent) => {
    setActiveCardId(null)
    onDragCancel?.(event)
  }

  const columnNameFor = (overId: string | number | undefined) => {
    const columnId =
      columns.find((column) => column.id === overId)?.id ??
      data.find((item) => item.id === overId)?.column
    return columns.find((column) => column.id === columnId)?.name ?? "destino indisponível"
  }

  const announcements: Announcements = {
    onDragStart({ active }) {
      const { name, column } = data.find((item) => item.id === active.id) ?? {}

      return `Cartão "${name}" selecionado na coluna "${column}"`
    },
    onDragOver({ active, over }) {
      const { name } = data.find((item) => item.id === active.id) ?? {}
      const newColumn = columnNameFor(over?.id)

      return `Cartão "${name}" sobre a coluna "${newColumn}"`
    },
    onDragEnd({ active, over }) {
      const { name } = data.find((item) => item.id === active.id) ?? {}
      const newColumn = columnNameFor(over?.id)

      return `Cartão "${name}" solto na coluna "${newColumn}"`
    },
    onDragCancel({ active }) {
      const { name } = data.find((item) => item.id === active.id) ?? {}

      return `Movimentação do cartão "${name}" cancelada`
    },
  }

  return (
    <KanbanContext.Provider value={{ columns, data, activeCardId }}>
      <DndContext
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Para mover, pressione espaço. Use as setas para escolher a coluna, espaço para confirmar ou Escape para cancelar.",
          },
        }}
        collisionDetection={closestCenter}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
        {...props}
      >
        <div className={cn("flex size-full gap-4", className)}>
          {columns.map((column) => children(column))}
        </div>
        {typeof window !== "undefined" &&
          createPortal(
            <DragOverlay>
              <t.Out />
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </KanbanContext.Provider>
  )
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function useReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const query = window.matchMedia(REDUCED_MOTION_QUERY)
      query.addEventListener("change", onStoreChange)
      return () => query.removeEventListener("change", onStoreChange)
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )
}
