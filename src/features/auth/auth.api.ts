import { apiRequest } from '@/shared/http/client'

export type LoginInput = { email: string; password: string }
export type RegisterInput = { email: string; password: string; nickname: string }
export type UpdateProfileInput = { nickname: string }
export type ChangePasswordInput = { currentPassword: string; nextPassword: string }
export type ForgotPasswordInput = { email: string }
export type ResetPasswordInput = { email: string; token: string; nextPassword: string }

export type AuthUser = {
  id: string
  email: string
  nickname: string
  role: 'user' | 'operator' | 'admin'
  createdAt: string
  updatedAt: string
}

export type AuthSession = {
  id: string
  userId: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  current: boolean
}

export async function getCurrentUser() {
  return apiRequest<AuthUser | null>('/api/auth/me')
}

export async function login(input: LoginInput) {
  return apiRequest<AuthUser>('/api/auth/login', { method: 'POST', body: input })
}

export async function register(input: RegisterInput) {
  return apiRequest<AuthUser>('/api/auth/register', { method: 'POST', body: input })
}

export async function logout() {
  return apiRequest<{ success: true }>('/api/auth/logout', { method: 'POST' })
}

export async function updateProfile(input: UpdateProfileInput) {
  return apiRequest<AuthUser>('/api/auth/profile', { method: 'POST', body: input })
}

export async function changePassword(input: ChangePasswordInput) {
  return apiRequest<{ success: true }>('/api/auth/password', { method: 'POST', body: input })
}

export async function forgotPassword(input: ForgotPasswordInput) {
  return apiRequest<{ success: true }>('/api/auth/forgot-password', { method: 'POST', body: input })
}

export async function resetPassword(input: ResetPasswordInput) {
  return apiRequest<{ success: true }>('/api/auth/reset-password', { method: 'POST', body: input })
}

export async function fetchSessions() {
  return apiRequest<AuthSession[]>('/api/auth/sessions')
}

export async function revokeSession(id: string) {
  return apiRequest<{ success: true }>(`/api/auth/sessions/${id}/revoke`, { method: 'POST' })
}

export async function revokeOtherSessions() {
  return apiRequest<{ success: true }>('/api/auth/sessions/revoke-others', { method: 'POST' })
}
