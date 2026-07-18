import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Eye,
  Filter,
  MailPlus,
  Pencil,
  RotateCcw,
  Shield,
  ShieldCheck,
  UserRound,
  UserRoundX,
  X,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { UsersLayout } from "@/modules/admin/components/admin-layout"
import {
  formatDateTime,
  invitationStatusLabels,
  invitationStatusTone,
  roleLabels,
  roleTone,
  userStatusLabels,
  userStatusTone,
} from "@/modules/admin/lib/labels"
import {
  createInvitation,
  type IdpInvitation,
  type IdpRole,
  type IdpSortDirection,
  type IdpUser,
  type IdpUserStatus,
  listInvitations,
  listUsers,
  revokeInvitation,
  updateUser,
} from "@/modules/admin/services/idp-admin-api"
import { ActionDrawer } from "@/modules/shared/components/action-drawer"
import {
  createDataTablePointAnchor,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTablePagination,
  DataTableRow,
  DataTableRowActionsMenu,
  DataTableSortableHeaderCell,
  type DataTableSortState,
} from "@/modules/shared/components/data-table"
import { DrawerItem, DrawerSection } from "@/modules/shared/components/drawer-section"
import {
  DrawerTabsList,
  DrawerTabsPanel,
  DrawerTabsRoot,
} from "@/modules/shared/components/drawer-tabs"
import { EmptyState } from "@/modules/shared/components/empty-state"
import { PageHeader } from "@/modules/shared/components/page-header"
import { StatusBadge } from "@/modules/shared/components/status-badge"
import { Button } from "@/modules/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/modules/shared/components/ui/dropdown-menu"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/modules/shared/components/ui/field"
import { Input } from "@/modules/shared/components/ui/input"

export type UserListRouteSearch = {
  page?: number
  pageSize?: number
  q?: string
  role?: string[]
  sortBy?: string
  sortDirection?: IdpSortDirection
  status?: string[]
}

export type InvitationListRouteSearch = UserListRouteSearch

type UserListScreenProps = {
  onSearchStateChange: (nextSearch: UserListRouteSearch) => void
  searchState: UserListRouteSearch
}

type UserSortKey = "createdAt" | "email" | "name" | "role" | "status" | "updatedAt"
type InvitationSortKey = "createdAt" | "email" | "expiresAt" | "role" | "status" | "updatedAt"
type UserDrawerMode = "view" | "edit"

const roleOptions: { label: string; value: IdpRole }[] = [
  { label: "Administrador", value: "admin" },
  { label: "Membro", value: "member" },
]

const userStatusOptions: { label: string; value: IdpUserStatus }[] = [
  { label: "Ativo", value: "active" },
  { label: "Desativado", value: "disabled" },
]

const invitationStatusOptions: { label: string; value: IdpInvitation["status"] }[] = [
  { label: "Pendente", value: "pending" },
  { label: "Aceito", value: "accepted" },
  { label: "Expirado", value: "expired" },
  { label: "Revogado", value: "revoked" },
]

export function UsersDashboardScreen() {
  const queryClient = useQueryClient()
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false)
  const usersTotalQuery = useQuery({
    queryKey: ["idp", "users", "dashboard", "total"],
    queryFn: () => listUsers({ page: 1, pageSize: 1 }),
  })
  const activeUsersQuery = useQuery({
    queryKey: ["idp", "users", "dashboard", "active"],
    queryFn: () => listUsers({ page: 1, pageSize: 1, status: ["active"] }),
  })
  const pendingInvitationsQuery = useQuery({
    queryKey: ["idp", "invitations", "dashboard", "pending"],
    queryFn: () => listInvitations({ page: 1, pageSize: 1, status: ["pending"] }),
  })
  const acceptedInvitationsQuery = useQuery({
    queryKey: ["idp", "invitations", "dashboard", "accepted"],
    queryFn: () => listInvitations({ page: 1, pageSize: 1, status: ["accepted"] }),
  })

  return (
    <UsersLayout
      head={
        <PageHeader
          title="Dashboard"
          description="Acompanhe usuários, convites e acesso ao workspace."
          actionItems={[
            {
              icon: MailPlus,
              id: "invite",
              label: "Novo convite",
              onSelect: () => setIsInviteDrawerOpen(true),
              variant: "default",
            },
          ]}
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UsersMetricCard
          label="Usuários"
          value={usersTotalQuery.data?.page.totalCount}
          isLoading={usersTotalQuery.isLoading}
        />
        <UsersMetricCard
          label="Ativos"
          value={activeUsersQuery.data?.page.totalCount}
          isLoading={activeUsersQuery.isLoading}
        />
        <UsersMetricCard
          label="Convites pendentes"
          value={pendingInvitationsQuery.data?.page.totalCount}
          isLoading={pendingInvitationsQuery.isLoading}
        />
        <UsersMetricCard
          label="Convites aceitos"
          value={acceptedInvitationsQuery.data?.page.totalCount}
          isLoading={acceptedInvitationsQuery.isLoading}
        />
      </div>
      <InviteDrawer
        isOpen={isInviteDrawerOpen}
        onOpenChange={setIsInviteDrawerOpen}
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ["idp"] })
        }}
      />
    </UsersLayout>
  )
}

