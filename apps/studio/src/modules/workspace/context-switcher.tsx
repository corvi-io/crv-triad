import { Dialog } from "@base-ui/react/dialog"
import { useNavigate } from "@tanstack/react-router"
import { ArrowRightIcon, Building2Icon, CheckIcon, XIcon } from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/modules/shared/components/ui/avatar"
import { Button } from "@/modules/shared/components/ui/button"
import { DropdownMenuItem } from "@/modules/shared/components/ui/dropdown-menu"
import { ScrollArea } from "@/modules/shared/components/ui/scroll-area"
import { cn } from "@/modules/shared/lib/utils"

import { useWorkspaceContext } from "./context-provider"
import type { TenantWorkspace } from "./services/context-client"

type ContextSwitcherValue = {
  isPending: boolean
  open: () => void
}

const ContextSwitcherContext = createContext<ContextSwitcherValue | null>(null)

export function ContextSwitcherProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { activeTenant, contexts, selectTenant } = useWorkspaceContext()
  const [isOpen, setIsOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState(false)
  const [confirmationTenant, setConfirmationTenant] = useState<TenantWorkspace | null>(null)
  const orderedTenants = [...contexts.tenants].sort((left, right) => {
    if (left.id === activeTenant?.id) return -1
    if (right.id === activeTenant?.id) return 1
    return left.name.localeCompare(right.name, "pt-BR")
  })

  function setDialogOpen(open: boolean) {
    if (pendingId) return
    setIsOpen(open)
    if (!open) {
      setSelectionError(false)
      setConfirmationTenant(null)
    }
  }

  async function changeTenant(id: string) {
    if (id === activeTenant?.id || pendingId) return
    setPendingId(id)
    setSelectionError(false)
    try {
      await selectTenant(id)
      setIsOpen(false)
      setConfirmationTenant(null)
      await navigate({ to: "/overview", replace: true })
    } catch {
      setSelectionError(true)
      toast.error("Não foi possível trocar de barbearia. A barbearia anterior foi preservada.")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <ContextSwitcherContext value={{ isPending: !!pendingId, open: () => setIsOpen(true) }}>
      {children}
      <Dialog.Root open={isOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-(--layer-modal) bg-black/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-(--layer-modal) flex max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-lg ring-1 ring-border outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Dialog.Title className="text-xl font-semibold tracking-[-0.02em]">
                  {confirmationTenant
                    ? "Você realmente deseja trocar de barbearia?"
                    : "Onde você quer trabalhar?"}
                </Dialog.Title>
                <Dialog.Description className="text-sm leading-6 text-muted-foreground">
                  {confirmationTenant
                    ? "Confira o novo espaço antes de continuar. Alterações não salvas serão perdidas."
                    : "Escolha a barbearia em que deseja continuar trabalhando."}
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <Button
                    aria-label="Fechar"
                    disabled={!!pendingId}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  />
                }
              >
                <XIcon aria-hidden="true" />
              </Dialog.Close>
            </div>

            {confirmationTenant ? (
              <div className="mx-5 mb-5 sm:mx-6 sm:mb-6">
                <div className="flex items-center gap-3 rounded-xl bg-card px-4 py-4 ring-1 ring-border sm:px-5">
                  <BarbershopAvatar tenant={confirmationTenant} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{confirmationTenant.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2Icon className="size-3.5" aria-hidden="true" />
                      {workspaceRoleLabel[confirmationTenant.role]}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Você passará a trabalhar em {confirmationTenant.name}.
                </p>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    disabled={!!pendingId}
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmationTenant(null)}
                  >
                    Voltar
                  </Button>
                  <Button
                    isLoading={!!pendingId}
                    type="button"
                    onClick={() => void changeTenant(confirmationTenant.id)}
                  >
                    Trocar de barbearia
                  </Button>
                </div>
              </div>
            ) : (
              <ScrollArea
                className="mx-5 mb-5 min-h-0 flex-1 overflow-hidden rounded-xl bg-card ring-1 ring-border sm:mx-6 sm:mb-6"
                viewportClassName="max-h-[55svh]"
              >
                <ul>
                  {orderedTenants.map((tenant) => {
                    const isActive = tenant.id === activeTenant?.id

                    return (
                      <li className="border-b border-border last:border-b-0" key={tenant.id}>
                        <button
                          aria-label={
                            isActive ? `${tenant.name}, barbearia atual` : `Abrir ${tenant.name}`
                          }
                          aria-busy={pendingId === tenant.id}
                          className={cn(
                            "group flex min-h-22 w-full items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 sm:px-5",
                            isActive
                              ? "cursor-default bg-muted/35"
                              : "cursor-pointer hover:bg-muted/55",
                            pendingId && pendingId !== tenant.id && "opacity-55",
                          )}
                          disabled={isActive || !!pendingId}
                          type="button"
                          onClick={() => setConfirmationTenant(tenant)}
                        >
                          <BarbershopAvatar tenant={tenant} />
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate font-semibold">{tenant.name}</span>
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Building2Icon className="size-3.5" aria-hidden="true" />
                              {workspaceRoleLabel[tenant.role]}
                            </span>
                          </span>
                          {isActive ? (
                            <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground">
                              <CheckIcon className="size-4 text-primary" aria-hidden="true" />
                              Em uso
                            </span>
                          ) : (
                            <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-primary">
                              <span className="hidden sm:inline">Abrir barbearia</span>
                              <ArrowRightIcon
                                className="size-4 transition-transform group-hover:translate-x-1"
                                aria-hidden="true"
                              />
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            )}
            {selectionError ? (
              <p className="mx-5 mb-5 text-sm text-destructive sm:mx-6 sm:mb-6" role="alert">
                Não foi possível abrir a barbearia. Seu contexto anterior foi preservado.
              </p>
            ) : null}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </ContextSwitcherContext>
  )
}

export function ContextSwitcherMenuItem() {
  const context = useContext(ContextSwitcherContext)
  if (!context)
    throw new Error("ContextSwitcherMenuItem must be used inside ContextSwitcherProvider.")

  return (
    <DropdownMenuItem disabled={context.isPending} onClick={context.open}>
      <Building2Icon aria-hidden="true" />
      Trocar de barbearia
    </DropdownMenuItem>
  )
}

export const workspaceRoleLabel: Record<TenantWorkspace["role"], string> = {
  admin: "Administrador",
  member: "Equipe",
  owner: "Proprietário",
}

export function BarbershopAvatar({ tenant }: { tenant: TenantWorkspace }) {
  return (
    <Avatar className="size-12 rounded-xl">
      {tenant.logo ? <AvatarImage alt="" className="rounded-xl" src={tenant.logo} /> : null}
      <AvatarFallback className="rounded-xl font-medium">{getInitials(tenant.name)}</AvatarFallback>
    </Avatar>
  )
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "B"
  )
}
