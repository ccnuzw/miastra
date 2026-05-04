import { apiRequest } from '@/shared/http/client'

export type AdminActorRole = 'user' | 'operator' | 'admin'
export type AdminUserRole = 'user' | 'operator' | 'admin'
export type AdminUserStatus = 'active' | 'frozen' | 'disabled'
export type AdminUserLoginState = 'recent-7d' | 'inactive-30d' | 'never'
export type AdminTaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'timeout'

export type AdminTaskListView = 'current' | 'history'

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
  canUpdateStatus: boolean
  canAdjustQuota: boolean
  canRevokeSessions: boolean
  canUpdateProviderPolicy: boolean
  canAddNotes: boolean
  canTriggerPasswordReset: boolean
  assignableRoles: AdminUserRole[]
  reason?: string
}

export type AdminUserProviderPolicy = {
  allowManagedProviders: boolean
  allowCustomProvider: boolean
  allowedManagedProviderIds: string[]
  allowedModels: string[]
}

export type AdminUserQuotaProfile = {
  userId: string
  planName: string
  quotaTotal: number
  quotaUsed: number
  quotaRemaining: number
  renewsAt?: string | null
  updatedAt: string
}

export type AdminUserRecord = {
  id: string
  email: string
  nickname: string
  role: AdminUserRole
  status: AdminUserStatus
  statusReason?: string | null
  statusUpdatedAt?: string | null
  statusUpdatedBy?: string | null
  createdAt: string
  updatedAt: string
  lastLoginAt?: string | null
  activeSessionCount: number
  workCount: number
  taskCount: number
  quotaProfile?: AdminUserQuotaProfile | null
  providerPolicy: AdminUserProviderPolicy
  recentTasks?: AdminGenerationTaskRecord[]
  recentAuditLogs?: AdminAuditLogRecord[]
  recentWorks?: AdminWorkRecord[]
  recentNotes?: AdminAuditLogRecord[]
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
  assetId?: string
  assetStorage?: string
  assetSyncStatus?: 'synced' | 'pending-sync' | 'local-only'
  assetRemoteKey?: string
  assetRemoteUrl?: string
  assetUpdatedAt?: number
}