function UsersMetricCard({
  isLoading,
  label,
  value,
}: {
  isLoading: boolean
  label: string
  value?: number
}) {
  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {isLoading ? (
        <div className="mt-4 h-9 w-20 animate-pulse rounded-md bg-muted" />
      ) : (
        <p className="mt-3 text-3xl font-semibold tabular-nums">{value ?? 0}</p>
      )}
    </section>
  )
}

export function UserListScreen({ onSearchStateChange, searchState }: UserListScreenProps) {
  const queryClient = useQueryClient()
  const normalizedSearch = normalizeSearch(searchState)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<IdpUser | null>(null)
  const [userDrawerMode, setUserDrawerMode] = useState<UserDrawerMode>("view")
  const [contextMenu, setContextMenu] = useState<{
    anchor: ReturnType<typeof createDataTablePointAnchor>
    user: IdpUser
  } | null>(null)

  const usersQuery = useQuery({
    queryKey: ["idp", "users", normalizedSearch],
    queryFn: () =>
      listUsers({
        page: normalizedSearch.page,
        pageSize: normalizedSearch.pageSize,
        q: normalizedSearch.q || undefined,
        role: normalizedSearch.role,
        status: normalizedSearch.status,
        sortBy: normalizedSearch.sortBy,
        sortDirection: normalizedSearch.sortDirection,
      }),
  })

  const userUpdateMutation = useMutation({
    mutationFn: ({ userId, payload }: { payload: Partial<IdpUser>; userId: string }) =>
      updateUser(userId, { role: payload.role, status: payload.status }),
    onSuccess: async ({ user }) => {
      toast.success("Usuário atualizado.")
      setSelectedUser(user)
      setUserDrawerMode("view")
      await queryClient.invalidateQueries({ queryKey: ["idp", "users"] })
    },
    onError: () => toast.error("Não foi possível atualizar o usuário."),
  })

  const users = usersQuery.data?.users ?? []
  const page = usersQuery.data?.page ?? {
    page: normalizedSearch.page,
    pageSize: normalizedSearch.pageSize,
    totalCount: 0,
    totalPages: 1,
  }
  const sortState = useMemo<DataTableSortState<UserSortKey>>(
    () => ({
      direction: normalizedSearch.sortDirection,
      key: normalizedSearch.sortBy,
    }),
    [normalizedSearch.sortBy, normalizedSearch.sortDirection],
  )

  function patchSearch(patch: Partial<NormalizedUsersSearch>) {
    onSearchStateChange(cleanSearch({ ...normalizedSearch, ...patch }))
  }

  return (
    <UsersLayout
      head={
        <PageHeader
          title="Usuários"
          description="Gerencie acesso, permissões e convites do workspace."
          actionItems={[
            {
              icon: Filter,
              id: "filters",
              label: "Filtros",
              onSelect: () => setIsFilterDrawerOpen(true),
              variant: "outline",
            },
            {
              icon: MailPlus,
              id: "invite",
              label: "Novo convite",
              onSelect: () => setIsInviteDrawerOpen(true),
              variant: "default",
            },
          ]}
        />
      }
    >
      <div className="flex min-h-0 flex-1">
        <DataTable
          aria-label="Usuários do workspace"
          className="min-h-0 flex-1"
          footer={
            <DataTablePagination
              isLoading={usersQuery.isFetching}
              page={page.page}
              pageSize={page.pageSize}
              totalCount={page.totalCount}
              totalPages={page.totalPages}
              onPageChange={(nextPage) => patchSearch({ page: nextPage })}
              onPageSizeChange={(nextPageSize) => patchSearch({ page: 1, pageSize: nextPageSize })}
            />
          }
        >
          <DataTableHead>
            <tr>
              <DataTableSortableHeaderCell
                sortKey="name"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Pessoa
              </DataTableSortableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="email"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Email
              </DataTableSortableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="role"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Permissão
              </DataTableSortableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="status"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Status
              </DataTableSortableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="createdAt"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Entrada
              </DataTableSortableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {users.map((user) => (
              <DataTableRow
                key={user.id}
                data-interactive="true"
                onDoubleClick={() => {
                  setSelectedUser(user)
                  setUserDrawerMode("view")
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setContextMenu({
                    anchor: createDataTablePointAnchor(event.clientX, event.clientY),
                    user,
                  })
                }}
              >
                <DataTableCell>
                  <button
                    type="button"
                    className="block max-w-64 cursor-pointer truncate text-left font-medium text-foreground hover:underline"
                    onClick={() => {
                      setSelectedUser(user)
                      setUserDrawerMode("view")
                    }}
                  >
                    {user.name}
                  </button>
                </DataTableCell>
                <DataTableCell>{user.email}</DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={roleTone(user.role)}>{roleLabels[user.role]}</StatusBadge>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge tone={userStatusTone(user.status)}>
                    {userStatusLabels[user.status]}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell>{formatDateTime(user.createdAt)}</DataTableCell>
              </DataTableRow>
            ))}
            {users.length === 0 && !usersQuery.isLoading ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={UserRound}
                    title="Nenhum usuário encontrado"
                    description="Ajuste os filtros ou envie um novo convite."
                  />
                </td>
              </tr>
            ) : null}
          </DataTableBody>
        </DataTable>
      </div>

      <DataTableRowActionsMenu
        isOpen={Boolean(contextMenu)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setContextMenu(null)
        }}
        anchor={contextMenu?.anchor}
        actions={
          contextMenu
            ? [
                {
                  icon: Eye,
                  label: "Visualizar",
                  onSelect: () => {
                    setSelectedUser(contextMenu.user)
                    setUserDrawerMode("view")
                    setContextMenu(null)
                  },
                },
                {
                  icon: Pencil,
                  label: "Editar acesso",
                  onSelect: () => {
                    setSelectedUser(contextMenu.user)
                    setUserDrawerMode("edit")
                    setContextMenu(null)
                  },
                },
              ]
            : []
        }
      />

      <FiltersDrawer
        isOpen={isFilterDrawerOpen}
        onOpenChange={setIsFilterDrawerOpen}
        search={normalizedSearch}
        onSearchChange={patchSearch}
      />
      <InviteDrawer
        isOpen={isInviteDrawerOpen}
        onOpenChange={setIsInviteDrawerOpen}
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ["idp"] })
        }}
      />
      <UserDrawer
        key={selectedUser ? `${selectedUser.id}:${selectedUser.updatedAt}` : "closed"}
        mode={userDrawerMode}
        user={selectedUser}
        isSaving={userUpdateMutation.isPending}
        onModeChange={setUserDrawerMode}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedUser(null)
            setUserDrawerMode("view")
          }
        }}
        onSave={(payload) => {
          if (!selectedUser) return
          userUpdateMutation.mutate({ userId: selectedUser.id, payload })
        }}
      />
    </UsersLayout>
  )
}

