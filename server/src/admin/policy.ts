import type { AuthRecord } from '../auth/types'

export const backendAdminRoles = ['operator', 'admin'] as const

export type BackendAdminRole = (typeof backendAdminRoles)[number]

export type AdminUserManagement = {
  isSelf: boolean
  canChangeRole: boolean
  canUpdateStatus: boolean
  canAdjustQuota: boolean
  canRevokeSessions: boolean
  canUpdateProviderPolicy: boolean
  canAddNotes: boolean
  canTriggerPasswordReset: boolean
  assignableRoles: AuthRecord['role'][]
  reason?: string
}

export function canAccessAdmin(role: AuthRecord['role']) {
  return backendAdminRoles.includes(role as BackendAdminRole)
}

export function getAssignableAdminRoles(actor: AuthRecord) {
  return actor.role === 'admin'
    ? (['user', 'operator', 'admin'] as AuthRecord['role'][])
    : (['user', 'operator'] as AuthRecord['role'][])
}

export function getAdminPolicies(actor: AuthRecord) {
  const canManageAdmins = actor.role === 'admin'
  return {
    actorRole: actor.role as BackendAdminRole,
    canAssignAdmin: canManageAdmins,
    canManageAdmins,
    operatorScope: canManageAdmins ? ('all-backend-users' as const) : ('users-only' as const),
    selfProtection: {
      keepCurrentAdminAccess: true,
      keepCurrentSessionOnBulkRevoke: true,
    },
  }
}

export function getAdminUserManagement(actor: AuthRecord, target: AuthRecord): AdminUserManagement {
  if (actor.id === target.id) {
    return {
      isSelf: true,
      canChangeRole: false,
      canUpdateStatus: false,
      canAdjustQuota: false,
      canRevokeSessions: true,
      canUpdateProviderPolicy: false,
      canAddNotes: false,
      canTriggerPasswordReset: false,
      assignableRoles: [actor.role],
      reason: '不能移除自己当前的后台权限',
    }
  }

  if (actor.role === 'admin') {
    return {
      isSelf: false,
      canChangeRole: true,
      canUpdateStatus: true,
      canAdjustQuota: true,
      canRevokeSessions: true,
      canUpdateProviderPolicy: true,
      canAddNotes: true,
      canTriggerPasswordReset: true,
      assignableRoles: getAssignableAdminRoles(actor),
    }
  }

  if (target.role === 'user') {
    return {
      isSelf: false,
      canChangeRole: true,
      canUpdateStatus: true,
      canAdjustQuota: true,
      canRevokeSessions: true,
      canUpdateProviderPolicy: true,
      canAddNotes: true,
      canTriggerPasswordReset: true,
      assignableRoles: getAssignableAdminRoles(actor),
    }
  }

  return {
    isSelf: false,
    canChangeRole: false,
    canUpdateStatus: false,
    canAdjustQuota: false,
    canRevokeSessions: false,
    canUpdateProviderPolicy: false,
    canAddNotes: false,
    canTriggerPasswordReset: false,
    assignableRoles: [],
    reason: 'operator 只能管理普通用户，不能操作其他后台账号',
  }
}
