import { useState } from 'react'
import { apiRequest } from '@/shared/http/client'
import type { AdminConfirmOptions } from './AdminConfirmDialog'
import {
  type AdminUserProviderPolicy,
  type AdminUserRecord,
  adjustAdminUserQuota,
  createAdminUserNote,
  createAdminUserPasswordReset,
  updateAdminUserProviderPolicy,
  updateAdminUsersStatusBulk,
  updateAdminUserStatus,
} from './admin.api'

type UseAdminPageActionsOptions = {
  roleDrafts: Record<string, AdminUserRecord['role']>
  refresh: () => Promise<void>
  setError: (value: unknown) => void
  setMessage: (value: string) => void
  confirm?: (options: AdminConfirmOptions) => Promise<boolean>
  onUserUpdated?: (user: AdminUserRecord) => void
}

async function updateUserRole(id: string, role: 'user' | 'operator' | 'admin') {
  return apiRequest<AdminUserRecord>(`/api/admin/users/${id}/role`, {
    method: 'POST',
    body: { role },
  })
}

async function revokeUserSessions(id: string) {
  return apiRequest<{ success: true; revoked: number }>(`/api/admin/users/${id}/revoke-sessions`, {
    method: 'POST',
  })
}

async function revokeSession(id: string) {
  return apiRequest<{ success: true }>(`/api/auth/sessions/${id}/revoke`, { method: 'POST' })
}

async function revokeOtherSessions() {
  return apiRequest<{ success: true }>('/api/auth/sessions/revoke-others', { method: 'POST' })
}

export function useAdminPageActions({
  roleDrafts,
  refresh,
  setError,
  setMessage,
  confirm,
  onUserUpdated,
}: UseAdminPageActionsOptions) {
  const [busyId, setBusyId] = useState('')

  async function handleSaveRole(userId: string) {
    const role = roleDrafts[userId]
    if (!role) return
    setBusyId(userId)
    setMessage('')
    setError(null)
    try {
      const updated = await updateUserRole(userId, role)
      onUserUpdated?.(updated)
      setMessage('用户角色已更新。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleUpdateStatus(
    userId: string,
    payload: { status: AdminUserRecord['status']; reason?: string },
  ) {
    setBusyId(`status:${userId}`)
    setMessage('')
    setError(null)
    try {
      const updated = await updateAdminUserStatus(userId, payload)
      onUserUpdated?.(updated)
      setMessage('用户状态已更新。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleAdjustQuota(userId: string, payload: { delta: number; reason: string }) {
    setBusyId(`quota:${userId}`)
    setMessage('')
    setError(null)
    try {
      const updated = await adjustAdminUserQuota(userId, payload)
      onUserUpdated?.(updated)
      setMessage('用户额度已更新。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleUpdateProviderPolicy(userId: string, payload: AdminUserProviderPolicy) {
    setBusyId(`provider:${userId}`)
    setMessage('')
    setError(null)
    try {
      const updated = await updateAdminUserProviderPolicy(userId, payload)
      onUserUpdated?.(updated)
      setMessage('用户 Provider 权限已更新。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleAddNote(userId: string, content: string) {
    setBusyId(`note:${userId}`)
    setMessage('')
    setError(null)
    try {
      const updated = await createAdminUserNote(userId, { content })
      onUserUpdated?.(updated)
      setMessage('管理员备注已保存。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleCreatePasswordReset(userId: string) {
    setBusyId(`password-reset:${userId}`)
    setMessage('')
    setError(null)
    try {
      return await createAdminUserPasswordReset(userId)
    } catch (nextError) {
      setError(nextError)
      return null
    } finally {
      setBusyId('')
    }
  }

  async function handleBulkUpdateStatus(payload: {
    userIds: string[]
    status: AdminUserRecord['status']
    reason?: string
  }) {
    setBusyId('status-bulk')
    setMessage('')
    setError(null)
    try {
      const result = await updateAdminUsersStatusBulk(payload)
      await refresh()
      return result
    } catch (nextError) {
      setError(nextError)
      return null
    } finally {
      setBusyId('')
    }
  }

  async function handleRevokeSessions(userId: string) {
    if (confirm) {
      const approved = await confirm({
        title: '撤销用户全部会话',
        description: '该用户当前所有会话都会失效，正在登录的设备会被强制退出。',
        confirmLabel: '确认撤销',
        details: `目标用户 ID：${userId}`,
      })
      if (!approved) return
    } else if (!window.confirm('确定要撤销该用户的全部会话吗？')) return

    setBusyId(`sessions:${userId}`)
    setMessage('')
    setError(null)
    try {
      await revokeUserSessions(userId)
      setMessage('用户会话已撤销。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleRevokeMySession(id: string) {
    if (confirm) {
      const approved = await confirm({
        title: '撤销当前会话记录',
        description: '该会话将立即失效，相关设备需要重新登录。',
        confirmLabel: '确认撤销',
        details: `会话 ID：${id}`,
      })
      if (!approved) return
    } else if (!window.confirm('确定要撤销这个会话吗？')) return

    setBusyId(`my:${id}`)
    setMessage('')
    setError(null)
    try {
      await revokeSession(id)
      setMessage('会话已撤销。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleRevokeOtherSessions() {
    if (confirm) {
      const approved = await confirm({
        title: '撤销其他全部会话',
        description: '除当前设备外，账号在其他设备上的登录态都会被清除。',
        confirmLabel: '确认撤销',
      })
      if (!approved) return
    } else if (!window.confirm('确定要撤销除当前会话外的所有会话吗？')) return

    setBusyId('others')
    setMessage('')
    setError(null)
    try {
      await revokeOtherSessions()
      setMessage('其他会话已撤销。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  return {
    busyId,
    handleSaveRole,
    handleUpdateStatus,
    handleAdjustQuota,
    handleUpdateProviderPolicy,
    handleAddNote,
    handleCreatePasswordReset,
    handleBulkUpdateStatus,
    handleRevokeSessions,
    handleRevokeMySession,
    handleRevokeOtherSessions,
  }
}
