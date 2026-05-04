import { Eye, RotateCcw, UserX } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { AdminDetailDrawer } from '@/features/admin/AdminDetailDrawer'
import { AdminPageHeader } from '@/features/admin/AdminPageHeader'
import { AdminPagination } from '@/features/admin/AdminPagination'
import { AdminSelectionBar } from '@/features/admin/AdminSelectionBar'
import {
  type AdminUserRecord,
  fetchAdminUserById,
  fetchAdminUsers,
  revokeAdminUserSessionsBulk,
} from '@/features/admin/admin.api'
import {
  adminRoleLabels,
  formatAdminDateTime,
  parsePositivePage,
  roleTone,
} from '@/features/admin/admin.utils'
import { useAdminPageActions } from '@/features/admin/useAdminPageActions'
import { useAdminSearchParams } from '@/features/admin/useAdminSearchParams'
import { useAdminSelection } from '@/features/admin/useAdminSelection'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

const allRoles: Array<AdminUserRecord['role'] | ''> = ['', 'user', 'operator', 'admin']

export function AdminUsersPage() {
  const { searchParams, updateSearchParams } = useAdminSearchParams()
  const page = parsePositivePage(searchParams.get('page'))
  const appliedQuery = searchParams.get('query') ?? ''
  const roleFilter = (searchParams.get('role') as AdminUserRecord['role'] | '') || ''
  const selectedUserId = searchParams.get('selected') ?? ''

  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchInput, setSearchInput] = useState(appliedQuery)
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AdminUserRecord['role']>>({})
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const selection = useAdminSelection()

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
      })
      setUsers(result.items)
      setTotal(result.total)
      setTotalPages(result.totalPages)
      setRoleDrafts((current) => ({
        ...Object.fromEntries(result.items.map((item) => [item.id, item.role])),
        ...current,
      }))

      if (selectedUserId) {
        const detail = await fetchAdminUserById(selectedUserId)
        setSelectedUser(detail)
        setRoleDrafts((current) => ({ ...current, [detail.id]: detail.role }))
      }
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [appliedQuery, page, roleFilter, selectedUserId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null)
      return
    }

    setDetailLoading(true)
    void fetchAdminUserById(selectedUserId)
      .then((detail) => {
        setSelectedUser(detail)
        setRoleDrafts((current) => ({ ...current, [detail.id]: detail.role }))
      })
      .catch((nextError) => {
        setError(nextError)
      })
      .finally(() => {
        setDetailLoading(false)
      })
  }, [selectedUserId])

  const { busyId, handleSaveRole, handleRevokeSessions } = useAdminPageActions({
    roleDrafts,
    refresh,
    setError,
    setMessage,
  })

  const pageIds = useMemo(() => users.map((item) => item.id), [users])
  const selectedOnPageCount = useMemo(
    () => pageIds.filter((id) => selection.selectedIdSet.has(id)).length,
    [pageIds, selection.selectedIdSet],
  )
  const allSelectedOnPage = pageIds.length > 0 && selectedOnPageCount === pageIds.length

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSearchParams({
      page: '1',
      query: searchInput.trim() || undefined,
      selected: undefined,
    })
  }

  async function handleBulkRevoke() {
    if (!selection.selectedIds.length) return
    if (!window.confirm(`确定要撤销这 ${selection.selectedIds.length} 个用户的会话吗？`)) return

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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Users"
        title="用户管理"
        description="表格化管理用户对象，支持筛选、批量会话处理和详情侧栏。高频操作放在主视图，低频信息收进明细抽屉。"
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

      <AdminSelectionBar
        count={selection.selectedCount}
        label="可批量撤销这些用户的会话"
        actions={
          <>
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
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px]"
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

          <div className="flex items-end gap-2">
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
          <p>点击“查看”或行内数据可打开详情侧栏</p>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-12" />
                <th>用户</th>
                <th>角色</th>
                <th>活跃会话</th>
                <th>作品</th>
                <th>任务</th>
                <th>创建时间</th>
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
                      className={`rounded-full border px-3 py-1 text-[11px] ${roleTone(user.role)}`}
                    >
                      {adminRoleLabels[user.role]}
                    </span>
                  </td>
                  <td>{user.activeSessionCount}</td>
                  <td>{user.workCount}</td>
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
          </>
        }
      >
        {detailLoading && !selectedUser ? (
          <p className="text-sm text-porcelain-100/60">正在加载用户详情…</p>
        ) : null}

        {selectedUser ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  活跃会话
                </p>
                <p className="mt-2 text-2xl font-semibold text-porcelain-50">
                  {selectedUser.activeSessionCount}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">作品数</p>
                <p className="mt-2 text-2xl font-semibold text-porcelain-50">
                  {selectedUser.workCount}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">任务数</p>
                <p className="mt-2 text-2xl font-semibold text-porcelain-50">
                  {selectedUser.taskCount}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  基础信息
                </p>
                <div className="mt-3 space-y-2 text-sm text-porcelain-100/70">
                  <p>用户 ID：{selectedUser.id}</p>
                  <p>创建时间：{formatAdminDateTime(selectedUser.createdAt)}</p>
                  <p>更新时间：{formatAdminDateTime(selectedUser.updatedAt)}</p>
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
          </div>
        ) : null}
      </AdminDetailDrawer>
    </div>
  )
}
