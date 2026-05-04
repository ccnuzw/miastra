import { Eye, RotateCcw } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { type AdminActiveFilterItem, AdminActiveFilters } from '@/features/admin/AdminActiveFilters'
import { AdminDetailDrawer } from '@/features/admin/AdminDetailDrawer'
import { AdminFilterPresets } from '@/features/admin/AdminFilterPresets'
import { AdminPageHeader } from '@/features/admin/AdminPageHeader'
import { AdminPagination } from '@/features/admin/AdminPagination'
import {
  type AdminActorRole,
  type AdminAuditLogRecord,
  fetchAdminAuditLogs,
} from '@/features/admin/admin.api'
import {
  adminRoleLabels,
  formatAdminDateTime,
  formatAuditPayload,
  parsePositivePage,
  roleTone,
} from '@/features/admin/admin.utils'
import { useAdminSearchParams } from '@/features/admin/useAdminSearchParams'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

const actorRoleOptions: Array<AdminActorRole | ''> = ['', 'user', 'operator', 'admin']

export function AdminAuditPage() {
  const { searchParams, updateSearchParams } = useAdminSearchParams()
  const page = parsePositivePage(searchParams.get('page'))
  const preset = searchParams.get('preset') ?? ''
  const appliedQuery = searchParams.get('query') ?? ''
  const appliedAction = searchParams.get('action') ?? ''
  const appliedTargetType = searchParams.get('targetType') ?? ''
  const targetIdFilter = searchParams.get('targetId') ?? ''
  const actorRoleFilter = (searchParams.get('actorRole') as AdminActorRole | '') || ''
  const selectedAuditId = searchParams.get('selected') ?? ''

  const [logs, setLogs] = useState<AdminAuditLogRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchInput, setSearchInput] = useState(appliedQuery)
  const [actionInput, setActionInput] = useState(appliedAction)
  const [targetTypeInput, setTargetTypeInput] = useState(appliedTargetType)
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    setSearchInput(appliedQuery)
    setActionInput(appliedAction)
    setTargetTypeInput(appliedTargetType)
  }, [appliedAction, appliedQuery, appliedTargetType])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminAuditLogs({
        page,
        limit: 20,
        query: appliedQuery || undefined,
        actorRole: actorRoleFilter || undefined,
        action: appliedAction || undefined,
        targetType: appliedTargetType || undefined,
        targetId: targetIdFilter || undefined,
      })
      setLogs(result.items)
      setTotal(result.total)
      setTotalPages(result.totalPages)
      setSelectedLog(result.items.find((item) => item.id === selectedAuditId) ?? null)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [
    actorRoleFilter,
    appliedAction,
    appliedQuery,
    appliedTargetType,
    page,
    selectedAuditId,
    targetIdFilter,
  ])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const auditPresets = useMemo(
    () => [
      {
        key: 'all',
        label: '全部日志',
        active: !preset,
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: undefined,
            actorRole: undefined,
            action: undefined,
            targetType: undefined,
            targetId: undefined,
            query: undefined,
            selected: undefined,
          }),
      },
      {
        key: 'role-update',
        label: '角色变更',
        active: preset === 'role-update',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'role-update',
            action: 'user.role.updated',
            targetType: 'user',
            selected: undefined,
          }),
      },
      {
        key: 'provider-change',
        label: 'Provider 变更',
        active: preset === 'provider-change',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'provider-change',
            targetType: 'managed_provider',
            action: undefined,
            selected: undefined,
          }),
      },
      {
        key: 'task-cancel',
        label: '任务取消',
        active: preset === 'task-cancel',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'task-cancel',
            action: 'task.cancelled',
            targetType: 'task',
            selected: undefined,
          }),
      },
      {
        key: 'work-delete',
        label: '作品删除',
        active: preset === 'work-delete',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'work-delete',
            targetType: 'work',
            action: 'work.deleted',
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
      actorRoleFilter
        ? {
            key: 'actorRole',
            label: `角色：${adminRoleLabels[actorRoleFilter]}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                actorRole: undefined,
                selected: undefined,
              }),
          }
        : null,
      appliedAction
        ? {
            key: 'action',
            label: `动作：${appliedAction}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                preset: undefined,
                action: undefined,
                selected: undefined,
              }),
          }
        : null,
      appliedTargetType
        ? {
            key: 'targetType',
            label: `对象：${appliedTargetType}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                preset: undefined,
                targetType: undefined,
                selected: undefined,
              }),
          }
        : null,
      targetIdFilter
        ? {
            key: 'targetId',
            label: `对象 ID：${targetIdFilter}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                targetId: undefined,
                selected: undefined,
              }),
          }
        : null,
    ]
    return items.filter((item): item is AdminActiveFilterItem => item !== null)
  }, [
    actorRoleFilter,
    appliedAction,
    appliedQuery,
    appliedTargetType,
    targetIdFilter,
    updateSearchParams,
  ])
  const auditSummary = useMemo(() => {
    return {
      currentPage: logs.length,
      roleCounts: logs.reduce<Record<AdminActorRole, number>>(
        (accumulator, item) => {
          accumulator[item.actorRole] += 1
          return accumulator
        },
        { user: 0, operator: 0, admin: 0 },
      ),
      managedProviderEvents: logs.filter((item) => item.targetType === 'managed_provider').length,
      workEvents: logs.filter((item) => item.targetType === 'work').length,
    }
  }, [logs])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSearchParams({
      page: '1',
      preset: undefined,
      query: searchInput.trim() || undefined,
      action: actionInput.trim() || undefined,
      targetType: targetTypeInput.trim() || undefined,
      targetId: targetIdFilter || undefined,
      selected: undefined,
    })
  }

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        eyebrow="Audit"
        title="审计日志"
        description="审计页现在默认用表格看流量和操作轨迹，详情收进侧栏，适合做定位、筛查和逐条追溯。"
        meta={<span className="status-pill">当前结果：{total} 条日志</span>}
        actions={
          <button
            type="button"
            className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
            onClick={() => void refresh()}
          >
            刷新日志
          </button>
        }
      />

      <AdminFilterPresets presets={auditPresets} />

      <article className="progress-card">
        <form
          className="grid gap-3 min-[1480px]:grid-cols-[minmax(0,1.45fr)_220px_220px] 2xl:grid-cols-[minmax(0,1.6fr)_220px_220px_220px_auto]"
          onSubmit={handleSubmit}
        >
          <label className="field-block">
            <span className="field-label">关键字</span>
            <input
              className="input-shell"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="操作者、对象、请求 ID、payload"
            />
          </label>
          <label className="field-block">
            <span className="field-label">操作者角色</span>
            <select
              className="input-shell"
              value={actorRoleFilter}
              onChange={(event) =>
                updateSearchParams({
                  page: '1',
                  preset: undefined,
                  actorRole: event.target.value,
                  selected: undefined,
                })
              }
            >
              {actorRoleOptions.map((role) => (
                <option key={role || 'all'} value={role}>
                  {role ? adminRoleLabels[role] : '全部角色'}
                </option>
              ))}
            </select>
          </label>
          <label className="field-block">
            <span className="field-label">动作名</span>
            <input
              className="input-shell"
              value={actionInput}
              onChange={(event) => setActionInput(event.target.value)}
              placeholder="例如 user.role"
            />
          </label>
          <label className="field-block">
            <span className="field-label">对象类型</span>
            <input
              className="input-shell"
              value={targetTypeInput}
              onChange={(event) => setTargetTypeInput(event.target.value)}
              placeholder="例如 user / work"
            />
          </label>
          <div className="admin-toolbar-actions 2xl:justify-end">
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
                  action: undefined,
                  targetType: undefined,
                  targetId: undefined,
                  actorRole: undefined,
                  selected: undefined,
                })
              }
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </form>
      </article>

      {loading ? <p className="text-sm text-porcelain-100/60">正在加载审计日志…</p> : null}
      {error ? <ErrorNotice error={error} /> : null}
      <AdminActiveFilters
        items={activeFilters}
        onClearAll={
          activeFilters.length
            ? () =>
                updateSearchParams({
                  page: '1',
                  preset: undefined,
                  query: undefined,
                  action: undefined,
                  targetType: undefined,
                  targetId: undefined,
                  actorRole: undefined,
                  selected: undefined,
                })
            : undefined
        }
      />
      <div className="admin-summary-strip">
        <span className="admin-summary-strong">结果摘要</span>
        <span>当前命中 {total} 条日志</span>
        <span>本页 {auditSummary.currentPage} 条</span>
        <span>管理员动作 {auditSummary.roleCounts.admin} 条</span>
        <span>Provider 事件 {auditSummary.managedProviderEvents} 条</span>
        <span>作品事件 {auditSummary.workEvents} 条</span>
        {appliedAction ? <span>聚焦动作：{appliedAction}</span> : null}
        {appliedTargetType ? <span>对象类型：{appliedTargetType}</span> : null}
        {targetIdFilter ? <span>对象 ID：{targetIdFilter}</span> : null}
      </div>

      <section className="admin-table-shell">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>动作</th>
                <th>操作者</th>
                <th>角色</th>
                <th>对象</th>
                <th>请求 ID</th>
                <th>时间</th>
                <th className="w-[120px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className={selectedAuditId === log.id ? 'admin-table-row-active' : undefined}
                >
                  <td>
                    <p className="font-semibold text-porcelain-50">{log.action}</p>
                  </td>
                  <td>
                    <p>{log.actorNickname ?? log.actorEmail ?? log.actorUserId}</p>
                  </td>
                  <td>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] ${roleTone(log.actorRole)}`}
                    >
                      {adminRoleLabels[log.actorRole]}
                    </span>
                  </td>
                  <td>
                    <p className="text-porcelain-50">{log.targetType}</p>
                    <p className="mt-1 text-xs text-porcelain-100/45">{log.targetId}</p>
                  </td>
                  <td className="max-w-[220px]">
                    <p className="truncate text-xs text-porcelain-100/50">{log.requestId || '—'}</p>
                  </td>
                  <td>{formatAdminDateTime(log.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-3 py-2 text-xs font-semibold text-porcelain-50"
                      onClick={() => updateSearchParams({ selected: log.id })}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        查看
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!loading && !logs.length ? (
        <p className="text-sm text-porcelain-100/60">没有匹配的审计日志。</p>
      ) : null}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(nextPage) => updateSearchParams({ page: String(nextPage) })}
      />

      <AdminDetailDrawer
        open={Boolean(selectedAuditId)}
        title={selectedLog?.action || '审计详情'}
        subtitle={
          selectedLog
            ? `${selectedLog.actorNickname ?? selectedLog.actorEmail ?? selectedLog.actorUserId} · ${formatAdminDateTime(selectedLog.createdAt)}`
            : ''
        }
        onClose={() => updateSearchParams({ selected: undefined })}
      >
        {selectedLog ? (
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  基础字段
                </p>
                <div className="mt-3 space-y-2 text-sm text-porcelain-100/70">
                  <p>日志 ID：{selectedLog.id}</p>
                  <p>操作者 ID：{selectedLog.actorUserId}</p>
                  <p>角色：{adminRoleLabels[selectedLog.actorRole]}</p>
                  <p>对象类型：{selectedLog.targetType}</p>
                  <p>对象 ID：{selectedLog.targetId}</p>
                  <p>请求 ID：{selectedLog.requestId || '—'}</p>
                  <p>IP：{selectedLog.ip || '—'}</p>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  操作者信息
                </p>
                <div className="mt-3 space-y-2 text-sm text-porcelain-100/70">
                  <p>昵称：{selectedLog.actorNickname || '—'}</p>
                  <p>邮箱：{selectedLog.actorEmail || '—'}</p>
                  <p>时间：{formatAdminDateTime(selectedLog.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">Payload</p>
              <pre className="mt-3 overflow-x-auto rounded-[1.2rem] border border-porcelain-50/10 bg-ink-950/[0.72] p-3 text-xs leading-6 text-porcelain-100/60">
                {formatAuditPayload(selectedLog.payload)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-sm text-porcelain-100/60">未找到该条日志。</p>
        )}
      </AdminDetailDrawer>
    </div>
  )
}