export function InvitationsScreen({
  onSearchStateChange,
  searchState,
}: {
  onSearchStateChange: (nextSearch: InvitationListRouteSearch) => void
  searchState: InvitationListRouteSearch
}) {
  const queryClient = useQueryClient()
  const normalizedSearch = normalizeInvitationSearch(searchState)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [isInviteDrawerOpen, setIsInviteDrawerOpen] = useState(false)
  const invitationsQuery = useQuery({
    queryKey: ["idp", "invitations", normalizedSearch],
    queryFn: () =>
      listInvitations({
        page: normalizedSearch.page,
        pageSize: normalizedSearch.pageSize,
        q: normalizedSearch.q || undefined,
        role: normalizedSearch.role,
        sortBy: normalizedSearch.sortBy,
        sortDirection: normalizedSearch.sortDirection,
        status: normalizedSearch.status,
      }),
  })
  const revokeMutation = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: async () => {
      toast.success("Convite revogado.")
      await queryClient.invalidateQueries({ queryKey: ["idp", "invitations"] })
    },
    onError: () => toast.error("Não foi possível revogar o convite."),
  })

  const invitations = invitationsQuery.data?.invitations ?? []
  const page = invitationsQuery.data?.page ?? {
    page: normalizedSearch.page,
    pageSize: normalizedSearch.pageSize,
    totalCount: 0,
    totalPages: 1,
  }
  const sortState = useMemo<DataTableSortState<InvitationSortKey>>(
    () => ({
      direction: normalizedSearch.sortDirection,
      key: normalizedSearch.sortBy,
    }),
    [normalizedSearch.sortBy, normalizedSearch.sortDirection],
  )

  function patchSearch(patch: Partial<NormalizedInvitationSearch>) {
    onSearchStateChange(cleanInvitationSearch({ ...normalizedSearch, ...patch }))
  }

  return (
    <UsersLayout
      head={
        <PageHeader
          title="Convites"
          description="Gerencie convites enviados para acessar o workspace."
          actionItems={[
            {
              icon: Filter,
              id: "filters",
              label: "Filtros",
              onSelect: () => setIsFilterDrawerOpen(true),
              variant: "outline",
            },
            {
              icon: MailPlus,
              id: "invite",
              label: "Novo convite",
              onSelect: () => setIsInviteDrawerOpen(true),
              variant: "default",
            },
          ]}
        />
      }
    >
      <div className="flex min-h-0 flex-1">
        <DataTable
          aria-label="Convites do workspace"
          className="min-h-0 flex-1"
          footer={
            <DataTablePagination
              isLoading={invitationsQuery.isFetching}
              page={page.page}
              pageSize={page.pageSize}
              totalCount={page.totalCount}
              totalPages={page.totalPages}
              onPageChange={(nextPage) => patchSearch({ page: nextPage })}
              onPageSizeChange={(nextPageSize) => patchSearch({ page: 1, pageSize: nextPageSize })}
            />
          }
        >
          <DataTableHead>
            <tr>
              <DataTableSortableHeaderCell
                sortKey="email"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Email
              </DataTableSortableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="role"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Permissão
              </DataTableSortableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="status"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Status
              </DataTableSortableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="expiresAt"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Expira em
              </DataTableSortableHeaderCell>
              <DataTableSortableHeaderCell
                sortKey="createdAt"
                sortedBy={sortState.key}
                sortDirection={sortState.direction}
                onSortChange={(state) => patchSearch({ page: 1, ...state })}
              >
                Enviado em
              </DataTableSortableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {invitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                onRevoke={(item) => revokeMutation.mutate(item.id)}
              />
            ))}
            {invitations.length === 0 && !invitationsQuery.isLoading ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={MailPlus}
                    title="Nenhum convite encontrado"
                    description="Os próximos convites enviados aparecem aqui."
                  />
                </td>
              </tr>
            ) : null}
          </DataTableBody>
        </DataTable>
      </div>
      <InvitationFiltersDrawer
        isOpen={isFilterDrawerOpen}
        onOpenChange={setIsFilterDrawerOpen}
        search={normalizedSearch}
        onSearchChange={patchSearch}
      />
      <InviteDrawer
        isOpen={isInviteDrawerOpen}
        onOpenChange={setIsInviteDrawerOpen}
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ["idp"] })
        }}
      />
    </UsersLayout>
  )
}

