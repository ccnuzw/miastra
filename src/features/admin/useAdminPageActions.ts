import { useState } from 'react'
import { apiRequest } from '@/shared/http/client'
import type { AdminUserRecord } from './admin.api'

type UseAdminPageActionsOptions = {
  roleDrafts: Record<string, AdminUserRecord['role']>
  refresh: () => Promise<void>
  setError: (value: string) => void
  setMessage: (value: string) => void
}

async function updateUserRole(id: string, role: 'user' | 'operator' | 'admin') {
  return apiRequest<AdminUserRecord>('/api/admin/users/' + id + '/role', {
    method: 'POST',
    body: { role },
  })
}

async function revokeUserSessions(id: string) {
  return apiRequest<{ success: true; revoked: number }>('/api/admin/users/' + id + '/revoke-sessions', {
    method: 'POST',
  })
}

async function revokeSession(id: string) {
  return apiRequest<{ success: true }>('/api/auth/sessions/' + id + '/revoke', { method: 'POST' })
}

async function revokeOtherSessions() {
  return apiRequest<{ success: true }>('/api/auth/sessions/revoke-others', { method: 'POST' })
}

export function useAdminPageActions({ roleDrafts, refresh, setError, setMessage }: UseAdminPageActionsOptions) {
  const [busyId, setBusyId] = useState('')

  async function handleSaveRole(userId: string) {
    const role = roleDrafts[userId]
    if (!role) return
    setBusyId(userId)
    setMessage('')
    setError('')
    try {
      await updateUserRole(userId, role)
      setMessage('用户角色已更新。')
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusyId('')
    }
  }

  async function handleRevokeSessions(userId: string) {
    if (!window.confirm('确定要撤销该用户的全部会话吗？')) return
    setBusyId('sessions:' + userId)
    setMessage('')
    setError('')
    try {
      await revokeUserSessions(userId)
      setMessage('用户会话已撤销。')
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusyId('')
    }
  }

  async function handleRevokeMySession(id: string) {
    if (!window.confirm('确定要撤销这个会话吗？')) return
    setBusyId('my:' + id)
    setMessage('')
    setError('')
    try {
      await revokeSession(id)
      setMessage('会话已撤销。')
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusyId('')
    }
  }

  async function handleRevokeOtherSessions() {
    if (!window.confirm('确定要撤销除当前会话外的所有会话吗？')) return
    setBusyId('others')
    setMessage('')
    setError('')
    try {
      await revokeOtherSessions()
      setMessage('其他会话已撤销。')
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setBusyId('')
    }
  }

  return {
    busyId,
    handleSaveRole,
    handleRevokeSessions,
    handleRevokeMySession,
    handleRevokeOtherSessions,
  }
}
