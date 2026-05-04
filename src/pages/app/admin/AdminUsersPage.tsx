import { Copy, Eye, RotateCcw, UserX } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { type AdminActiveFilterItem, AdminActiveFilters } from '@/features/admin/AdminActiveFilters'
import { useAdminConfirm } from '@/features/admin/AdminConfirmDialog'
import { AdminDetailDrawer } from '@/features/admin/AdminDetailDrawer'
import { AdminFilterPresets } from '@/features/admin/AdminFilterPresets'
import { AdminPageHeader } from '@/features/admin/AdminPageHeader'
import { AdminPagination } from '@/features/admin/AdminPagination'
import { AdminSelectionBar } from '@/features/admin/AdminSelectionBar'
import {
  type AdminGenerationTaskRecord,
  type AdminManagedProviderRecord,
  type AdminUserLoginState,
  type AdminUserProviderPolicy,
  type AdminUserRecord,
  type AdminUserStatus,
  fetchAdminUserById,
  fetchAdminProviders,
  fetchAdminUsers,
  revokeAdminUserSessionsBulk,
} from '@/features/admin/admin.api'
import {
  adminRoleLabels,
  adminTaskStatusLabels,
  adminUserStatusLabels,
  formatAuditPayload,
  formatAdminDateTime,
  parsePositivePage,
  roleTone,
  taskStatusTone,
  userStatusTone,
} from '@/features/admin/admin.utils'
import { useAdminPageActions } from '@/features/admin/useAdminPageActions'
import { useAdminSearchParams } from '@/features/admin/useAdminSearchParams'
import { useAdminSelection } from '@/features/admin/useAdminSelection'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

const allRoles: Array<AdminUserRecord['role'] | ''> = ['', 'user', 'operator', 'admin']
const allStatuses: Array<AdminUserStatus | ''> = ['', 'active', 'frozen', 'disabled']
const loginStateLabels: Record<AdminUserLoginState, string> = {
  'recent-7d': '7 天内登录',
  'inactive-30d': '30 天未登录',
  never: '从未登录',
}
const loginStateOptions: Array<AdminUserLoginState | ''> = [
  '',
  'recent-7d',
  'inactive-30d',
  'never',
]

function stringifyPolicyList(values: string[]) {
  return values.join('\n')
}

function parsePolicyList(value: string) {
  return Array.from(new Set(value.split(/[\n,，]/).map((item) => item.trim()).filter(Boolean)))
}