function InvitationRow({
  invitation,
  onRevoke,
}: {
  invitation: IdpInvitation
  onRevoke: (invitation: IdpInvitation) => void
}) {
  const [contextMenu, setContextMenu] = useState<ReturnType<
    typeof createDataTablePointAnchor
  > | null>(null)

  return (
    <>
      <DataTableRow
        data-interactive="true"
        onContextMenu={(event) => {
          event.preventDefault()
          setContextMenu(createDataTablePointAnchor(event.clientX, event.clientY))
        }}
      >
        <DataTableCell>{invitation.email}</DataTableCell>
        <DataTableCell>
          <StatusBadge tone={roleTone(invitation.role)}>{roleLabels[invitation.role]}</StatusBadge>
        </DataTableCell>
        <DataTableCell>
          <StatusBadge tone={invitationStatusTone(invitation.status)}>
            {invitationStatusLabels[invitation.status]}
          </StatusBadge>
        </DataTableCell>
        <DataTableCell>{formatDateTime(invitation.expiresAt)}</DataTableCell>
        <DataTableCell>{formatDateTime(invitation.createdAt)}</DataTableCell>
      </DataTableRow>
      <DataTableRowActionsMenu
        isOpen={Boolean(contextMenu)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setContextMenu(null)
        }}
        anchor={contextMenu ?? undefined}
        actions={[
          {
            disabled: invitation.status !== "pending",
            icon: X,
            label: "Revogar convite",
            onSelect: () => onRevoke(invitation),
            variant: "destructive",
          },
        ]}
      />
    </>
  )
}

