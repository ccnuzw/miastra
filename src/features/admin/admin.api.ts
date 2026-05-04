import { apiRequest } from '@/shared/http/client'

export type AdminActorRole = 'user' | 'operator' | 'admin'
export type AdminUserRole = 'user' | 'operator' | 'admin'
export type AdminTaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'timeout'

export type PaginatedResponse<T> = {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type AdminListQuery = {
  page?: number
  limit?: number
  query?: string
}

export type AdminUserManagement = {
  isSelf: boolean
  canChangeRole: boolean
  canRevokeSessions: boolean
  assignableRoles: AdminUserRole[]
  reason?: string
}

export type AdminUserRecord = {
  id: string
  email: string
  nickname: string
  role: AdminUserRole
  createdAt: string
  updatedAt: string
  activeSessionCount: number
  workCount: number
  taskCount: number
  management: AdminUserManagement
}

export type AdminWorkRecord = {
  id: string
  userId: string
  userEmail?: string
  userNickname?: string
  title: string
  src?: string
  meta: string
  variation?: string
  batchId?: string
  drawIndex?: number
  taskStatus?: string
  error?: string
  retryable?: boolean
  retryCount?: number
  createdAt?: number
  mode?: string
  providerModel?: string
  size?: string
  quality?: string
  snapshotId?: string
  generationSnapshot?: unknown
  promptSnippet?: string
  promptText?: string
}

export type AdminGenerationTaskRecord = {
  id: string
  userId: string
  userEmail?: string
  userNickname?: string
  status: AdminTaskStatus
  progress?: number
  createdAt: string
  updatedAt: string
  errorMessage?: string
  payload: {
    mode: string
    title: string
    meta: string
    promptText: string
    workspacePrompt: string
    requestPrompt: string
    snapshotId?: string
    size: string
    quality: string
    model: string
    providerId: string
    stream: boolean
  }
  result?: {
    imageUrl?: string
    meta?: string
    title?: string
    promptText?: string
    promptSnippet?: string
    size?: string
    quality?: string
    providerModel?: string
    snapshotId?: string
    mode?: string
    batchId?: string
    drawIndex?: number
    variation?: string
  }
}

export type AdminDashboardData = {
  overview: {
    currentUser: {
      id: string
      email: string
      nickname: string
      role: AdminUserRole
      createdAt: string
      updatedAt: string
    }
    counts: {
      users: number
      works: number
      generationTasks: number
      promptTemplates: number
    }
    roleBreakdown: Record<string, number>
    taskStatusBreakdown: Record<string, number>
  }
  users: AdminUserRecord[]
  recentWorks: AdminWorkRecord[]
  recentTasks: AdminGenerationTaskRecord[]
  logs?: Array<{
    id: string
    actorUserId: string
    actorRole: 'user' | 'operator' | 'admin'
    actorEmail?: string
    actorNickname?: string
    action: string
    targetType: string
    targetId: string
    payload: unknown
    ip?: string
    requestId?: string
    createdAt: string
  }>
  system: {
    status: 'ok'
    now: string
  }
}

export type AdminPoliciesData = {
  actorRole: Exclude<AdminUserRole, 'user'>
  canAssignAdmin: boolean
  canManageAdmins: boolean
  operatorScope: 'all-backend-users' | 'users-only'
  selfProtection: {
    keepCurrentAdminAccess: boolean
    keepCurrentSessionOnBulkRevoke: boolean
  }
}

export type AdminAuditLogRecord = {
  id: string
  actorUserId: string
  actorRole: AdminActorRole
  actorEmail?: string
  actorNickname?: string
  action: string
  targetType: string
  targetId: string
  payload: unknown
  ip?: string
  requestId?: string
  createdAt: string
}

export type AdminManagedProviderRecord = {
  id: string
  name: string
  description?: string
  apiUrl: string
  apiKey: string
  models: string[]
  defaultModel: string
  enabled: boolean
  updatedAt: string
}

type AdminUsersQuery = AdminListQuery & {
  role?: AdminUserRole
}

type AdminTasksQuery = AdminListQuery & {
  status?: AdminTaskStatus
}

type AdminAuditQuery = AdminListQuery & {
  actorRole?: AdminActorRole
  action?: string
  targetType?: string
}

function withSearchParams(path: string, query?: Record<string, string | number | undefined>) {
  if (!query) return path

  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    params.set(key, String(value))
  })

  const nextQuery = params.toString()
  return nextQuery ? `${path}?${nextQuery}` : path
}