export function AdminUsersPage() {
  const { searchParams, updateSearchParams } = useAdminSearchParams()
  const page = parsePositivePage(searchParams.get('page'))
  const preset = searchParams.get('preset') ?? ''
  const appliedQuery = searchParams.get('query') ?? ''
  const roleFilter = (searchParams.get('role') as AdminUserRecord['role'] | '') || ''
  const statusFilter = (searchParams.get('status') as AdminUserStatus | '') || ''
  const loginStateFilter = (searchParams.get('loginState') as AdminUserLoginState | '') || ''
  const selectedUserId = searchParams.get('selected') ?? ''

  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchInput, setSearchInput] = useState(appliedQuery)
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AdminUserRecord['role']>>({})
  const [managedProviders, setManagedProviders] = useState<AdminManagedProviderRecord[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null)
  const [statusDraft, setStatusDraft] = useState<AdminUserStatus>('active')
  const [statusReasonDraft, setStatusReasonDraft] = useState('')
  const [quotaDeltaDraft, setQuotaDeltaDraft] = useState('')
  const [quotaReasonDraft, setQuotaReasonDraft] = useState('')
  const [providerPolicyDraft, setProviderPolicyDraft] = useState<AdminUserProviderPolicy>({
    allowManagedProviders: true,
    allowCustomProvider: true,
    allowedManagedProviderIds: [],
    allowedModels: [],
  })
  const [allowedModelsDraft, setAllowedModelsDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [bulkStatusDraft, setBulkStatusDraft] = useState<AdminUserStatus>('frozen')
  const [bulkStatusReasonDraft, setBulkStatusReasonDraft] = useState('')
  const [passwordResetResult, setPasswordResetResult] = useState<{
    token: string
    expiresAt: string
    resetPath: string
  } | null>(null)
  const [recentTaskFilter, setRecentTaskFilter] = useState<'' | 'running' | 'failed'>('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const selection = useAdminSelection()
  const { confirm, confirmDialog } = useAdminConfirm()

  useEffect(() => {
    setSearchInput(appliedQuery)
  }, [appliedQuery])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminUsers({
        page,
        limit: 12,
        query: appliedQuery || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        loginState: loginStateFilter || undefined,
      })
      setUsers(result.items)
      setTotal(result.total)
      setTotalPages(result.totalPages)
      setRoleDrafts((current) => ({
        ...Object.fromEntries(result.items.map((item) => [item.id, item.role])),
        ...current,
      }))
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [appliedQuery, loginStateFilter, page, roleFilter, statusFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void fetchAdminProviders()
      .then((result) => setManagedProviders(result.items))
      .catch((nextError) => setError(nextError))
  }, [])

  const syncSelectedUserState = useCallback((user: AdminUserRecord) => {
    setSelectedUser(user)
    setRoleDrafts((current) => ({ ...current, [user.id]: user.role }))
    setStatusDraft(user.status)
    setStatusReasonDraft(user.statusReason ?? '')
    setProviderPolicyDraft(user.providerPolicy)
    setAllowedModelsDraft(stringifyPolicyList(user.providerPolicy.allowedModels))
    setNoteDraft('')
    setPasswordResetResult(null)
  }, [])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null)
      setStatusDraft('active')
      setStatusReasonDraft('')
      setQuotaDeltaDraft('')
      setQuotaReasonDraft('')
      setProviderPolicyDraft({
        allowManagedProviders: true,
        allowCustomProvider: true,
        allowedManagedProviderIds: [],
        allowedModels: [],
      })
      setAllowedModelsDraft('')
      setNoteDraft('')
      setPasswordResetResult(null)
      setRecentTaskFilter('')
      return
    }

    setDetailLoading(true)
    void fetchAdminUserById(selectedUserId)
      .then((detail) => {
        syncSelectedUserState(detail)
      })
      .catch((nextError) => {
        setError(nextError)
      })
      .finally(() => {
        setDetailLoading(false)
      })
  }, [selectedUserId, syncSelectedUserState])

  const {
    busyId,
    handleAddNote,
    handleAdjustQuota,
    handleBulkUpdateStatus,
    handleCreatePasswordReset,
    handleRevokeSessions,
    handleSaveRole,
    handleUpdateProviderPolicy,
    handleUpdateStatus,
  } = useAdminPageActions({
    roleDrafts,
    refresh,
    setError,
    setMessage,
    confirm,
    onUserUpdated: syncSelectedUserState,
  })

  const pageIds = useMemo(() => users.map((item) => item.id), [users])
  const selectedOnPageCount = useMemo(
    () => pageIds.filter((id) => selection.selectedIdSet.has(id)).length,
    [pageIds, selection.selectedIdSet],
  )
  const allSelectedOnPage = pageIds.length > 0 && selectedOnPageCount === pageIds.length

  const userSummary = useMemo(() => {
    const roleCounts = users.reduce<Record<AdminUserRecord['role'], number>>(
      (accumulator, item) => {
        accumulator[item.role] += 1
        return accumulator
      },
      { user: 0, operator: 0, admin: 0 },
    )
    const statusCounts = users.reduce<Record<AdminUserStatus, number>>(
      (accumulator, item) => {
        accumulator[item.status] += 1
        return accumulator
      },
      { active: 0, frozen: 0, disabled: 0 },
    )

    return {
      currentPage: users.length,
      roleCounts,
      statusCounts,
      activeSessions: users.reduce((sum, item) => sum + item.activeSessionCount, 0),
      remainingQuota: users.reduce(
        (sum, item) => sum + (item.quotaProfile?.quotaRemaining ?? 0),
        0,
      ),
    }
  }, [users])

  const userPresets = useMemo(
    () => [
      {
        key: 'all',
        label: '全部用户',
        active: !preset,
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: undefined,
            role: undefined,
            query: undefined,
            status: undefined,
            loginState: undefined,
            selected: undefined,
          }),
      },
      {
        key: 'admins',
        label: '管理员账号',
        active: preset === 'admins',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'admins',
            role: 'admin',
            selected: undefined,
          }),
      },
      {
        key: 'operators',
        label: '运营账号',
        active: preset === 'operators',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'operators',
            role: 'operator',
            selected: undefined,
          }),
      },
      {
        key: 'users',
        label: '普通用户',
        active: preset === 'users',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'users',
            role: 'user',
            selected: undefined,
          }),
      },
    ],
    [preset, updateSearchParams],
  )

  const activeFilters = useMemo(() => {
    const items: Array<AdminActiveFilterItem | null> = [
      appliedQuery
        ? {
            key: 'query',
            label: `关键词：${appliedQuery}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                query: undefined,
                selected: undefined,
              }),
          }
        : null,
      roleFilter
        ? {
            key: 'role',
            label: `角色：${adminRoleLabels[roleFilter]}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                preset: undefined,
                role: undefined,
                selected: undefined,
              }),
          }
        : null,
      statusFilter
        ? {
            key: 'status',
            label: `状态：${adminUserStatusLabels[statusFilter]}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                status: undefined,
                selected: undefined,
              }),
          }
        : null,
      loginStateFilter
        ? {
            key: 'loginState',
            label: `登录：${loginStateLabels[loginStateFilter]}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                loginState: undefined,
                selected: undefined,
              }),
          }
        : null,
    ]
    return items.filter((item): item is AdminActiveFilterItem => item !== null)
  }, [appliedQuery, loginStateFilter, roleFilter, statusFilter, updateSearchParams])

  const recentTasks = useMemo(() => {
    const tasks = selectedUser?.recentTasks ?? []
    if (!recentTaskFilter) return tasks
    return tasks.filter((task) => task.status === recentTaskFilter)
  }, [recentTaskFilter, selectedUser?.recentTasks])

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSearchParams({
      page: '1',
      preset: undefined,
      query: searchInput.trim() || undefined,
      selected: undefined,
    })
  }

  async function handleBulkRevoke() {
    if (!selection.selectedIds.length) return
    const approved = await confirm({
      title: '批量撤销用户会话',
      description: '选中的用户会被批量强制下线，正在登录的设备会立即失效。',
      confirmLabel: '确认批量撤销',
      details: `本次将处理 ${selection.selectedIds.length} 个用户。`,
    })
    if (!approved) return

    setBulkBusy(true)
    setError(null)
    setMessage('')
    try {
      const result = await revokeAdminUserSessionsBulk(selection.selectedIds)
      selection.clearSelection()
      setMessage(
        `已处理 ${result.processedCount} 个用户，成功 ${result.succeeded.length} 个，撤销 ${result.revokedCount} 个会话。`,
      )
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBulkBusy(false)
    }
  }

  async function handleBulkStatusUpdate() {
    if (!selection.selectedIds.length) return
    const reason = bulkStatusReasonDraft.trim()
    if (bulkStatusDraft !== 'active' && !reason) {
      setError(new Error('批量冻结或禁用时必须填写原因'))
      return
    }

    const approved = await confirm({
      title: '批量更新用户状态',
      description:
        bulkStatusDraft === 'active'
          ? '选中的用户会恢复正常状态。'
          : '选中的用户会被批量强制下线，并禁止继续登录。',
      confirmLabel: '确认批量更新',
      details: `目标状态：${adminUserStatusLabels[bulkStatusDraft]}，处理 ${selection.selectedIds.length} 名用户。`,
    })
    if (!approved) return

    const result = await handleBulkUpdateStatus({
      userIds: selection.selectedIds,
      status: bulkStatusDraft,
      reason: reason || undefined,
    })
    if (!result) return
    selection.clearSelection()
    setMessage(
      `已处理 ${result.processedCount} 名用户，成功更新 ${result.updatedCount} 名，撤销 ${result.revokedCount} 个会话。`,
    )
    setBulkStatusReasonDraft('')
  }

  async function submitStatusUpdate() {
    if (!selectedUser) return
    const reason = statusReasonDraft.trim()
    if (statusDraft !== 'active' && !reason) {
      setError(new Error('冻结或禁用用户时必须填写原因'))
      return
    }

    const approved = await confirm({
      title: '更新用户状态',
      description:
        statusDraft === 'active'
          ? '恢复正常后，用户可重新登录和发起任务。'
          : '冻结或禁用后，该用户会被立即强制下线并禁止继续登录。',
      confirmLabel: '确认更新',
      details: `目标状态：${adminUserStatusLabels[statusDraft]}`,
    })
    if (!approved) return

    await handleUpdateStatus(selectedUser.id, {
      status: statusDraft,
      reason: reason || undefined,
    })
  }

  async function submitQuotaAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedUser) return

    const delta = Number(quotaDeltaDraft)
    if (!Number.isInteger(delta) || delta === 0) {
      setError(new Error('请输入非 0 的整数额度变更值'))
      return
    }
    const reason = quotaReasonDraft.trim()
    if (!reason) {
      setError(new Error('请填写额度调整原因'))
      return
    }

    const approved = await confirm({
      title: '调整用户额度',
      description: delta > 0 ? '这次会给用户补发额度。' : '这次会扣减用户可用额度。',
      confirmLabel: '确认调整',
      details: `变更值：${delta > 0 ? `+${delta}` : delta}`,
    })
    if (!approved) return

    await handleAdjustQuota(selectedUser.id, { delta, reason })
    setQuotaDeltaDraft('')
    setQuotaReasonDraft('')
  }

  async function submitProviderPolicyUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedUser) return

    const nextPolicy: AdminUserProviderPolicy = {
      ...providerPolicyDraft,
      allowedModels: parsePolicyList(allowedModelsDraft),
    }

    const approved = await confirm({
      title: '更新 Provider 权限',
      description: '保存后，新的 Provider 与模型权限会立即作用于这个用户。',
      confirmLabel: '确认保存',
      details: `公共 Provider：${nextPolicy.allowManagedProviders ? '允许' : '禁止'}，自定义 Provider：${nextPolicy.allowCustomProvider ? '允许' : '禁止'}`,
    })
    if (!approved) return

    await handleUpdateProviderPolicy(selectedUser.id, nextPolicy)
  }

  async function submitAdminNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedUser) return
    const content = noteDraft.trim()
    if (!content) {
      setError(new Error('请填写备注内容'))
      return
    }
    await handleAddNote(selectedUser.id, content)
    setNoteDraft('')
  }

  async function submitPasswordReset() {
    if (!selectedUser) return
    const approved = await confirm({
      title: '发起密码重置',
      description: '系统会为该用户生成新的重置令牌，并覆盖旧的重置令牌。',
      confirmLabel: '确认生成',
      details: `目标用户：${selectedUser.email}`,
    })
    if (!approved) return

    const result = await handleCreatePasswordReset(selectedUser.id)
    if (!result) return
    setPasswordResetResult(result)
    setMessage('已生成新的密码重置入口。')
  }

  async function handleCopyText(content: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(content)
      setMessage(successMessage)
    } catch (nextError) {
      setError(nextError)
    }
  }

  function renderTaskRow(task: AdminGenerationTaskRecord) {
    return (
      <div
        key={task.id}
        className="rounded-[1.2rem] border border-porcelain-50/10 bg-ink-950/[0.32] p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-porcelain-50">
              {task.payload.title || task.payload.promptText || task.id}
            </p>
            <p className="mt-1 text-xs text-porcelain-100/45">
              {task.payload.model} · {formatAdminDateTime(task.updatedAt)}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] ${taskStatusTone(task.status)}`}
          >
            {adminTaskStatusLabels[task.status]}
          </span>
        </div>
        {task.errorMessage ? (
          <p className="mt-3 text-sm text-signal-coral">{task.errorMessage}</p>
        ) : (
          <p className="mt-3 line-clamp-2 text-sm text-porcelain-100/60">
            {task.payload.promptText || task.payload.meta || '无附加说明'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        eyebrow="Users"
        title="用户管理"
        description="围绕普通用户的状态、额度、任务和操作日志做第一期收敛，先把高频管理动作和排障信息集中到同一处。"
        meta={<span className="status-pill">当前结果：{total} 名用户</span>}
        actions={
          <button
            type="button"
            className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
            onClick={() => void refresh()}
          >
            刷新用户
          </button>
        }
      />

      <AdminFilterPresets presets={userPresets} />

      <AdminSelectionBar
        count={selection.selectedCount}
        label="可批量撤销会话或批量更新这些用户的状态"
        actions={
          <>
            <select
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2 text-sm font-semibold text-porcelain-50"
              value={bulkStatusDraft}
              onChange={(event) => setBulkStatusDraft(event.target.value as AdminUserStatus)}
            >
              {(['frozen', 'disabled', 'active'] as const).map((status) => (
                <option key={status} value={status}>
                  批量设为{adminUserStatusLabels[status]}
                </option>
              ))}
            </select>
            <input
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2 text-sm text-porcelain-50 placeholder:text-porcelain-100/30"
              value={bulkStatusReasonDraft}
              onChange={(event) => setBulkStatusReasonDraft(event.target.value)}
              placeholder="批量状态原因"
            />
            <button
              type="button"
              className="rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-35"
              onClick={() => void handleBulkStatusUpdate()}
              disabled={busyId === 'status-bulk'}
            >
              {busyId === 'status-bulk' ? '处理中…' : '批量更新状态'}
            </button>
            <button
              type="button"
              className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral disabled:opacity-35"
              onClick={() => void handleBulkRevoke()}
              disabled={bulkBusy}
            >
              {bulkBusy ? '处理中…' : '批量撤销会话'}
            </button>
            <button
              type="button"
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2 text-sm font-semibold text-porcelain-50"
              onClick={() => selection.clearSelection()}
            >
              清空选择
            </button>
          </>
        }
      />

      <article className="progress-card">
        <form
          className="grid gap-3 min-[1480px]:grid-cols-[minmax(0,1.35fr)_180px_180px_180px_auto]"
          onSubmit={handleSearchSubmit}
        >
          <label className="field-block">
            <span className="field-label">搜索用户</span>
            <input
              className="input-shell"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="昵称、邮箱"
            />
          </label>

          <label className="field-block">
            <span className="field-label">角色筛选</span>
            <select
              className="input-shell"
              value={roleFilter}
              onChange={(event) =>
                updateSearchParams({
                  page: '1',
                  preset: undefined,
                  role: event.target.value,
                  selected: undefined,
                })
              }
            >
              {allRoles.map((role) => (
                <option key={role || 'all'} value={role}>
                  {role ? adminRoleLabels[role] : '全部角色'}
                </option>
              ))}
            </select>
          </label>

          <label className="field-block">
            <span className="field-label">账号状态</span>
            <select
              className="input-shell"
              value={statusFilter}
              onChange={(event) =>
                updateSearchParams({
                  page: '1',
                  status: event.target.value,
                  selected: undefined,
                })
              }
            >
              {allStatuses.map((status) => (
                <option key={status || 'all'} value={status}>
                  {status ? adminUserStatusLabels[status] : '全部状态'}
                </option>
              ))}
            </select>
          </label>

          <label className="field-block">
            <span className="field-label">登录情况</span>
            <select
              className="input-shell"
              value={loginStateFilter}
              onChange={(event) =>
                updateSearchParams({
                  page: '1',
                  loginState: event.target.value,
                  selected: undefined,
                })
              }
            >
              {loginStateOptions.map((state) => (
                <option key={state || 'all'} value={state}>
                  {state ? loginStateLabels[state] : '全部'}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-toolbar-actions min-[1480px]:justify-end">
            <button
              type="submit"
              className="h-12 rounded-2xl bg-signal-cyan px-4 text-sm font-bold text-ink-950"
            >
              应用筛选
            </button>
            <button
              type="button"
              className="grid h-12 w-12 place-items-center rounded-2xl border border-porcelain-50/10 bg-ink-950/[0.72] text-porcelain-50"
              onClick={() =>
                updateSearchParams({
                  page: '1',
                  query: undefined,
                  role: undefined,
                  status: undefined,
                  loginState: undefined,
                  selected: undefined,
                })
              }
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </form>
      </article>

      {loading ? <p className="text-sm text-porcelain-100/60">正在加载用户列表…</p> : null}
      {error ? <ErrorNotice error={error} /> : null}
      {message ? (
        <p className="rounded-2xl border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-3 text-sm text-signal-cyan">
          {message}
        </p>
      ) : null}

      <AdminActiveFilters
        items={activeFilters}
        onClearAll={
          activeFilters.length
            ? () =>
                updateSearchParams({
                  page: '1',
                  preset: undefined,
                  query: undefined,
                  role: undefined,
                  status: undefined,
                  loginState: undefined,
                  selected: undefined,
                })
            : undefined
        }
      />

      <div className="admin-summary-strip">
        <span className="admin-summary-strong">结果摘要</span>
        <span>当前命中 {total} 名用户</span>
        <span>本页 {userSummary.currentPage} 名</span>
        <span>正常 {userSummary.statusCounts.active} 名</span>
        <span>冻结 {userSummary.statusCounts.frozen} 名</span>
        <span>禁用 {userSummary.statusCounts.disabled} 名</span>
        <span>普通用户 {userSummary.roleCounts.user} 名</span>
        <span>活跃会话 {userSummary.activeSessions} 个</span>
        <span>本页剩余额度 {userSummary.remainingQuota}</span>
        {selection.selectedCount ? <span>已跨页选中 {selection.selectedCount} 项</span> : null}
      </div>

      <section className="admin-table-shell">
        <div className="flex items-center justify-between border-b border-porcelain-50/10 px-4 py-3 text-xs text-porcelain-100/45">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelectedOnPage}
              onChange={(event) => selection.toggleMany(pageIds, event.target.checked)}
            />
            选中当前页
          </label>
          <p>点击“查看”打开详情抽屉，集中处理状态、额度和任务记录。</p>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-12" />
                <th>用户</th>
                <th>状态</th>
                <th>角色</th>
                <th>最近登录</th>
                <th>活跃会话</th>
                <th>剩余额度</th>
                <th>任务</th>
                <th>注册时间</th>
                <th className="w-[180px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={selectedUserId === user.id ? 'admin-table-row-active' : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selection.isSelected(user.id)}
                      onChange={() => selection.toggleSelection(user.id)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => updateSearchParams({ selected: user.id })}
                    >
                      <p className="font-semibold text-porcelain-50">{user.nickname}</p>
                      <p className="mt-1 text-xs text-porcelain-100/45">{user.email}</p>
                    </button>
                  </td>
                  <td>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] ${userStatusTone(user.status)}`}
                    >
                      {adminUserStatusLabels[user.status]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] ${roleTone(user.role)}`}
                    >
                      {adminRoleLabels[user.role]}
                    </span>
                  </td>
                  <td>{formatAdminDateTime(user.lastLoginAt)}</td>
                  <td>{user.activeSessionCount}</td>
                  <td>{user.quotaProfile?.quotaRemaining ?? '—'}</td>
                  <td>{user.taskCount}</td>
                  <td>{formatAdminDateTime(user.createdAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-3 py-2 text-xs font-semibold text-porcelain-50"
                        onClick={() => updateSearchParams({ selected: user.id })}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Eye className="h-3.5 w-3.5" />
                          查看
                        </span>
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs font-semibold text-signal-coral disabled:opacity-35"
                        onClick={() => void handleRevokeSessions(user.id)}
                        disabled={
                          busyId === `sessions:${user.id}` || !user.management.canRevokeSessions
                        }
                      >
                        <span className="inline-flex items-center gap-2">
                          <UserX className="h-3.5 w-3.5" />
                          {busyId === `sessions:${user.id}` ? '处理中…' : '撤销会话'}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!loading && !users.length ? (
        <p className="text-sm text-porcelain-100/60">没有匹配的用户。</p>
      ) : null}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(nextPage) => updateSearchParams({ page: String(nextPage) })}
      />

      <AdminDetailDrawer
        open={Boolean(selectedUserId)}
        title={selectedUser?.nickname || '用户详情'}
        subtitle={selectedUser?.email}
        onClose={() => updateSearchParams({ selected: undefined })}
        actions={
          <>
            <button
              type="button"
              className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-2 text-sm font-semibold text-signal-cyan disabled:opacity-35"
              onClick={() => selectedUserId && void handleSaveRole(selectedUserId)}
              disabled={
                !selectedUser ||
                busyId === selectedUserId ||
                !selectedUser.management.canChangeRole ||
                (roleDrafts[selectedUser.id] ?? selectedUser.role) === selectedUser.role
              }
            >
              {busyId === selectedUserId ? '保存中…' : '保存角色'}
            </button>
            <button
              type="button"
              className="rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 disabled:opacity-35"
              onClick={() => void submitStatusUpdate()}
              disabled={
                !selectedUser ||
                busyId === `status:${selectedUserId}` ||
                !selectedUser.management.canUpdateStatus ||
                (statusDraft === selectedUser.status &&
                  statusReasonDraft.trim() === (selectedUser.statusReason ?? '').trim())
              }
            >
              {busyId === `status:${selectedUserId}` ? '处理中…' : '保存状态'}
            </button>
            <button
              type="button"
              className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral disabled:opacity-35"
              onClick={() => selectedUserId && void handleRevokeSessions(selectedUserId)}
              disabled={
                !selectedUser ||
                busyId === `sessions:${selectedUserId}` ||
                !selectedUser.management.canRevokeSessions
              }
            >
              {busyId === `sessions:${selectedUserId}` ? '处理中…' : '撤销会话'}
            </button>
            <button
              type="button"
              className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2 text-sm font-semibold text-porcelain-50 disabled:opacity-35"
              onClick={() => void submitPasswordReset()}
              disabled={
                !selectedUser ||
                busyId === `password-reset:${selectedUserId}` ||
                !selectedUser.management.canTriggerPasswordReset
              }
            >
              {busyId === `password-reset:${selectedUserId}` ? '生成中…' : '生成重置链接'}
            </button>
          </>
        }
      >
        {detailLoading && !selectedUser ? (
          <p className="text-sm text-porcelain-100/60">正在加载用户详情…</p>
        ) : null}

        {selectedUser ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  最近登录
                </p>
                <p className="mt-2 text-base font-semibold text-porcelain-50">
                  {formatAdminDateTime(selectedUser.lastLoginAt)}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  活跃会话
                </p>
                <p className="mt-2 text-2xl font-semibold text-porcelain-50">
                  {selectedUser.activeSessionCount}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  剩余额度
                </p>
                <p className="mt-2 text-2xl font-semibold text-porcelain-50">
                  {selectedUser.quotaProfile?.quotaRemaining ?? '—'}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">任务数</p>
                <p className="mt-2 text-2xl font-semibold text-porcelain-50">
                  {selectedUser.taskCount}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                    基础信息
                  </p>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] ${userStatusTone(selectedUser.status)}`}
                  >
                    {adminUserStatusLabels[selectedUser.status]}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] ${roleTone(selectedUser.role)}`}
                  >
                    {adminRoleLabels[selectedUser.role]}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-porcelain-100/70">
                  <p>用户 ID：{selectedUser.id}</p>
                  <p>注册时间：{formatAdminDateTime(selectedUser.createdAt)}</p>
                  <p>最近更新：{formatAdminDateTime(selectedUser.updatedAt)}</p>
                  <p>最近登录：{formatAdminDateTime(selectedUser.lastLoginAt)}</p>
                  <p>状态原因：{selectedUser.statusReason || '—'}</p>
                  <p>状态更新时间：{formatAdminDateTime(selectedUser.statusUpdatedAt)}</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <label className="field-block">
                  <span className="field-label">角色调整</span>
                  <select
                    className="input-shell"
                    value={roleDrafts[selectedUser.id] ?? selectedUser.role}
                    onChange={(event) =>
                      setRoleDrafts((current) => ({
                        ...current,
                        [selectedUser.id]: event.target.value as AdminUserRecord['role'],
                      }))
                    }
                    disabled={!selectedUser.management.canChangeRole}
                  >
                    {(['user', 'operator', 'admin'] as const).map((role) => (
                      <option
                        key={role}
                        value={role}
                        disabled={!selectedUser.management.assignableRoles.includes(role)}
                      >
                        {adminRoleLabels[role]}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedUser.management.reason ? (
                  <p className="mt-4 rounded-[1.2rem] border border-amber-400/15 bg-amber-400/10 px-4 py-3 text-xs text-amber-100/80">
                    权限边界：{selectedUser.management.reason}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  状态管理
                </p>
                <div className="mt-4 space-y-4">
                  <label className="field-block">
                    <span className="field-label">用户状态</span>
                    <select
                      className="input-shell"
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value as AdminUserStatus)}
                      disabled={!selectedUser.management.canUpdateStatus}
                    >
                      {(['active', 'frozen', 'disabled'] as const).map((status) => (
                        <option key={status} value={status}>
                          {adminUserStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-block">
                    <span className="field-label">状态原因</span>
                    <textarea
                      className="input-shell min-h-[116px] resize-y"
                      value={statusReasonDraft}
                      onChange={(event) => setStatusReasonDraft(event.target.value)}
                      placeholder="冻结或禁用时必填，恢复正常时可选填写处理备注"
                      disabled={!selectedUser.management.canUpdateStatus}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  额度管理
                </p>
                <div className="mt-3 grid gap-3 text-sm text-porcelain-100/70 sm:grid-cols-2">
                  <p>套餐：{selectedUser.quotaProfile?.planName ?? '默认档案'}</p>
                  <p>总额度：{selectedUser.quotaProfile?.quotaTotal ?? '—'}</p>
                  <p>已使用：{selectedUser.quotaProfile?.quotaUsed ?? '—'}</p>
                  <p>剩余：{selectedUser.quotaProfile?.quotaRemaining ?? '—'}</p>
                  <p>续期：{formatAdminDateTime(selectedUser.quotaProfile?.renewsAt)}</p>
                  <p>最近更新：{formatAdminDateTime(selectedUser.quotaProfile?.updatedAt)}</p>
                </div>
                <form
                  className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]"
                  onSubmit={submitQuotaAdjustment}
                >
                  <label className="field-block">
                    <span className="field-label">变更值</span>
                    <input
                      className="input-shell"
                      value={quotaDeltaDraft}
                      onChange={(event) => setQuotaDeltaDraft(event.target.value)}
                      placeholder="例如 +20 或 -5"
                      disabled={!selectedUser.management.canAdjustQuota}
                    />
                  </label>
                  <label className="field-block">
                    <span className="field-label">调整原因</span>
                    <input
                      className="input-shell"
                      value={quotaReasonDraft}
                      onChange={(event) => setQuotaReasonDraft(event.target.value)}
                      placeholder="例如补偿失败任务、人工扣减测试额度"
                      disabled={!selectedUser.management.canAdjustQuota}
                    />
                  </label>
                  <div className="admin-toolbar-actions sm:items-end sm:justify-end">
                    <button
                      type="submit"
                      className="h-12 rounded-2xl bg-signal-cyan px-4 text-sm font-bold text-ink-950 disabled:opacity-35"
                      disabled={
                        !selectedUser.management.canAdjustQuota ||
                        busyId === `quota:${selectedUser.id}`
                      }
                    >
                      {busyId === `quota:${selectedUser.id}` ? '处理中…' : '调整额度'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <form
                className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4"
                onSubmit={submitProviderPolicyUpdate}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                    Provider / Model 权限
                  </p>
                  <button
                    type="submit"
                    className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-2 text-sm font-semibold text-signal-cyan disabled:opacity-35"
                    disabled={
                      !selectedUser.management.canUpdateProviderPolicy ||
                      busyId === `provider:${selectedUser.id}`
                    }
                  >
                    {busyId === `provider:${selectedUser.id}` ? '保存中…' : '保存权限'}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <label className="flex items-center gap-3 text-sm text-porcelain-50">
                    <input
                      type="checkbox"
                      checked={providerPolicyDraft.allowManagedProviders}
                      onChange={(event) =>
                        setProviderPolicyDraft((current) => ({
                          ...current,
                          allowManagedProviders: event.target.checked,
                        }))
                      }
                      disabled={!selectedUser.management.canUpdateProviderPolicy}
                    />
                    允许公共 Provider
                  </label>
                  <label className="flex items-center gap-3 text-sm text-porcelain-50">
                    <input
                      type="checkbox"
                      checked={providerPolicyDraft.allowCustomProvider}
                      onChange={(event) =>
                        setProviderPolicyDraft((current) => ({
                          ...current,
                          allowCustomProvider: event.target.checked,
                        }))
                      }
                      disabled={!selectedUser.management.canUpdateProviderPolicy}
                    />
                    允许自定义 Provider
                  </label>
                </div>

                <div className="mt-4">
                  <p className="field-label">允许的公共 Provider</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {managedProviders.length ? (
                      managedProviders.map((provider) => {
                        const checked = providerPolicyDraft.allowedManagedProviderIds.includes(
                          provider.id,
                        )
                        return (
                          <label
                            key={provider.id}
                            className="flex items-start gap-3 rounded-[1.1rem] border border-porcelain-50/10 bg-ink-950/[0.32] px-3 py-3 text-sm text-porcelain-100/70"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setProviderPolicyDraft((current) => ({
                                  ...current,
                                  allowedManagedProviderIds: event.target.checked
                                    ? [...current.allowedManagedProviderIds, provider.id]
                                    : current.allowedManagedProviderIds.filter(
                                        (item) => item !== provider.id,
                                      ),
                                }))
                              }
                              disabled={!selectedUser.management.canUpdateProviderPolicy}
                            />
                            <span>
                              <span className="block font-semibold text-porcelain-50">
                                {provider.name}
                              </span>
                              <span className="mt-1 block text-xs text-porcelain-100/45">
                                {provider.id}
                              </span>
                            </span>
                          </label>
                        )
                      })
                    ) : (
                      <p className="text-sm text-porcelain-100/55">当前没有可选的公共 Provider。</p>
                    )}
                  </div>
                </div>

                <label className="field-block mt-4">
                  <span className="field-label">允许的模型白名单</span>
                  <textarea
                    className="input-shell min-h-[120px] resize-y"
                    value={allowedModelsDraft}
                    onChange={(event) => setAllowedModelsDraft(event.target.value)}
                    placeholder="一行一个模型，例如&#10;gpt-image-2&#10;flux-kontext-pro"
                    disabled={!selectedUser.management.canUpdateProviderPolicy}
                  />
                </label>
              </form>

              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                      密码重置
                    </p>
                    <button
                      type="button"
                      className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-4 py-2 text-sm font-semibold text-porcelain-50 disabled:opacity-35"
                      onClick={() => void submitPasswordReset()}
                      disabled={
                        !selectedUser.management.canTriggerPasswordReset ||
                        busyId === `password-reset:${selectedUser.id}`
                      }
                    >
                      {busyId === `password-reset:${selectedUser.id}` ? '生成中…' : '生成重置链接'}
                    </button>
                  </div>
                  {passwordResetResult ? (
                    <div className="mt-4 space-y-3 text-sm text-porcelain-100/70">
                      <p>过期时间：{formatAdminDateTime(passwordResetResult.expiresAt)}</p>
                      <div className="rounded-[1.1rem] border border-porcelain-50/10 bg-ink-950/[0.32] p-3">
                        <p className="text-xs text-porcelain-100/45">重置令牌</p>
                        <p className="mt-2 break-all font-mono text-xs text-porcelain-50">
                          {passwordResetResult.token}
                        </p>
                        <button
                          type="button"
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-porcelain-50/10 px-3 py-2 text-xs font-semibold text-porcelain-50"
                          onClick={() =>
                            void handleCopyText(
                              passwordResetResult.token,
                              '重置令牌已复制。',
                            )
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                          复制令牌
                        </button>
                      </div>
                      <div className="rounded-[1.1rem] border border-porcelain-50/10 bg-ink-950/[0.32] p-3">
                        <p className="text-xs text-porcelain-100/45">重置入口</p>
                        <p className="mt-2 break-all font-mono text-xs text-porcelain-50">
                          {passwordResetResult.resetPath}
                        </p>
                        <button
                          type="button"
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-porcelain-50/10 px-3 py-2 text-xs font-semibold text-porcelain-50"
                          onClick={() =>
                            void handleCopyText(
                              passwordResetResult.resetPath,
                              '重置入口已复制。',
                            )
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                          复制入口
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-porcelain-100/55">
                      可为用户生成一次新的密码重置令牌，旧令牌会失效。
                    </p>
                  )}
                </div>

                <form
                  className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4"
                  onSubmit={submitAdminNote}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                      管理员备注
                    </p>
                    <button
                      type="submit"
                      className="rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-4 py-2 text-sm font-semibold text-signal-cyan disabled:opacity-35"
                      disabled={
                        !selectedUser.management.canAddNotes || busyId === `note:${selectedUser.id}`
                      }
                    >
                      {busyId === `note:${selectedUser.id}` ? '保存中…' : '添加备注'}
                    </button>
                  </div>
                  <textarea
                    className="input-shell mt-4 min-h-[120px] resize-y"
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder="记录补偿背景、用户沟通结果、后续跟进动作"
                    disabled={!selectedUser.management.canAddNotes}
                  />
                  <div className="mt-4 space-y-3">
                    {selectedUser.recentNotes?.length ? (
                      selectedUser.recentNotes.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-[1.1rem] border border-porcelain-50/10 bg-ink-950/[0.32] p-3"
                        >
                          <p className="text-sm text-porcelain-50">
                            {(() => {
                              if (log.payload && typeof log.payload === 'object' && 'content' in log.payload) {
                                return String((log.payload as { content?: unknown }).content ?? '—')
                              }
                              return formatAuditPayload(log.payload)
                            })()}
                          </p>
                          <p className="mt-2 text-xs text-porcelain-100/45">
                            {log.actorNickname ?? log.actorEmail ?? log.actorUserId} ·{' '}
                            {formatAdminDateTime(log.createdAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-porcelain-100/55">暂无备注记录。</p>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  最近作品
                </p>
                <Link
                  to={`/app/admin/works?userId=${selectedUser.id}`}
                  className="text-sm font-semibold text-signal-cyan"
                >
                  查看全部作品
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selectedUser.recentWorks?.length ? (
                  selectedUser.recentWorks.map((work) => (
                    <Link
                      key={work.id}
                      to={`/app/admin/works?userId=${selectedUser.id}&selected=${work.id}`}
                      className="rounded-[1.2rem] border border-porcelain-50/10 bg-ink-950/[0.32] p-4 transition hover:border-signal-cyan/30"
                    >
                      <p className="font-semibold text-porcelain-50">{work.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-porcelain-100/60">
                        {work.promptSnippet || work.meta || '无附加说明'}
                      </p>
                      <p className="mt-3 text-xs text-porcelain-100/45">
                        {work.providerModel || '未标记模型'} · {formatAdminDateTime(work.createdAt)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-porcelain-100/55">暂无作品记录。</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                    最近任务
                  </p>
                  {[
                    { key: '', label: '全部' },
                    { key: 'running', label: '执行中' },
                    { key: 'failed', label: '失败' },
                  ].map((item) => (
                    <button
                      key={item.key || 'all'}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-[11px] ${
                        recentTaskFilter === item.key
                          ? 'border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan'
                          : 'border-porcelain-50/10 bg-ink-950/[0.5] text-porcelain-100/60'
                      }`}
                      onClick={() => setRecentTaskFilter(item.key as '' | 'running' | 'failed')}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <Link
                  to={`/app/admin/tasks?userId=${selectedUser.id}`}
                  className="text-sm font-semibold text-signal-cyan"
                >
                  查看全部任务
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {recentTasks.length ? (
                  recentTasks.map((task) => renderTaskRow(task))
                ) : (
                  <p className="text-sm text-porcelain-100/55">当前筛选下没有任务记录。</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  最近操作日志
                </p>
                <Link
                  to={`/app/admin/audit?targetType=user&targetId=${selectedUser.id}`}
                  className="text-sm font-semibold text-signal-cyan"
                >
                  查看全部日志
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {selectedUser.recentAuditLogs?.length ? (
                  selectedUser.recentAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-[1.2rem] border border-porcelain-50/10 bg-ink-950/[0.32] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-porcelain-50">{log.action}</p>
                          <p className="mt-1 text-xs text-porcelain-100/45">
                            {log.actorNickname ?? log.actorEmail ?? log.actorUserId} ·{' '}
                            {formatAdminDateTime(log.createdAt)}
                          </p>
                        </div>
                        <p className="text-xs text-porcelain-100/45">{log.requestId || '—'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-porcelain-100/55">暂无管理员操作记录。</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </AdminDetailDrawer>
      {confirmDialog}
    </div>
  )
}