export type AdminGenerationTaskRecord = {
  id: string
  userId: string
  userEmail?: string
  userNickname?: string
  status: AdminTaskStatus
  batchId?: string
  drawIndex?: number
  variation?: string
  retryAttempt: number
  rootTaskId: string
  parentTaskId?: string
  retryable: boolean
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
    tracking?: {
      rootTaskId: string
      parentTaskId?: string
      retryAttempt: number
      recoverySource?: 'manual'
    }
    draw?: {
      count: number
      strategy: 'linear' | 'smart' | 'turbo'
      concurrency: number
      delayMs: number
      retries: number
      timeoutSec: number
      safeMode: boolean
      variationStrength: 'low' | 'medium' | 'high'
      dimensions: string[]
      batchId: string
      batchSnapshotId?: string
      drawIndex: number
      variation: string
    }
  }
  result?: {
    workId?: string
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
    providerHealth: {
      total: number
      enabled: number
      disabled: number
      missingApiKey: number
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

export type AdminManagedProviderTestResult = {
  ok: boolean
  summary: string
  detail?: string
  availableModels?: string[]
}

export type AdminAssetStorageMode = 'inline' | 'passthrough' | 'managed'
export type AdminAssetStorageProvider = 's3' | 'oss' | 'cos' | 'r2' | 'minio'

export type AdminAssetStorageConfig = {
  mode: AdminAssetStorageMode
  provider: AdminAssetStorageProvider
  endpoint: string
  bucket: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  publicBaseUrl?: string
  keyPrefix?: string
  forcePathStyle: boolean
  inlineMaxBytes: number
  updatedAt: string
}

export type AdminAssetStorageTestResult = {
  ok: boolean
  summary: string
  detail?: string
}

type AdminUsersQuery = AdminListQuery & {
  role?: AdminUserRole
  status?: AdminUserStatus
  loginState?: AdminUserLoginState
}

export type AdminWorksQuery = AdminListQuery & {
  userId?: string
}

type AdminTasksQuery = AdminListQuery & {
  status?: AdminTaskStatus
  view?: AdminTaskListView
  userId?: string
}

type AdminAuditQuery = AdminListQuery & {
  actorRole?: AdminActorRole
  action?: string
  targetType?: string
  targetId?: string
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

export async function fetchAdminWorks(query?: AdminWorksQuery) {
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

export async function fetchAdminAssetStorageConfig() {
  return apiRequest<AdminAssetStorageConfig>('/api/admin/asset-storage')
}

export async function upsertAdminAssetStorageConfig(
  payload: Omit<AdminAssetStorageConfig, 'updatedAt'>,
) {
  return apiRequest<AdminAssetStorageConfig>('/api/admin/asset-storage', {
    method: 'PUT',
    body: payload,
  })
}

export async function testAdminAssetStorage(payload: Omit<AdminAssetStorageConfig, 'updatedAt'>) {
  return apiRequest<AdminAssetStorageTestResult>('/api/admin/asset-storage/test', {
    method: 'POST',
    body: payload,
  })
}

export async function fetchAdminAuditLogs(query?: AdminAuditQuery) {
  return apiRequest<PaginatedResponse<AdminAuditLogRecord>>(
    withSearchParams('/api/admin/audit', query),
  )
}

export async function fetchAdminUserById(id: string) {
  return apiRequest<AdminUserRecord>(`/api/admin/users/${id}`)
}

export async function updateAdminUserStatus(
  id: string,
  payload: { status: AdminUserStatus; reason?: string },
) {
  return apiRequest<AdminUserRecord>(`/api/admin/users/${id}/status`, {
    method: 'POST',
    body: payload,
  })
}

export async function updateAdminUsersStatusBulk(
  payload: { userIds: string[]; status: AdminUserStatus; reason?: string },
) {
  return apiRequest<{
    success: true
    processedCount: number
    updatedCount: number
    revokedCount: number
    succeeded: Array<{ id: string; status: AdminUserStatus }>
    skipped: Array<{ id: string; reason: string }>
  }>('/api/admin/users/status-bulk', {
    method: 'POST',
    body: payload,
  })
}

export async function adjustAdminUserQuota(id: string, payload: { delta: number; reason: string }) {
  return apiRequest<AdminUserRecord>(`/api/admin/users/${id}/quota-adjustments`, {
    method: 'POST',
    body: payload,
  })
}

export async function updateAdminUserProviderPolicy(
  id: string,
  payload: AdminUserProviderPolicy,
) {
  return apiRequest<AdminUserRecord>(`/api/admin/users/${id}/provider-policy`, {
    method: 'POST',
    body: payload,
  })
}

export async function createAdminUserNote(id: string, payload: { content: string }) {
  return apiRequest<AdminUserRecord>(`/api/admin/users/${id}/notes`, {
    method: 'POST',
    body: payload,
  })
}

export async function createAdminUserPasswordReset(id: string) {
  return apiRequest<{
    success: true
    token: string
    expiresAt: string
    resetPath: string
  }>(`/api/admin/users/${id}/password-reset`, {
    method: 'POST',
  })
}

export async function fetchAdminTaskById(id: string) {
  return apiRequest<AdminGenerationTaskRecord>(`/api/admin/tasks/${id}`)
}

export async function fetchAdminTaskAttempts(id: string) {
  return apiRequest<AdminGenerationTaskRecord[]>(`/api/admin/tasks/${id}/attempts`)
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

export async function testAdminProvider(payload: {
  apiUrl: string
  apiKey: string
  model?: string
  mode: 'connection' | 'model'
}) {
  return apiRequest<AdminManagedProviderTestResult>('/api/admin/providers/test', {
    method: 'POST',
    body: payload,
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

export async function retryAdminWorkAsset(id: string) {
  return apiRequest<AdminWorkRecord>(`/api/admin/works/${id}/retry-asset`, {
    method: 'POST',
  })
}

export async function retryAdminWorksAssetBulk(workIds: string[]) {
  return apiRequest<{
    success: true
    processedCount: number
    succeeded: Array<{ id: string; status?: string }>
    skipped: Array<{ id: string; reason: string }>
  }>('/api/admin/works/retry-asset-bulk', {
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
