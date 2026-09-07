import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import type { ComponentPropsWithoutRef } from "react"

import { buttonVariants } from "@/modules/shared/components/ui/button"
import { cn } from "@/modules/shared/lib/utils"

function Pagination({ className, ...props }: ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      aria-label="paginação"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: ComponentPropsWithoutRef<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationButtonProps = ComponentPropsWithoutRef<"button"> & {
  isActive?: boolean
}

function PaginationButton({
  className,
  isActive,
  type = "button",
  ...props
}: PaginationButtonProps) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      data-active={isActive ? true : undefined}
      data-slot="pagination-button"
      type={type}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size: "icon-sm",
        }),
        "cursor-pointer data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:shadow-sm disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  )
}

function PaginationFirst({
  className,
  children = "Primeira página",
  ...props
}: PaginationButtonProps) {
  return (
    <PaginationButton aria-label="Ir para primeira página" className={className} {...props}>
      <ChevronFirst aria-hidden="true" />
      <span className="sr-only">{children}</span>
    </PaginationButton>
  )
}

function PaginationPrevious({ className, children = "Anterior", ...props }: PaginationButtonProps) {
  return (
    <PaginationButton
      aria-label="Ir para página anterior"
      className={cn("w-auto gap-1 px-2.5", className)}
      {...props}
    >
      <ChevronLeft aria-hidden="true" />
      <span>{children}</span>
    </PaginationButton>
  )
}

function PaginationNext({ className, children = "Próxima", ...props }: PaginationButtonProps) {
  return (
    <PaginationButton
      aria-label="Ir para próxima página"
      className={cn("w-auto gap-1 px-2.5", className)}
      {...props}
    >
      <span>{children}</span>
      <ChevronRight aria-hidden="true" />
    </PaginationButton>
  )
}

function PaginationLast({
  className,
  children = "Última página",
  ...props
}: PaginationButtonProps) {
  return (
    <PaginationButton aria-label="Ir para última página" className={className} {...props}>
      <ChevronLast aria-hidden="true" />
      <span className="sr-only">{children}</span>
    </PaginationButton>
  )
}

function PaginationEllipsis({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="pagination-ellipsis"
      className={cn("flex size-7 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">Mais páginas</span>
    </span>
  )
}

export {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
}
