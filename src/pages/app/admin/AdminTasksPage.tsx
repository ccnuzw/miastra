import { Ban, Eye, RotateCcw } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { type AdminActiveFilterItem, AdminActiveFilters } from '@/features/admin/AdminActiveFilters'
import { useAdminConfirm } from '@/features/admin/AdminConfirmDialog'
import { AdminDetailDrawer } from '@/features/admin/AdminDetailDrawer'
import { AdminFilterPresets } from '@/features/admin/AdminFilterPresets'
import { AdminPageHeader } from '@/features/admin/AdminPageHeader'
import { AdminPagination } from '@/features/admin/AdminPagination'
import { AdminSelectionBar } from '@/features/admin/AdminSelectionBar'
import {
  type AdminGenerationTaskRecord,
  type AdminTaskListView,
  type AdminTaskStatus,
  cancelAdminTask,
  cancelAdminTasksBulk,
  fetchAdminTaskAttempts,
  fetchAdminTaskById,
  fetchAdminTasks,
} from '@/features/admin/admin.api'
import {
  adminTaskStatusLabels,
  formatAdminDateTime,
  isTaskCancellable,
  parsePositivePage,
  taskStatusTone,
} from '@/features/admin/admin.utils'
import { useAdminSearchParams } from '@/features/admin/useAdminSearchParams'
import { useAdminSelection } from '@/features/admin/useAdminSelection'
import { ErrorNotice } from '@/shared/errors/ErrorNotice'

const statusOptions: Array<AdminTaskStatus | ''> = [
  '',
  'pending',
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'timeout',
]

