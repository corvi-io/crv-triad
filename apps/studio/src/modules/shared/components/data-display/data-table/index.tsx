import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import type { ComponentProps, ComponentPropsWithoutRef, ComponentType, ReactNode } from "react"
import { Button } from "@/modules/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/modules/shared/components/ui/pagination"
import { ScrollArea } from "@/modules/shared/components/ui/scroll-area"
import { cn } from "@/modules/shared/lib/utils"

export const DATA_TABLE_EMPTY_VALUE = "-"

export type DataTableSortDirection = "asc" | "desc" | null

export type DataTableSortState<TSortKey extends string = string> = {
  direction: DataTableSortDirection
  key: TSortKey | null
}

export type DataTableRowAction = {
  disabled?: boolean
  icon?: ComponentType<{ "aria-hidden"?: boolean | "false" | "true"; className?: string }>
  label: string
  onSelect: () => void
  variant?: "default" | "destructive"
}

type DataTableProps = {
  children: ReactNode
  className?: string
  footer?: ReactNode
  tableClassName?: string
  viewportClassName?: string
  "aria-label": string
}

export function DataTable({
  children,
  className,
  footer,
  tableClassName,
  viewportClassName,
  "aria-label": ariaLabel,
}: DataTableProps) {
  return (
    <div
      data-slot="data-table"
      className={cn(
        "relative isolate flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <ScrollArea
        className="min-h-0 flex-1"
        maskClassName="before:from-card after:from-card"
        scrollbars="both"
        scrollbarVisibility="overflow"
        viewportClassName={cn("min-h-0", viewportClassName)}
      >
        <table
          className={cn(
            "w-full min-w-[820px] border-separate border-spacing-0 text-sm",
            tableClassName,
          )}
          aria-label={ariaLabel}
        >
          {children}
        </table>
      </ScrollArea>
      {footer}
    </div>
  )
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-20 bg-card text-left text-xs text-muted-foreground shadow-[0_1px_0_0_var(--border)]">
      {children}
    </thead>
  )
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y">{children}</tbody>
}

export function DataTableRow({ children, className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-muted/30 data-[interactive=true]:cursor-default",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function DataTableHeaderCell({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"th"> & {
  children: ReactNode
}) {
  return (
    <th
      className={cn("border-b bg-card px-3 py-2.5 font-medium whitespace-nowrap", className)}
      {...props}
    >
      {children}
    </th>
  )
}

export function DataTableSortableHeaderCell<TSortKey extends string>({
  children,
  className,
  onSortChange,
  sortDirection,
  sortKey,
  sortedBy,
}: {
  children: ReactNode
  className?: string
  onSortChange: (state: DataTableSortState<TSortKey>) => void
  sortDirection: DataTableSortDirection
  sortKey: TSortKey
  sortedBy: TSortKey | null
}) {
  const isActive = sortedBy === sortKey
  const activeDirection = isActive ? sortDirection : null
  const SortIcon =
    activeDirection === "asc" ? ArrowUp : activeDirection === "desc" ? ArrowDown : ChevronsUpDown

  return (
    <DataTableHeaderCell
      aria-sort={
        activeDirection === "asc" ? "ascending" : activeDirection === "desc" ? "descending" : "none"
      }
      className={className}
    >
      <button
        type="button"
        className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-left font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => onSortChange(getNextSortState(sortKey, activeDirection))}
      >
        <span>{children}</span>
        <SortIcon
          aria-hidden="true"
          className={cn("size-3.5", !activeDirection && "text-muted-foreground/70")}
        />
      </button>
    </DataTableHeaderCell>
  )
}

type DataTableCellProps = ComponentPropsWithoutRef<"td"> & {
  children: ReactNode
  fallback?: ReactNode
}

export function DataTableCell({
  children,
  className,
  fallback = DATA_TABLE_EMPTY_VALUE,
  ...props
}: DataTableCellProps) {
  return (
    <td className={cn("px-3 py-3 align-middle", className)} {...props}>
      {isEmptyTableValue(children) ? (
        <DataTableEmptyValue>{fallback}</DataTableEmptyValue>
      ) : (
        children
      )}
    </td>
  )
}

