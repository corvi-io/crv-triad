import { Dialog } from "@base-ui/react/dialog"
import { useNavigate } from "@tanstack/react-router"
import { ArrowRightIcon, Building2Icon, XIcon } from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/modules/shared/components/ui/avatar"
import { Badge } from "@/modules/shared/components/ui/badge"
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [step, setStep] = useState<"confirm" | "select">("select")
  const selectedTenant = contexts.tenants.find((tenant) => tenant.id === selectedId) ?? null
  const orderedTenants = [...contexts.tenants].sort((left, right) => {
    if (left.id === activeTenant?.id) return -1
    if (right.id === activeTenant?.id) return 1
    return left.name.localeCompare(right.name, "pt-BR")
  })

  function setDialogOpen(open: boolean) {
    if (pendingId) return
    setIsOpen(open)
    if (!open) {
      setSelectedId(null)
      setStep("select")
    }
  }

  async function confirmTenantChange() {
    const id = selectedTenant?.id
    if (!id) return
    if (id === activeTenant?.id || pendingId) return
    setPendingId(id)
    try {
      await selectTenant(id)
      setIsOpen(false)
      setSelectedId(null)
      setStep("select")
      await navigate({ to: "/overview", replace: true })
    } catch {
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
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-(--layer-modal) flex max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Dialog.Title className="text-lg font-semibold">
                    {step === "select" ? "Escolha uma barbearia" : "Confirme a troca de barbearia"}
                  </Dialog.Title>
                  <Badge variant="outline">{step === "select" ? "1 de 2" : "2 de 2"}</Badge>
                </div>
                <Dialog.Description className="text-sm text-muted-foreground">
                  {step === "select"
                    ? "Selecione onde você quer continuar trabalhando."
                    : "Confira o destino antes de continuar."}
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

            {step === "select" ? (
              <ScrollArea className="min-h-0 flex-1" viewportClassName="max-h-[55svh] p-5">
                <div className="grid gap-2">
                  {orderedTenants.map((tenant) => {
                    const isActive = tenant.id === activeTenant?.id
                    const isSelected = tenant.id === selectedId

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-70",
                          isSelected && "border-primary bg-primary/5",
                        )}
                        disabled={isActive}
                        key={tenant.id}
                        type="button"
                        onClick={() => setSelectedId(tenant.id)}
                      >
                        <BarbershopAvatar tenant={tenant} />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate font-medium">{tenant.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {workspaceRoleLabel[tenant.role]}
                          </span>
                        </span>
                        {isActive ? <Badge variant="secondary">Atual</Badge> : null}
                        {isSelected ? <Badge>Selecionada</Badge> : null}
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col gap-5 p-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border bg-background p-4">
                  {activeTenant ? (
                    <BarbershopDestination label="Você está em" tenant={activeTenant} />
                  ) : null}
                  <ArrowRightIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                  {selectedTenant ? (
                    <BarbershopDestination label="Você vai para" tenant={selectedTenant} />
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  A tela atual será recarregada e passará a mostrar os dados de{" "}
                  {selectedTenant?.name}. Alterações ainda não salvas serão perdidas.
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
              <Button
                disabled={!!pendingId}
                type="button"
                variant="outline"
                onClick={() => (step === "confirm" ? setStep("select") : setDialogOpen(false))}
              >
                {step === "confirm" ? "Voltar" : "Cancelar"}
              </Button>
              <Button
                disabled={!selectedTenant}
                isLoading={!!pendingId}
                type="button"
                onClick={() =>
                  step === "select" ? setStep("confirm") : void confirmTenantChange()
                }
              >
                {step === "select" ? "Continuar" : "Trocar de barbearia"}
              </Button>
            </div>
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

function BarbershopDestination({ label, tenant }: { label: string; tenant: TenantWorkspace }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <BarbershopAvatar tenant={tenant} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{tenant.name}</p>
      </div>
    </div>
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
