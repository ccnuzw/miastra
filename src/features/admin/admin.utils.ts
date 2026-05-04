import type { AdminAuditLogRecord, AdminTaskStatus, AdminUserRole } from './admin.api'

export const adminRoleLabels: Record<AdminUserRole, string> = {
  user: '普通用户',
  operator: '运营',
  admin: '管理员',
}

export const adminTaskStatusLabels: Record<AdminTaskStatus, string> = {
  pending: '待处理',
  queued: '排队中',
  running: '执行中',
  succeeded: '已成功',
  failed: '已失败',
  cancelled: '已取消',
  timeout: '已超时',
}

export function formatAdminDateTime(value?: string | number | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export function formatAuditPayload(payload: AdminAuditLogRecord['payload']) {
  if (!payload || typeof payload !== 'object') return '无附加信息'

  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return '附加信息解析失败'
  }
}

export function isTaskCancellable(status: AdminTaskStatus) {
  return !['succeeded', 'failed', 'cancelled', 'timeout'].includes(status)
}

export function taskStatusTone(status: AdminTaskStatus) {
  if (status === 'succeeded') return 'border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan'
  if (status === 'running' || status === 'queued' || status === 'pending')
    return 'border-amber-400/30 bg-amber-400/10 text-amber-200'
  return 'border-signal-coral/30 bg-signal-coral/10 text-signal-coral'
}

export function roleTone(role: AdminUserRole) {
  if (role === 'admin') return 'border-signal-coral/30 bg-signal-coral/10 text-signal-coral'
  if (role === 'operator') return 'border-amber-400/30 bg-amber-400/10 text-amber-200'
  return 'border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan'
}

export function parsePositivePage(value: string | null, fallback = 1) {
  const next = Number(value)
  return Number.isInteger(next) && next > 0 ? next : fallback
}