function FiltersDrawer({
  isOpen,
  onOpenChange,
  onSearchChange,
  search,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSearchChange: (patch: Partial<NormalizedUsersSearch>) => void
  search: NormalizedUsersSearch
}) {
  return (
    <ActionDrawer
      context="Usuários"
      title="Filtros"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      secondaryActions={
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onSearchChange({
              page: 1,
              q: "",
              role: [],
              status: [],
            })
          }
        >
          <RotateCcw />
          Limpar filtros
        </Button>
      }
    >
      <DrawerSection>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="user-filter-search">Pesquisar</FieldLabel>
            <Input
              id="user-filter-search"
              value={search.q}
              placeholder="Nome ou email"
              onChange={(event) => onSearchChange({ page: 1, q: event.target.value })}
            />
          </Field>
          <FilterOptions
            label="Permissão"
            options={roleOptions}
            selected={search.role}
            onChange={(role) => onSearchChange({ page: 1, role })}
          />
          <FilterOptions
            label="Status"
            options={userStatusOptions}
            selected={search.status}
            onChange={(status) => onSearchChange({ page: 1, status })}
          />
        </FieldGroup>
      </DrawerSection>
    </ActionDrawer>
  )
}

function InvitationFiltersDrawer({
  isOpen,
  onOpenChange,
  onSearchChange,
  search,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSearchChange: (patch: Partial<NormalizedInvitationSearch>) => void
  search: NormalizedInvitationSearch
}) {
  return (
    <ActionDrawer
      context="Convites"
      title="Filtros"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      secondaryActions={
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onSearchChange({
              page: 1,
              q: "",
              role: [],
              status: [],
            })
          }
        >
          <RotateCcw />
          Limpar filtros
        </Button>
      }
    >
      <DrawerSection>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="invitation-filter-search">Pesquisar</FieldLabel>
            <Input
              id="invitation-filter-search"
              value={search.q}
              placeholder="Email do convidado"
              onChange={(event) => onSearchChange({ page: 1, q: event.target.value })}
            />
          </Field>
          <FilterOptions
            label="Permissão"
            options={roleOptions}
            selected={search.role}
            onChange={(role) => onSearchChange({ page: 1, role })}
          />
          <FilterOptions
            label="Status"
            options={invitationStatusOptions}
            selected={search.status}
            onChange={(status) => onSearchChange({ page: 1, status })}
          />
        </FieldGroup>
      </DrawerSection>
    </ActionDrawer>
  )
}

function FilterOptions<TValue extends string>({
  label,
  onChange,
  options,
  selected,
}: {
  label: string
  onChange: (selected: TValue[]) => void
  options: { label: string; value: TValue }[]
  selected: TValue[]
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value)

          return (
            <Button
              key={option.value}
              type="button"
              variant={isSelected ? "default" : "outline"}
              onClick={() =>
                onChange(
                  isSelected
                    ? selected.filter((item) => item !== option.value)
                    : [...selected, option.value],
                )
              }
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function InviteDrawer({
  isOpen,
  onCreated,
  onOpenChange,
}: {
  isOpen: boolean
  onCreated: () => Promise<void>
  onOpenChange: (isOpen: boolean) => void
}) {
  const emailRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState(() => getDefaultInviteForm())
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})
  const mutation = useMutation({
    mutationFn: createInvitation,
    onSuccess: async ({ emailDelivery }) => {
      if (emailDelivery === "sent") {
        toast.success("Convite enviado.")
      } else if (emailDelivery === "failed") {
        toast.warning("Convite criado, mas o email não foi enviado.")
      } else {
        toast.success("Convite criado.")
      }
      setForm(getDefaultInviteForm())
      setErrors({})
      onOpenChange(false)
      await onCreated()
    },
    onError: () => toast.error("Não foi possível enviar o convite."),
  })

  function submit() {
    const nextErrors = validateInviteForm(form)
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0] as keyof typeof form | undefined
    if (firstError) {
      if (firstError === "email") emailRef.current?.focus()
      return
    }

    mutation.mutate({
      email: form.email.trim(),
      role: form.role,
    })
  }

  return (
    <ActionDrawer
      context="Usuários"
      title="Novo convite"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      primaryAction={
        <Button type="button" isLoading={mutation.isPending} onClick={submit}>
          Enviar convite
        </Button>
      }
      secondaryActions={
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
      }
      size="md"
    >
      <form noValidate className="space-y-5" onSubmit={(event) => event.preventDefault()}>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="invite-email" required>
              Email
            </FieldLabel>
            <Input
              ref={emailRef}
              autoFocus
              id="invite-email"
              value={form.email}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <FieldError>{errors.email}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Permissão</FieldLabel>
            <RoleSelect
              value={form.role}
              onChange={(role) => setForm((current) => ({ ...current, role }))}
            />
          </Field>
        </FieldGroup>
      </form>
    </ActionDrawer>
  )
}

