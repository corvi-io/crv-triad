import type { LucideIcon } from "lucide-react"
import { EllipsisVertical } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/modules/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/modules/shared/components/ui/tooltip"

type PageHeaderActionVariant = "default" | "outline" | "secondary" | "ghost" | "destructive"

export type PageHeaderAction = {
  disabled?: boolean
  icon?: LucideIcon
  id?: string
  label: string
  onSelect?: () => void
  variant?: PageHeaderActionVariant
}

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  actionItems?: readonly PageHeaderAction[]
  actionsLabel?: string
}

export function PageHeader({
  actionItems,
  actions,
  actionsLabel = "Ações",
  description,
  title,
}: PageHeaderProps) {
  const hasActionItems = Boolean(actionItems?.length)
  const shouldCollapseActions = Boolean(actionItems && actionItems.length > 1)
  const { primaryActions, secondaryActions } = groupPageHeaderActions(actionItems ?? [])
  const expandedActionItems = [...secondaryActions, ...primaryActions]
  const renderedActions = hasActionItems
    ? expandedActionItems.map((action) => (
        <Button
          disabled={action.disabled}
          key={action.id ?? action.label}
          onClick={action.onSelect}
          type="button"
          variant={action.variant ?? "outline"}
        >
          {action.icon ? <action.icon /> : null}
          {action.label}
        </Button>
      ))
    : actions

  return (
    <header className="flex min-w-0 items-end justify-between gap-3" data-slot="page-header">
      <div className="min-w-0 flex-1" data-slot="page-header-content">
        <h1 className="text-xl font-semibold tracking-normal text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl truncate text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {shouldCollapseActions ? (
        <PageHeaderActionsMenu actions={actionItems ?? []} label={actionsLabel} />
      ) : null}
      {renderedActions ? (
        <div
          className={
            shouldCollapseActions
              ? "hidden shrink-0 items-center gap-2 lg:flex lg:justify-end"
              : "flex shrink-0 flex-wrap items-center justify-end gap-2"
          }
          data-slot="page-header-actions"
        >
          {renderedActions}
        </div>
      ) : null}
    </header>
  )
}

function PageHeaderActionsMenu({
  actions,
  label,
}: {
  actions: readonly PageHeaderAction[]
  label: string
}) {
  const { primaryActions, secondaryActions } = groupPageHeaderActions(actions)

  return (
    <div className="shrink-0 lg:hidden" data-slot="page-header-actions-menu">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={<Button type="button" variant="outline" size="icon" aria-label={label} />}
              />
            }
          >
            <EllipsisVertical />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-44" sideOffset={6}>
          {primaryActions.map((action) => (
            <PageHeaderActionMenuItem action={action} key={action.id ?? action.label} />
          ))}
          {primaryActions.length > 0 && secondaryActions.length > 0 ? (
            <DropdownMenuSeparator />
          ) : null}
          {secondaryActions.map((action) => (
            <PageHeaderActionMenuItem action={action} key={action.id ?? action.label} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function PageHeaderActionMenuItem({ action }: { action: PageHeaderAction }) {
  return (
    <DropdownMenuItem
      className={action.variant === "default" ? "font-medium text-foreground" : undefined}
      disabled={action.disabled}
      onClick={action.onSelect}
    >
      {action.icon ? <action.icon /> : null}
      {action.label}
    </DropdownMenuItem>
  )
}

function groupPageHeaderActions(actions: readonly PageHeaderAction[]) {
  return {
    primaryActions: actions.filter((action) => action.variant === "default"),
    secondaryActions: actions.filter((action) => action.variant !== "default"),
  }
}
