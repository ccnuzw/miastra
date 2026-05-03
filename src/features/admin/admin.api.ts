import { apiRequest } from '@/shared/http/client'

export type AdminUserManagement = {
  isSelf: boolean
  canChangeRole: boolean
  canRevokeSessions: boolean
  assignableRoles: Array<'user' | 'operator' | 'admin'>
  reason?: string
}

export type AdminUserRecord = {
  id: string
  email: string
  nickname: string
  role: 'user' | 'operator' | 'admin'
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
  createdAt?: number
  snapshotId?: string
}

export type AdminGenerationTaskRecord = {
  id: string
  userId: string
  userEmail?: string
  userNickname?: string
  status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timeout'
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
      role: 'user' | 'operator' | 'admin'
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
    createdAt: string
  }>
  system: {
    status: 'ok'
    now: string
  }
}

export type AdminPoliciesData = {
  actorRole: 'operator' | 'admin'
  canAssignAdmin: boolean
  canManageAdmins: boolean
  operatorScope: 'all-backend-users' | 'users-only'
  selfProtection: {
    keepCurrentAdminAccess: boolean
    keepCurrentSessionOnBulkRevoke: boolean
  }
}

export async function fetchAdminDashboard() {
  return apiRequest<AdminDashboardData>('/api/admin/dashboard')
}

export async function fetchAdminUsers() {
  return apiRequest<{ items: AdminUserRecord[] }>('/api/admin/users')
}

export async function fetchAdminWorks() {
  return apiRequest<{ items: AdminWorkRecord[] }>('/api/admin/works')
}

export async function fetchAdminTasks() {
  return apiRequest<{ items: AdminGenerationTaskRecord[] }>('/api/admin/tasks')
}

export async function fetchAdminPolicies() {
  return apiRequest<AdminPoliciesData>('/api/admin/policies')
}
