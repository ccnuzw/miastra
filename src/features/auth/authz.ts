import type { AuthUser } from './useAuthSession'

export const backendAdminRoles = ['operator', 'admin'] as const

export function canAccessAdmin(user: AuthUser | null) {
  return user ? (backendAdminRoles as readonly AuthUser['role'][]).includes(user.role) : false
}
