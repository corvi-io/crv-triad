import type {
  IdpInvitationStatus,
  IdpRole,
  IdpUserStatus,
} from "@/modules/admin/services/idp-admin-api"

export const usersSubnavItems = [
  { label: "Dashboard", to: "/users", match: "exact" },
  { label: "Usuários", to: "/users/list", match: "prefix" },
  { label: "Convites", to: "/users/invitations", match: "prefix" },
] as const

export const roleLabels: Record<IdpRole, string> = {
  admin: "Administrador",
  member: "Membro",
}

export const userStatusLabels: Record<IdpUserStatus, string> = {
  active: "Ativo",
  disabled: "Desativado",
}

export const invitationStatusLabels: Record<IdpInvitationStatus, string> = {
  accepted: "Aceito",
  expired: "Expirado",
  pending: "Pendente",
  revoked: "Revogado",
}

export function roleTone(role: IdpRole) {
  return role === "admin" ? ("info" as const) : ("neutral" as const)
}

export function userStatusTone(status: IdpUserStatus) {
  return status === "active" ? ("success" as const) : ("danger" as const)
}

export function invitationStatusTone(status: IdpInvitationStatus) {
  if (status === "accepted") {
    return "success" as const
  }
  if (status === "pending") {
    return "warning" as const
  }
  if (status === "revoked" || status === "expired") {
    return "danger" as const
  }

  return "neutral" as const
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}