function UserDrawer({
  isSaving,
  mode,
  onModeChange,
  onOpenChange,
  onSave,
  user,
}: {
  isSaving: boolean
  mode: UserDrawerMode
  onModeChange: (mode: UserDrawerMode) => void
  onOpenChange: (isOpen: boolean) => void
  onSave: (payload: Partial<Pick<IdpUser, "role" | "status">>) => void
  user: IdpUser | null
}) {
  const [form, setForm] = useState<{ role: IdpRole; status: IdpUserStatus }>(() => ({
    role: user?.role ?? "member",
    status: user?.status ?? "active",
  }))
  const [tab, setTab] = useState("summary")

  return (
    <ActionDrawer
      context="Usuários"
      title={mode === "edit" ? "Editar usuário" : "Visualizar usuário"}
      isOpen={Boolean(user)}
      onOpenChange={onOpenChange}
      size="md"
      tabs={
        <DrawerTabsRoot value={tab} onValueChange={setTab}>
          <DrawerTabsList
            label="Detalhes do usuário"
            items={[
              { label: "Resumo", value: "summary" },
              { label: "Acesso", value: "access" },
            ]}
          />
        </DrawerTabsRoot>
      }
      primaryAction={
        mode === "edit" ? (
          <Button type="button" isLoading={isSaving} onClick={() => onSave(form)}>
            Salvar alterações
          </Button>
        ) : null
      }
      secondaryActions={
        mode === "edit" ? (
          <Button type="button" variant="outline" onClick={() => onModeChange("view")}>
            Cancelar
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => onModeChange("edit")}>
            <Pencil />
            Editar acesso
          </Button>
        )
      }
    >
      {user ? (
        <DrawerTabsRoot value={tab} onValueChange={setTab}>
          <DrawerTabsPanel value="summary">
            <DrawerSection>
              <DrawerItem>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{user.name}</p>
              </DrawerItem>
              <DrawerItem>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </DrawerItem>
              <DrawerItem>
                <p className="text-sm text-muted-foreground">Entrada</p>
                <p className="font-medium">{formatDateTime(user.createdAt)}</p>
              </DrawerItem>
            </DrawerSection>
          </DrawerTabsPanel>
          <DrawerTabsPanel value="access">
            <DrawerSection>
              <DrawerItem>
                <Field>
                  <FieldLabel>Permissão</FieldLabel>
                  {mode === "edit" ? (
                    <RoleSelect
                      value={form.role}
                      onChange={(role) => setForm((current) => ({ ...current, role }))}
                    />
                  ) : (
                    <StatusBadge tone={roleTone(user.role)}>{roleLabels[user.role]}</StatusBadge>
                  )}
                </Field>
              </DrawerItem>
              <DrawerItem>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  {mode === "edit" ? (
                    <UserStatusSelect
                      value={form.status}
                      onChange={(status) => setForm((current) => ({ ...current, status }))}
                    />
                  ) : (
                    <StatusBadge tone={userStatusTone(user.status)}>
                      {userStatusLabels[user.status]}
                    </StatusBadge>
                  )}
                </Field>
              </DrawerItem>
            </DrawerSection>
          </DrawerTabsPanel>
        </DrawerTabsRoot>
      ) : null}
    </ActionDrawer>
  )
}