export async function fetchAdminDashboard() {
  return apiRequest<AdminDashboardData>('/api/admin/dashboard')
}

export async function fetchAdminUsers(query?: AdminUsersQuery) {
  return apiRequest<PaginatedResponse<AdminUserRecord>>(withSearchParams('/api/admin/users', query))
}

export async function fetchAdminWorks(query?: AdminListQuery) {
  return apiRequest<PaginatedResponse<AdminWorkRecord>>(withSearchParams('/api/admin/works', query))
}

export async function fetchAdminTasks(query?: AdminTasksQuery) {
  return apiRequest<PaginatedResponse<AdminGenerationTaskRecord>>(
    withSearchParams('/api/admin/tasks', query),
  )
}

export async function fetchAdminPolicies() {
  return apiRequest<AdminPoliciesData>('/api/admin/policies')
}

export async function fetchAdminProviders() {
  return apiRequest<{ items: AdminManagedProviderRecord[] }>('/api/admin/providers')
}

export async function fetchAdminAuditLogs(query?: AdminAuditQuery) {
  return apiRequest<PaginatedResponse<AdminAuditLogRecord>>(
    withSearchParams('/api/admin/audit', query),
  )
}

export async function fetchAdminUserById(id: string) {
  return apiRequest<AdminUserRecord>(`/api/admin/users/${id}`)
}

export async function fetchAdminTaskById(id: string) {
  return apiRequest<AdminGenerationTaskRecord>(`/api/admin/tasks/${id}`)
}

export async function fetchAdminWorkById(id: string) {
  return apiRequest<AdminWorkRecord>(`/api/admin/works/${id}`)
}

export async function upsertAdminProvider(
  id: string,
  payload: Omit<AdminManagedProviderRecord, 'id' | 'updatedAt'>,
) {
  return apiRequest<AdminManagedProviderRecord>(`/api/admin/providers/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteAdminProvider(id: string) {
  return apiRequest<{ success: true }>(`/api/admin/providers/${id}`, {
    method: 'DELETE',
  })
}

export async function cancelAdminTask(id: string) {
  return apiRequest<AdminGenerationTaskRecord>(`/api/admin/tasks/${id}/cancel`, {
    method: 'POST',
  })
}

export async function cancelAdminTasksBulk(taskIds: string[]) {
  return apiRequest<{
    success: true
    processedCount: number
    succeeded: Array<{ id: string }>
    skipped: Array<{ id: string; reason: string }>
  }>('/api/admin/tasks/cancel-bulk', {
    method: 'POST',
    body: { taskIds },
  })
}

export async function deleteAdminWork(id: string) {
  return apiRequest<{ success: true }>(`/api/admin/works/${id}`, {
    method: 'DELETE',
  })
}

export async function deleteAdminWorksBulk(workIds: string[]) {
  return apiRequest<{
    success: true
    processedCount: number
    deletedCount: number
    succeeded: Array<{ id: string }>
    skipped: Array<{ id: string; reason: string }>
  }>('/api/admin/works/delete-bulk', {
    method: 'POST',
    body: { workIds },
  })
}

export async function revokeAdminUserSessionsBulk(userIds: string[]) {
  return apiRequest<{
    success: true
    processedCount: number
    revokedCount: number
    succeeded: Array<{ id: string; revoked: number }>
    skipped: Array<{ id: string; reason: string }>
  }>('/api/admin/users/revoke-sessions-bulk', {
    method: 'POST',
    body: { userIds },
  })
}