export function DataTableEmptyValue({
  children = DATA_TABLE_EMPTY_VALUE,
}: {
  children?: ReactNode
}) {
  return <span className="text-muted-foreground">{children}</span>
}

export function DataTableRowActionsMenu({
  actions,
  anchor,
  className,
  isOpen,
  onOpenChange,
}: {
  actions: DataTableRowAction[]
  anchor?: ComponentProps<typeof DropdownMenuContent>["anchor"]
  className?: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}) {
  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuContent
        anchor={anchor}
        align="end"
        className={cn("w-48", className)}
        sideOffset={6}
      >
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <DropdownMenuItem
              key={action.label}
              className="cursor-pointer"
              disabled={action.disabled}
              variant={action.variant}
              onClick={action.onSelect}
            >
              {Icon ? <Icon aria-hidden="true" className="size-4 text-muted-foreground" /> : null}
              {action.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function createDataTablePointAnchor(
  x: number,
  y: number,
): ComponentProps<typeof DropdownMenuContent>["anchor"] {
  return {
    getBoundingClientRect: () => ({
      bottom: y,
      height: 0,
      left: x,
      right: x,
      top: y,
      width: 0,
      x,
      y,
      toJSON: () => undefined,
    }),
  }
}

export function DataTablePagination({
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  totalPages,
}: {
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  page: number
  pageSize: number
  pageSizeOptions?: number[]
  totalCount: number
  totalPages: number
}) {
  const pages = getVisiblePaginationItems(page, totalPages)
  const hasPrevious = page > 1
  const hasNext = page < totalPages

  return (
    <div
      data-slot="data-table-footer"
      className="flex shrink-0 flex-col gap-3 border-t bg-background/95 px-3 py-3 text-sm shadow-[0_-1px_0_0_var(--border)] md:flex-row md:items-center md:justify-between"
    >
      <div className="flex min-w-max shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <span className="whitespace-nowrap">Registros por página</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 min-w-16 justify-between rounded-md px-3 text-sm tabular-nums"
              >
                {pageSize}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-24">
            <DropdownMenuRadioGroup
              value={String(pageSize)}
              onValueChange={(value) => {
                const nextPageSize = Number(value)
                if (Number.isInteger(nextPageSize)) {
                  onPageSizeChange(nextPageSize)
                }
              }}
            >
              {pageSizeOptions.map((option) => (
                <DropdownMenuRadioItem key={option} value={String(option)} closeOnClick>
                  {option}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
          Página <span className="font-medium text-foreground tabular-nums">{page}</span> de{" "}
          <span className="font-medium text-foreground tabular-nums">{totalPages}</span>
        </span>
        <Pagination className="mx-0 w-auto min-w-max justify-start sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={!hasPrevious || isLoading}
                onClick={() => onPageChange(page - 1)}
              />
            </PaginationItem>
            {pages.map((item) =>
              typeof item === "number" ? (
                <PaginationItem key={item}>
                  <PaginationButton
                    aria-label={`Ir para página ${item}`}
                    disabled={isLoading || item === page}
                    isActive={item === page}
                    className="tabular-nums"
                    onClick={() => onPageChange(item)}
                  >
                    {item}
                  </PaginationButton>
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationEllipsis />
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                disabled={!hasNext || isLoading}
                onClick={() => onPageChange(page + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}

type PaginationItemValue = number | "ellipsis-start" | "ellipsis-end"

function getVisiblePaginationItems(page: number, totalPages: number): PaginationItemValue[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (page <= 3) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages]
  }

  if (page >= totalPages - 2) {
    return [
      1,
      "ellipsis-start",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [1, "ellipsis-start", page - 1, page, page + 1, "ellipsis-end", totalPages]
}

function getNextSortState<TSortKey extends string>(
  key: TSortKey,
  currentDirection: DataTableSortDirection,
): DataTableSortState<TSortKey> {
  if (currentDirection === null) {
    return { key, direction: "asc" }
  }

  if (currentDirection === "asc") {
    return { key, direction: "desc" }
  }

  return { key: null, direction: null }
}

function isEmptyTableValue(value: ReactNode) {
  return value === null || value === undefined || value === ""
}