function RoleSelect({ onChange, value }: { onChange: (role: IdpRole) => void; value: IdpRole }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" className="w-full justify-between">
            <Shield className="text-muted-foreground" />
            {roleLabels[value]}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-(--anchor-width)">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => onChange(nextValue as IdpRole)}
        >
          {roleOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
              {option.value === "admin" ? <ShieldCheck /> : <Shield />}
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserStatusSelect({
  onChange,
  value,
}: {
  onChange: (status: IdpUserStatus) => void
  value: IdpUserStatus
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" className="w-full justify-between">
            {value === "active" ? <UserRound /> : <UserRoundX />}
            {userStatusLabels[value]}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-(--anchor-width)">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => onChange(nextValue as IdpUserStatus)}
        >
          {userStatusOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick>
              {option.value === "active" ? <UserRound /> : <UserRoundX />}
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type NormalizedUsersSearch = {
  page: number
  pageSize: number
  q: string
  role: IdpRole[]
  sortBy: UserSortKey | null
  sortDirection: IdpSortDirection | null
  status: IdpUserStatus[]
}

type NormalizedInvitationSearch = {
  page: number
  pageSize: number
  q: string
  role: IdpRole[]
  sortBy: InvitationSortKey | null
  sortDirection: IdpSortDirection | null
  status: IdpInvitation["status"][]
}

function normalizeSearch(search: UserListRouteSearch): NormalizedUsersSearch {
  return {
    page: search.page ?? 1,
    pageSize: search.pageSize ?? 20,
    q: search.q ?? "",
    role: filterValues(search.role, ["admin", "member"]),
    sortBy: filterSortKey(search.sortBy),
    sortDirection: search.sortDirection ?? null,
    status: filterValues(search.status, ["active", "disabled"]),
  }
}

function cleanSearch(search: NormalizedUsersSearch): UserListRouteSearch {
  return {
    page: search.page === 1 ? undefined : search.page,
    pageSize: search.pageSize === 20 ? undefined : search.pageSize,
    q: search.q || undefined,
    role: search.role.length > 0 ? search.role : undefined,
    sortBy: search.sortBy ?? undefined,
    sortDirection: search.sortDirection ?? undefined,
    status: search.status.length > 0 ? search.status : undefined,
  }
}

function normalizeInvitationSearch(search: InvitationListRouteSearch): NormalizedInvitationSearch {
  return {
    page: search.page ?? 1,
    pageSize: search.pageSize ?? 20,
    q: search.q ?? "",
    role: filterValues(search.role, ["admin", "member"]),
    sortBy: filterInvitationSortKey(search.sortBy),
    sortDirection: search.sortDirection ?? null,
    status: filterValues(search.status, ["pending", "accepted", "expired", "revoked"]),
  }
}

function cleanInvitationSearch(search: NormalizedInvitationSearch): InvitationListRouteSearch {
  return {
    page: search.page === 1 ? undefined : search.page,
    pageSize: search.pageSize === 20 ? undefined : search.pageSize,
    q: search.q || undefined,
    role: search.role.length > 0 ? search.role : undefined,
    sortBy: search.sortBy ?? undefined,
    sortDirection: search.sortDirection ?? undefined,
    status: search.status.length > 0 ? search.status : undefined,
  }
}

function filterValues<TValue extends string>(values: string[] | undefined, allowed: TValue[]) {
  return (values ?? []).filter((value): value is TValue => allowed.includes(value as TValue))
}

function filterSortKey(value: string | undefined): UserSortKey | null {
  const allowed: UserSortKey[] = ["createdAt", "email", "name", "role", "status", "updatedAt"]
  return allowed.includes(value as UserSortKey) ? (value as UserSortKey) : null
}

function filterInvitationSortKey(value: string | undefined): InvitationSortKey | null {
  const allowed: InvitationSortKey[] = [
    "createdAt",
    "email",
    "expiresAt",
    "role",
    "status",
    "updatedAt",
  ]
  return allowed.includes(value as InvitationSortKey) ? (value as InvitationSortKey) : null
}

function getDefaultInviteForm() {
  return {
    email: "",
    role: "member" as IdpRole,
  }
}

function validateInviteForm(form: ReturnType<typeof getDefaultInviteForm>) {
  const errors: Partial<Record<keyof typeof form, string>> = {}

  if (!form.email.trim()) {
    errors.email = "Informe o email do convite."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Informe um email válido."
  }

  return errors
}