export function AdminTasksPage() {
  const { searchParams, updateSearchParams } = useAdminSearchParams()
  const page = parsePositivePage(searchParams.get('page'))
  const preset = searchParams.get('preset') ?? ''
  const appliedQuery = searchParams.get('query') ?? ''
  const statusFilter = (searchParams.get('status') as AdminTaskStatus | '') || ''
  const userIdFilter = searchParams.get('userId') ?? ''
  const taskView =
    (searchParams.get('view') as AdminTaskListView | null) === 'history' ? 'history' : 'current'
  const selectedTaskId = searchParams.get('selected') ?? ''

  const [tasks, setTasks] = useState<AdminGenerationTaskRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchInput, setSearchInput] = useState(appliedQuery)
  const [selectedTask, setSelectedTask] = useState<AdminGenerationTaskRecord | null>(null)
  const [selectedTaskAttempts, setSelectedTaskAttempts] = useState<AdminGenerationTaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
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
      const result = await fetchAdminTasks({
        page,
        limit: 12,
        query: appliedQuery || undefined,
        status: statusFilter || undefined,
        view: taskView,
        userId: userIdFilter || undefined,
      })
      setTasks(result.items)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setLoading(false)
    }
  }, [appliedQuery, page, statusFilter, taskView, userIdFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!selectedTaskId) {
      setSelectedTask(null)
      setSelectedTaskAttempts([])
      return
    }

    setDetailLoading(true)
    void Promise.all([fetchAdminTaskById(selectedTaskId), fetchAdminTaskAttempts(selectedTaskId)])
      .then(([detail, attempts]) => {
        setSelectedTask(detail)
        setSelectedTaskAttempts(attempts)
      })
      .catch((nextError) => setError(nextError))
      .finally(() => setDetailLoading(false))
  }, [selectedTaskId])

  const pageIds = useMemo(() => tasks.map((item) => item.id), [tasks])
  const selectedOnPageCount = useMemo(
    () => pageIds.filter((id) => selection.selectedIdSet.has(id)).length,
    [pageIds, selection.selectedIdSet],
  )
  const allSelectedOnPage = pageIds.length > 0 && selectedOnPageCount === pageIds.length
  const taskPresets = useMemo(
    () => [
      {
        key: 'all',
        label: '全部任务',
        active: !preset,
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: undefined,
            status: undefined,
            query: undefined,
            userId: undefined,
            selected: undefined,
          }),
      },
      {
        key: 'failed',
        label: '失败任务',
        active: preset === 'failed',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'failed',
            status: 'failed',
            selected: undefined,
          }),
      },
      {
        key: 'running',
        label: '执行中',
        active: preset === 'running',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'running',
            status: 'running',
            selected: undefined,
          }),
      },
      {
        key: 'queued',
        label: '排队中',
        active: preset === 'queued',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'queued',
            status: 'queued',
            selected: undefined,
          }),
      },
      {
        key: 'timeout',
        label: '超时任务',
        active: preset === 'timeout',
        onClick: () =>
          updateSearchParams({
            page: '1',
            preset: 'timeout',
            status: 'timeout',
            selected: undefined,
          }),
      },
    ],
    [preset, updateSearchParams],
  )
  const taskViewPresets = useMemo(
    () => [
      {
        key: 'current',
        label: '当前任务视图',
        active: taskView === 'current',
        onClick: () =>
          updateSearchParams({
            page: '1',
            view: 'current',
            userId: userIdFilter || undefined,
            selected: undefined,
          }),
      },
      {
        key: 'history',
        label: '历史尝试视图',
        active: taskView === 'history',
        onClick: () =>
          updateSearchParams({
            page: '1',
            view: 'history',
            userId: userIdFilter || undefined,
            selected: undefined,
          }),
      },
    ],
    [taskView, updateSearchParams, userIdFilter],
  )
  const activeFilters = useMemo(() => {
    const items: Array<AdminActiveFilterItem | null> = [
      {
        key: 'view',
        label: `视图：${taskView === 'current' ? '当前任务' : '历史尝试'}`,
      },
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
      statusFilter
        ? {
            key: 'status',
            label: `状态：${adminTaskStatusLabels[statusFilter]}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                preset: undefined,
                status: undefined,
                selected: undefined,
              }),
          }
        : null,
      userIdFilter
        ? {
            key: 'userId',
            label: `用户：${userIdFilter}`,
            onRemove: () =>
              updateSearchParams({
                page: '1',
                userId: undefined,
                selected: undefined,
              }),
          }
        : null,
    ]
    return items.filter((item): item is AdminActiveFilterItem => item !== null)
  }, [appliedQuery, statusFilter, taskView, updateSearchParams, userIdFilter])
  const taskSummary = useMemo(() => {
    const counts = tasks.reduce<Record<AdminTaskStatus, number>>(
      (accumulator, item) => {
        accumulator[item.status] += 1
        return accumulator
      },
      {
        pending: 0,
        queued: 0,
        running: 0,
        succeeded: 0,
        failed: 0,
        cancelled: 0,
        timeout: 0,
      },
    )

    return {
      currentPage: tasks.length,
      counts,
    }
  }, [tasks])

  const viewDescription =
    taskView === 'current'
      ? '当前视图按逻辑任务槽位去重，只保留每个任务的最新一次尝试，适合看现状和处理异常。'
      : '历史尝试视图保留完整重试链路，适合回溯某个任务为何先失败、后成功或多次取消。'
  const latestAttemptId = selectedTaskAttempts[0]?.id

  async function handleCancelTask(taskId: string) {
    const approved = await confirm({
      title: '取消任务',
      description: '任务会被强制中止，未完成的生成流程将停止执行。',
      confirmLabel: '确认取消',
      details: `任务 ID：${taskId}`,
    })
    if (!approved) return

    setBusyId(taskId)
    setError(null)
    setMessage('')
    try {
      await cancelAdminTask(taskId)
      setMessage('任务已取消。')
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBusyId('')
    }
  }

  async function handleBulkCancel() {
    if (!selection.selectedIds.length) return
    const approved = await confirm({
      title: '批量取消任务',
      description: '选中的任务会被统一中止，适用于处理异常积压或错误批次。',
      confirmLabel: '确认批量取消',
      details: `本次将处理 ${selection.selectedIds.length} 个任务。`,
    })
    if (!approved) return

    setBulkBusy(true)
    setError(null)
    setMessage('')
    try {
      const result = await cancelAdminTasksBulk(selection.selectedIds)
      selection.clearSelection()
      setMessage(`已处理 ${result.processedCount} 个任务，成功取消 ${result.succeeded.length} 个。`)
      await refresh()
    } catch (nextError) {
      setError(nextError)
    } finally {
      setBulkBusy(false)
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateSearchParams({
      page: '1',
      preset: undefined,
      query: searchInput.trim() || undefined,
      selected: undefined,
    })
  }

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        eyebrow="Tasks"
        title="任务管理"
        description={viewDescription}
        meta={
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="status-pill">
              视图：{taskView === 'current' ? '当前任务' : '历史尝试'}
            </span>
            <span className="status-pill">当前结果：{total} 个任务</span>
          </div>
        }
        actions={
          <button
            type="button"
            className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.65] px-4 py-2 text-sm font-semibold text-porcelain-50 transition hover:border-signal-cyan/50 hover:text-signal-cyan"
            onClick={() => void refresh()}
          >
            刷新任务
          </button>
        }
      />

      <AdminFilterPresets presets={taskViewPresets} />
      <AdminFilterPresets presets={taskPresets} />

      <AdminSelectionBar
        count={selection.selectedCount}
        label="可批量取消选中的任务"
        actions={
          <>
            <button
              type="button"
              className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral disabled:opacity-35"
              onClick={() => void handleBulkCancel()}
              disabled={bulkBusy}
            >
              {bulkBusy ? '处理中…' : '批量取消'}
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
          className="grid gap-3 min-[1480px]:grid-cols-[minmax(0,1.45fr)_240px_auto]"
          onSubmit={handleSearchSubmit}
        >
          <label className="field-block">
            <span className="field-label">搜索任务</span>
            <input
              className="input-shell"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="标题、提示词、所属用户"
            />
          </label>

          <label className="field-block">
            <span className="field-label">状态筛选</span>
            <select
              className="input-shell"
              value={statusFilter}
              onChange={(event) =>
                updateSearchParams({
                  page: '1',
                  view: taskView,
                  preset: undefined,
                  status: event.target.value,
                  selected: undefined,
                })
              }
            >
              {statusOptions.map((status) => (
                <option key={status || 'all'} value={status}>
                  {status ? adminTaskStatusLabels[status] : '全部状态'}
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
                  view: taskView,
                  query: undefined,
                  status: undefined,
                  userId: undefined,
                  selected: undefined,
                })
              }
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </form>
      </article>

      {loading ? <p className="text-sm text-porcelain-100/60">正在加载任务列表…</p> : null}
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
                  view: taskView,
                  preset: undefined,
                  query: undefined,
                  status: undefined,
                  userId: undefined,
                  selected: undefined,
                })
            : undefined
        }
      />
      <div className="admin-summary-strip">
        <span className="admin-summary-strong">结果摘要</span>
        <span>{taskView === 'current' ? '按最新尝试去重' : '展示全部历史尝试'}</span>
        <span>当前命中 {total} 个任务</span>
        <span>本页 {taskSummary.currentPage} 个</span>
        <span>失败 {taskSummary.counts.failed}</span>
        <span>执行中 {taskSummary.counts.running}</span>
        <span>排队中 {taskSummary.counts.queued}</span>
        <span>已成功 {taskSummary.counts.succeeded}</span>
        {userIdFilter ? <span>用户：{userIdFilter}</span> : null}
        {selection.selectedCount ? <span>已跨页选中 {selection.selectedCount} 项</span> : null}
        {statusFilter ? <span>重点状态：{adminTaskStatusLabels[statusFilter]}</span> : null}
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
          <p>
            {taskView === 'current'
              ? '优先查看当前运行中、失败和积压任务'
              : '用于回看完整重试链和历史状态变化'}
          </p>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-12" />
                <th>任务</th>
                <th>用户</th>
                <th>状态</th>
                <th>Provider / Model</th>
                <th>进度</th>
                <th>更新时间</th>
                <th className="w-[180px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className={selectedTaskId === task.id ? 'admin-table-row-active' : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selection.isSelected(task.id)}
                      onChange={() => selection.toggleSelection(task.id)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => updateSearchParams({ selected: task.id })}
                    >
                      <p className="font-semibold text-porcelain-50">
                        {task.payload.title || '未命名任务'}
                      </p>
                      <p className="mt-1 text-xs text-porcelain-100/55">
                        {task.batchId
                          ? `批次 ${task.batchId} · 第 ${task.drawIndex ?? '—'} 张`
                          : `根任务 ${task.rootTaskId}`}
                        {` · 尝试 ${task.retryAttempt + 1}`}
                        {task.parentTaskId ? ` · 上次 ${task.parentTaskId}` : ''}
                      </p>
                      <p className="mt-1 max-w-[28rem] break-words text-xs text-porcelain-100/45">
                        {task.payload.promptText || task.payload.requestPrompt || '无 prompt'}
                      </p>
                    </button>
                  </td>
                  <td>{task.userNickname ?? task.userEmail ?? '—'}</td>
                  <td>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] ${taskStatusTone(task.status)}`}
                    >
                      {adminTaskStatusLabels[task.status]}
                    </span>
                  </td>
                  <td>
                    <p className="text-porcelain-50">{task.payload.providerId}</p>
                    <p className="mt-1 text-xs text-porcelain-100/45">{task.payload.model}</p>
                  </td>
                  <td>{typeof task.progress === 'number' ? `${task.progress}%` : '—'}</td>
                  <td>{formatAdminDateTime(task.updatedAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-porcelain-50/10 bg-ink-950/[0.72] px-3 py-2 text-xs font-semibold text-porcelain-50"
                        onClick={() => updateSearchParams({ selected: task.id })}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Eye className="h-3.5 w-3.5" />
                          查看
                        </span>
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-3 py-2 text-xs font-semibold text-signal-coral disabled:opacity-35"
                        onClick={() => void handleCancelTask(task.id)}
                        disabled={busyId === task.id || !isTaskCancellable(task.status)}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Ban className="h-3.5 w-3.5" />
                          {busyId === task.id ? '处理中…' : '取消'}
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

      {!loading && !tasks.length ? (
        <p className="text-sm text-porcelain-100/60">没有匹配的任务。</p>
      ) : null}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(nextPage) => updateSearchParams({ page: String(nextPage) })}
      />

      <AdminDetailDrawer
        open={Boolean(selectedTaskId)}
        title={selectedTask?.payload.title || '任务详情'}
        subtitle={
          selectedTask
            ? `${selectedTask.payload.providerId} / ${selectedTask.payload.model} · 第 ${selectedTask.retryAttempt + 1} 次尝试`
            : ''
        }
        onClose={() => updateSearchParams({ selected: undefined })}
        actions={
          selectedTask && isTaskCancellable(selectedTask.status) ? (
            <button
              type="button"
              className="rounded-full border border-signal-coral/25 bg-signal-coral/10 px-4 py-2 text-sm font-semibold text-signal-coral disabled:opacity-35"
              onClick={() => selectedTaskId && void handleCancelTask(selectedTaskId)}
              disabled={busyId === selectedTaskId}
            >
              {busyId === selectedTaskId ? '处理中…' : '取消任务'}
            </button>
          ) : null
        }
      >
        {detailLoading && !selectedTask ? (
          <p className="text-sm text-porcelain-100/60">正在加载任务详情…</p>
        ) : null}

        {selectedTask ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">状态</p>
                <p className="mt-2 text-base font-semibold text-porcelain-50">
                  {adminTaskStatusLabels[selectedTask.status]}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">进度</p>
                <p className="mt-2 text-base font-semibold text-porcelain-50">
                  {typeof selectedTask.progress === 'number' ? `${selectedTask.progress}%` : '—'}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">用户</p>
                <p className="mt-2 text-base font-semibold text-porcelain-50">
                  {selectedTask.userNickname ?? selectedTask.userEmail ?? '—'}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">尺寸</p>
                <p className="mt-2 text-base font-semibold text-porcelain-50">
                  {selectedTask.payload.size}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">Prompt</p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-porcelain-100/70">
                  {selectedTask.payload.promptText ||
                    selectedTask.payload.requestPrompt ||
                    '无 prompt'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  执行信息
                </p>
                <div className="mt-3 space-y-2 text-sm text-porcelain-100/70">
                  <p>任务 ID：{selectedTask.id}</p>
                  <p>根任务 ID：{selectedTask.rootTaskId}</p>
                  <p>尝试序号：第 {selectedTask.retryAttempt + 1} 次</p>
                  <p>上一跳任务：{selectedTask.parentTaskId ?? '—'}</p>
                  <p>批次：{selectedTask.batchId ?? '—'}</p>
                  <p>抽卡位次：{selectedTask.drawIndex ?? '—'}</p>
                  <p>变体标签：{selectedTask.variation ?? '—'}</p>
                  <p>模式：{selectedTask.payload.mode}</p>
                  <p>质量：{selectedTask.payload.quality}</p>
                  <p>流式：{selectedTask.payload.stream ? '是' : '否'}</p>
                  <p>当前可取消：{isTaskCancellable(selectedTask.status) ? '是' : '否'}</p>
                  <p>当前可重试：{selectedTask.retryable ? '是' : '否'}</p>
                  <p>创建时间：{formatAdminDateTime(selectedTask.createdAt)}</p>
                  <p>更新时间：{formatAdminDateTime(selectedTask.updatedAt)}</p>
                  {selectedTask.errorMessage ? (
                    <p className="text-signal-coral">错误：{selectedTask.errorMessage}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                    尝试时间线
                  </p>
                  <p className="mt-2 text-sm text-porcelain-100/60">
                    同一根任务下的完整重试链，按最新尝试在前展示。
                  </p>
                </div>
                <span className="status-pill">共 {selectedTaskAttempts.length} 次</span>
              </div>
              <div className="mt-4 space-y-3">
                {selectedTaskAttempts.map((attempt) => {
                  const isLatest = attempt.id === latestAttemptId
                  const isSelected = attempt.id === selectedTask.id
                  return (
                    <article
                      key={attempt.id}
                      className={`rounded-[1.25rem] border p-4 ${
                        isSelected
                          ? 'border-signal-cyan/30 bg-signal-cyan/[0.08]'
                          : 'border-porcelain-50/10 bg-ink-950/[0.5]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-porcelain-50">
                            第 {attempt.retryAttempt + 1} 次尝试
                          </p>
                          <p className="mt-1 text-xs text-porcelain-100/45">
                            任务 ID：{attempt.id}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {isLatest ? <span className="status-pill">最新尝试</span> : null}
                          {isSelected ? <span className="status-pill">当前查看</span> : null}
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] ${taskStatusTone(attempt.status)}`}
                          >
                            {adminTaskStatusLabels[attempt.status]}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-porcelain-100/70 sm:grid-cols-2">
                        <p>创建时间：{formatAdminDateTime(attempt.createdAt)}</p>
                        <p>更新时间：{formatAdminDateTime(attempt.updatedAt)}</p>
                        <p>
                          进度：
                          {typeof attempt.progress === 'number' ? `${attempt.progress}%` : '—'}
                        </p>
                        <p>上一跳任务：{attempt.parentTaskId ?? '—'}</p>
                        <p>快照：{attempt.payload.snapshotId ?? '—'}</p>
                        <p>结果作品：{attempt.result?.workId ?? '—'}</p>
                      </div>
                      {attempt.errorMessage ? (
                        <p className="mt-3 text-sm text-signal-coral">
                          错误：{attempt.errorMessage}
                        </p>
                      ) : null}
                    </article>
                  )
                })}
                {!selectedTaskAttempts.length ? (
                  <p className="text-sm text-porcelain-100/60">当前任务还没有历史尝试记录。</p>
                ) : null}
              </div>
            </div>

            {selectedTask.result?.imageUrl ? (
              <div className="rounded-[1.5rem] border border-porcelain-50/10 bg-ink-950/[0.42] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-porcelain-100/40">
                  结果预览
                </p>
                <img
                  src={selectedTask.result.imageUrl}
                  alt={selectedTask.result.title || selectedTask.payload.title}
                  className="mt-4 max-h-[420px] w-full rounded-[1.2rem] object-contain"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminDetailDrawer>
      {confirmDialog}
    </div>
  )
}
